#!/usr/bin/env node

// Multicall3 Price Fetcher for All Avalanche Chainlink Feeds
// Fetches all 73 feed prices in a single transaction

const { ethers } = require('ethers');
const fs = require('fs');
const csv = require('csv-parser');

// Contract addresses
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const AVALANCHE_RPC = 'https://api.avax.network/ext/bc/C/rpc';

// ABI definitions
const MULTICALL3_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "target", "type": "address" },
          { "internalType": "bytes", "name": "callData", "type": "bytes" }
        ],
        "internalType": "struct Multicall3.Call[]",
        "name": "calls",
        "type": "tuple[]"
      }
    ],
    "name": "aggregate",
    "outputs": [
      { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
      { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "target", "type": "address" },
          { "internalType": "bytes", "name": "callData", "type": "bytes" }
        ],
        "internalType": "struct Multicall3.Call[]",
        "name": "calls",
        "type": "tuple[]"
      }
    ],
    "name": "aggregate.staticcall",
    "outputs": [
      { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
      { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const CHAINLINK_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      { "internalType": "uint80", "name": "roundId", "type": "uint80" },
      { "internalType": "int256", "name": "answer", "type": "int256" },
      { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
      { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function loadFeedData() {
  const feeds = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream('./avalanche_chainlink_feeds.csv')
      .pipe(csv())
      .on('data', (row) => {
        feeds.push({
          name: row.name,
          proxyAddress: row.proxy_address,
          decimals: parseInt(row.decimals)
        });
      })
      .on('end', () => {
        console.log(`Loaded ${feeds.length} Chainlink feeds`);
        resolve(feeds);
      })
      .on('error', reject);
  });
}

async function getAllPrices() {
  try {
    // Setup provider and contracts
    const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC);
    const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);
    const chainlinkInterface = new ethers.Interface(CHAINLINK_ABI);
    
    // Load feed data
    const feeds = await loadFeedData();
    
    // Prepare multicall data for latestRoundData()
    const calls = feeds.map(feed => ({
      target: feed.proxyAddress,
      callData: chainlinkInterface.encodeFunctionData('latestRoundData', [])
    }));
    
    console.log(`Fetching prices for ${calls.length} feeds via Multicall3...`);
    const startTime = Date.now();
    
    // Execute multicall as static call (read-only)
    const [blockNumber, returnData] = await multicall.aggregate.staticCall(calls);
    
    const endTime = Date.now();
    console.log(`Fetched all prices in ${endTime - startTime}ms at block ${blockNumber}`);
    
    // Decode results
    const results = returnData.map((data, index) => {
      try {
        const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
          chainlinkInterface.decodeFunctionResult('latestRoundData', data);
        
        const feed = feeds[index];
        const price = Number(answer) / Math.pow(10, feed.decimals);
        
        return {
          name: feed.name,
          proxy: feed.proxyAddress,
          price: price,
          decimals: feed.decimals,
          roundId: roundId.toString(),
          updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
          raw: {
            answer: answer.toString(),
            startedAt: startedAt.toString(),
            updatedAt: updatedAt.toString(),
            answeredInRound: answeredInRound.toString()
          }
        };
      } catch (error) {
        return {
          name: feeds[index].name,
          proxy: feeds[index].proxyAddress,
          error: error.message
        };
      }
    });
    
    // Display results
    console.log('\n=== AVALANCHE CHAINLINK FEED PRICES ===');
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.name}: ERROR - ${result.error}`);
      } else {
        console.log(`📈 ${result.name}: $${result.price.toFixed(8)} (Updated: ${result.updatedAt})`);
      }
    });
    
    // Save to JSON
    const outputFile = `./avalanche_prices_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify({
      blockNumber: blockNumber.toString(),
      timestamp: new Date().toISOString(),
      totalFeeds: results.length,
      prices: results
    }, null, 2));
    
    console.log(`\n✅ Results saved to ${outputFile}`);
    
    return results;
    
  } catch (error) {
    console.error('Error fetching prices:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  getAllPrices()
    .then(() => console.log('✅ Price fetch complete'))
    .catch(err => {
      console.error('❌ Price fetch failed:', err);
      process.exit(1);
    });
}

module.exports = { getAllPrices, loadFeedData };