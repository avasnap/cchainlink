# Avalanche Chainlink Price Feeds

A complete dataset and command-line tool for fetching **all 73 Chainlink price feeds** on Avalanche C-Chain mainnet in a **single Multicall3 transaction**.

This project provides a straightforward way to inform coding agents how to get prices from a single multicall for a large number of tokens critical to DeFi in the Avalanche ecosystem. Rather than making 73 separate RPC calls, everything can be fetched efficiently in one transaction.

## ⚡ TL;DR - Get All Prices Now

```bash
git clone https://github.com/avasnap/cchainlink.git
cd cchainlink
npm install
npm run prices
```

**Result**: All 73 live prices fetched in ~2 seconds via one transaction! 🚀

## 📊 Complete Dataset

- **73 Total Feeds** on Avalanche C-Chain mainnet (Chain ID: 43114)
- **Real-time prices** from official Chainlink oracles
- **Complete metadata** including contract addresses, decimals, heartbeats
- **Single standard ABI** works with all feeds (AggregatorV3Interface)

### Feed Breakdown
- **61 Price Feeds**: BTC/USD ($117k), ETH/USD ($3.7k), AVAX/USD ($24.8), LINK/USD, etc.
- **11 Proof of Reserve Feeds**: BTC.b reserves, USDC.e reserves, WETH.e reserves, etc.
- **1 Emergency Count Feed**: AAVE Network Emergency Count

### Price Precision
- **57 feeds** use 8 decimals (most crypto pairs)
- **13 feeds** use 18 decimals (some tokens & reserves)
- **2 feeds** use 6 decimals (USDC/USDT reserves)
- **1 feed** uses 0 decimals (emergency count)

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Fetch All Prices
```bash
npm run prices
```

### Check for New Feeds
```bash
npm run refresh
```

### Make Executable
```bash
chmod +x multicall_price_fetcher.js
./multicall_price_fetcher.js
```

## 📋 Usage

The command-line tool fetches all 73 Avalanche Chainlink feed prices in a **single Multicall3 transaction**:

```bash
node multicall_price_fetcher.js
```

**Live Output Example:**
```
Loaded 73 Chainlink feeds
Fetching prices for 73 feeds via Multicall3...
Fetched all prices in 2044ms at block 65813232

=== AVALANCHE CHAINLINK FEED PRICES ===
📈 BTC / USD: $117103.73905200 (Updated: 2025-07-21T00:40:58.000Z)
📈 ETH / USD: $3728.93703912 (Updated: 2025-07-21T00:40:46.000Z)
📈 AVAX / USD: $24.83984887 (Updated: 2025-07-21T00:40:56.000Z)
📈 LINK / USD: $19.07642000 (Updated: 2025-07-21T00:33:34.000Z)
📈 USDC / USD: $0.99989000 (Updated: 2025-07-20T08:00:29.000Z)
📈 USDT / USD: $1.00031000 (Updated: 2025-07-20T16:21:53.000Z)
... (67 more feeds)

✅ Results saved to ./avalanche_prices_1753058462684.json
```

## 📁 Files

- **`avalanche_chainlink_feeds.csv`** - Complete feed dataset
- **`chainlink_abi_interface.json`** - Standard ABI for all feeds
- **`multicall_price_fetcher.js`** - Command-line price fetcher
- **`package.json`** - Node.js dependencies

## 🔧 Technical Details

### Multicall3 Contract
- **Address:** `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Network:** Avalanche C-Chain (43114)

### RPC Endpoint
- **URL:** `https://api.avax.network/ext/bc/C/rpc`

### Performance
- **Single Multicall3 transaction** fetches all 73 prices
- **~2 seconds** typical response time (including network latency)
- **Gas efficient** - 1 transaction vs 73 individual calls
- **No rate limiting** - one request gets everything

## 💡 How to Use These Prices

### 1. Use the Proxy Addresses (CRITICAL!)
Always use `proxy_address` from CSV, **never** `contract_address`:

```javascript
// ✅ CORRECT - Use proxy address
const BTC_USD_FEED = "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"; 

// ❌ WRONG - Don't use contract_address
const WRONG = "0xa9Afa74dDAC812B86Eeaa60A035c6592470F4A48";
```

### 2. Standard ABI Works for All Feeds
Every feed uses identical `AggregatorV3Interface`:

```solidity
interface AggregatorV3Interface {
  function latestRoundData() external view returns (
    uint80 roundId,
    int256 answer,      // Raw price value
    uint256 startedAt, 
    uint256 updatedAt,  // Last update timestamp
    uint80 answeredInRound
  );
  function decimals() external view returns (uint8); // 8, 18, 6, or 0
}
```

### 3. Price Calculation Formula
```javascript
// Convert raw answer to human-readable price
const price = Number(answer) / Math.pow(10, decimals);

// Example: BTC/USD 
// answer = 11710373905200, decimals = 8
// price = 11710373905200 / 10^8 = $117,103.74
```

### 4. Multicall3 Integration Example
```javascript
const { ethers } = require('ethers');

// Multicall3 on Avalanche C-Chain
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Get multiple prices in one call
const calls = [
  { target: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743", // BTC/USD
    callData: chainlinkInterface.encodeFunctionData('latestRoundData') },
  { target: "0x976B3D034E162d8bD72D6b9C989d545b839003b0", // ETH/USD  
    callData: chainlinkInterface.encodeFunctionData('latestRoundData') },
  // ... add all 73 feeds
];

const [blockNumber, results] = await multicall.aggregate.staticCall(calls);
```

## 🔑 Key Addresses

| Contract | Address | Network |
|----------|---------|---------|
| **Multicall3** | `0xcA11bde05977b3631167028862bE2a173976CA11` | Avalanche C-Chain |
| **RPC Endpoint** | `https://api.avax.network/ext/bc/C/rpc` | Avalanche Mainnet |
| **Chain ID** | `43114` | Avalanche C-Chain |

## 📋 Popular Feed Addresses

| Feed | Proxy Address | Decimals |
|------|---------------|----------|
| **BTC/USD** | `0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743` | 8 |
| **ETH/USD** | `0x976B3D034E162d8bD72D6b9C989d545b839003b0` | 8 |
| **AVAX/USD** | `0x0A77230d17318075983913bC2145DB16C7366156` | 8 |
| **LINK/USD** | `0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a` | 8 |
| **USDC/USD** | `0xF096872672F44d6EBA71458D74fe67F9a77a23B9` | 8 |
| **USDT/USD** | `0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a` | 8 |

*See `avalanche_chainlink_feeds.csv` for all 73 feeds*

## 📝 License

MIT License - Feel free to use in your projects!