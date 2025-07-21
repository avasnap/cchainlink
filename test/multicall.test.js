// Multicall integration tests
const { ethers } = require('ethers');
const { getAllPrices, loadFeedData } = require('../multicall_price_fetcher');

describe('Multicall3 Price Fetching', () => {
  let provider;
  
  beforeAll(() => {
    provider = new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
  });

  test('Avalanche RPC endpoint is accessible', async () => {
    const network = await provider.getNetwork();
    expect(network.chainId).toBe(43114n); // Avalanche C-Chain
  }, 10000);

  test('Multicall3 contract exists on Avalanche', async () => {
    const multicallAddress = '0xcA11bde05977b3631167028862bE2a173976CA11';
    const code = await provider.getCode(multicallAddress);
    expect(code).not.toBe('0x');
  }, 10000);

  test('loads feed data correctly', async () => {
    const feeds = await loadFeedData();
    expect(feeds).toBeDefined();
    expect(feeds.length).toBeGreaterThan(70);
    
    // Check feed structure
    feeds.forEach(feed => {
      expect(feed.name).toBeDefined();
      expect(feed.proxyAddress).toBeDefined();
      expect(feed.decimals).toBeDefined();
      expect(ethers.isAddress(feed.proxyAddress)).toBe(true);
    });
  });

  test('individual feed responds correctly', async () => {
    const btcUsdFeed = '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743';
    const chainlinkAbi = [
      {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
          {"internalType": "uint80", "name": "roundId", "type": "uint80"},
          {"internalType": "int256", "name": "answer", "type": "int256"},
          {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
          {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
          {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    const feed = new ethers.Contract(btcUsdFeed, chainlinkAbi, provider);
    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await feed.latestRoundData();
    
    expect(roundId).toBeGreaterThan(0);
    expect(answer).toBeGreaterThan(0);
    expect(updatedAt).toBeGreaterThan(0);
    expect(updatedAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  }, 15000);

  test('multicall fetches all prices successfully', async () => {
    const results = await getAllPrices();
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(70);
    
    // Check that most feeds returned valid prices
    const successfulFeeds = results.filter(r => !r.error && r.price > 0);
    const errorFeeds = results.filter(r => r.error);
    
    expect(successfulFeeds.length).toBeGreaterThan(65); // At least 90% success rate
    
    if (errorFeeds.length > 0) {
      console.log(`${errorFeeds.length} feeds had errors:`, 
        errorFeeds.map(f => f.name));
    }
    
    // Check BTC/USD specifically (should always work)
    const btcFeed = results.find(r => r.name === 'BTC / USD');
    expect(btcFeed).toBeDefined();
    expect(btcFeed.error).toBeUndefined();
    expect(btcFeed.price).toBeGreaterThan(10000); // BTC > $10k
    expect(btcFeed.price).toBeLessThan(1000000); // BTC < $1M
  }, 30000);

  test('price calculations are reasonable', async () => {
    const results = await getAllPrices();
    
    // Test major stablecoins are close to $1
    const stablecoins = ['USDC / USD', 'USDT / USD', 'DAI / USD'];
    stablecoins.forEach(name => {
      const feed = results.find(r => r.name === name);
      if (feed && !feed.error) {
        expect(feed.price).toBeGreaterThan(0.95);
        expect(feed.price).toBeLessThan(1.05);
      }
    });
    
    // Test that AVAX price is reasonable
    const avaxFeed = results.find(r => r.name === 'AVAX / USD');
    if (avaxFeed && !avaxFeed.error) {
      expect(avaxFeed.price).toBeGreaterThan(1); // > $1
      expect(avaxFeed.price).toBeLessThan(1000); // < $1000
    }
  }, 30000);

  test('feed updates are recent', async () => {
    const results = await getAllPrices();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Most feeds should be updated within last 24 hours
    const recentFeeds = results.filter(r => {
      if (r.error) return false;
      const updateTime = new Date(r.updatedAt).getTime();
      return updateTime > oneDayAgo;
    });
    
    expect(recentFeeds.length).toBeGreaterThan(60); // 80%+ recent
  }, 30000);
});