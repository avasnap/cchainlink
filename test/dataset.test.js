// Dataset validation tests
const fs = require('fs');
const csv = require('csv-parser');
const { ethers } = require('ethers');

describe('Avalanche Chainlink Feeds Dataset', () => {
  let feeds = [];
  
  beforeAll(async () => {
    // Load CSV data
    return new Promise((resolve, reject) => {
      fs.createReadStream('./avalanche_chainlink_feeds.csv')
        .pipe(csv())
        .on('data', (row) => feeds.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
  });

  test('CSV file exists and is readable', () => {
    expect(fs.existsSync('./avalanche_chainlink_feeds.csv')).toBe(true);
    expect(feeds.length).toBeGreaterThan(0);
  });

  test('has expected minimum number of feeds', () => {
    expect(feeds.length).toBeGreaterThanOrEqual(73);
  });

  test('all feeds have required fields', () => {
    const requiredFields = [
      'name', 'contract_address', 'proxy_address', 
      'decimals', 'heartbeat', 'deviation_threshold'
    ];
    
    feeds.forEach((feed, index) => {
      requiredFields.forEach(field => {
        expect(feed[field]).toBeDefined();
        expect(feed[field]).not.toBe('');
      }, `Feed ${index}: ${feed.name}`);
    });
  });

  test('all proxy addresses are valid Ethereum addresses', () => {
    feeds.forEach(feed => {
      expect(ethers.isAddress(feed.proxy_address)).toBe(true);
      expect(feed.proxy_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  test('all contract addresses are valid Ethereum addresses', () => {
    feeds.forEach(feed => {
      expect(ethers.isAddress(feed.contract_address)).toBe(true);
      expect(feed.contract_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  test('proxy and contract addresses are different', () => {
    feeds.forEach(feed => {
      expect(feed.proxy_address.toLowerCase())
        .not.toBe(feed.contract_address.toLowerCase());
    });
  });

  test('no duplicate proxy addresses', () => {
    const proxyAddresses = feeds.map(f => f.proxy_address.toLowerCase());
    const uniqueAddresses = new Set(proxyAddresses);
    expect(uniqueAddresses.size).toBe(proxyAddresses.length);
  });

  test('decimals are valid numbers', () => {
    const validDecimals = [0, 6, 8, 18];
    feeds.forEach(feed => {
      const decimals = parseInt(feed.decimals);
      expect(validDecimals).toContain(decimals);
    });
  });

  test('heartbeat values are reasonable', () => {
    feeds.forEach(feed => {
      const heartbeat = parseInt(feed.heartbeat);
      expect(heartbeat).toBeGreaterThan(0);
      expect(heartbeat).toBeLessThanOrEqual(86400 * 7); // Max 1 week
    });
  });

  test('deviation thresholds are valid percentages', () => {
    feeds.forEach(feed => {
      const threshold = parseFloat(feed.deviation_threshold);
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(10); // Max 1000% (some feeds have high thresholds)
    });
  });

  test('contains expected major feeds', () => {
    const feedNames = feeds.map(f => f.name);
    const expectedFeeds = [
      'BTC / USD',
      'ETH / USD', 
      'AVAX / USD',
      'LINK / USD',
      'USDC / USD',
      'USDT / USD'
    ];
    
    expectedFeeds.forEach(expectedFeed => {
      expect(feedNames).toContain(expectedFeed);
    });
  });

  test('feed categories are properly distributed', () => {
    const assetClasses = feeds.map(f => f.asset_class);
    
    // Should have crypto, fiat, commodity, and proof of reserve feeds
    expect(assetClasses).toContain('Crypto');
    expect(assetClasses).toContain('Proof of Reserve');
    
    // Most feeds should be crypto
    const cryptoFeeds = assetClasses.filter(c => c === 'Crypto').length;
    expect(cryptoFeeds).toBeGreaterThan(50);
  });
});