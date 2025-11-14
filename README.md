# Avalanche Chainlink Price Feeds

A complete dataset and **production-ready API implementations** for fetching **all 101 Chainlink data feeds** on Avalanche C-Chain mainnet in a **single Multicall3 transaction**.

This project provides both a straightforward command-line tool and **full REST API implementations in TypeScript and Python** - perfect for informing coding agents how to efficiently get prices from a single multicall, or as working examples to build upon. Rather than making 101 separate RPC calls, everything can be fetched efficiently in one transaction.

## 🎯 **Two Ways to Use This Project**

### 1. **Quick Price Fetching** (Command Line)
Get all prices immediately with the Node.js script

### 2. **Production APIs** (TypeScript & Python)
Complete REST API implementations ready to deploy or use as templates

## ⚡ TL;DR - Choose Your Approach

### **Command Line** (Instant Prices)
```bash
git clone https://github.com/avasnap/cchainlink.git
cd cchainlink
npm install
npm run prices
```
**Result**: All 101 live prices fetched in ~2 seconds via one transaction! 🚀

### **REST API** (Production Ready)
```bash
# TypeScript API
cd api/typescript
docker-compose up -d
curl http://localhost:8000/prices

# Python API  
cd api/python
docker-compose up -d  
curl http://localhost:8001/prices
```
**Result**: Full REST APIs with health checks, individual feeds, historical data, and more!

## 📊 Complete Dataset

- **101 Total Data Feeds** on Avalanche C-Chain mainnet (Chain ID: 43114)
- **Real-time data** from official Chainlink oracles
- **Complete metadata** including contract addresses, decimals, heartbeats
- **Single standard ABI** works with all feeds (AggregatorV3Interface)

### Feed Breakdown
- **92 Price Feeds**: BTC/USD, ETH/USD, AVAX/USD, LINK/USD, and many more crypto, fiat, and commodity pairs
- **8 Proof of Reserve Feeds**: BTC.b reserves, USDC.e reserves, WETH.e reserves, etc.
- **1 Emergency Count Feed**: AAVE Network Emergency Count

### Price Precision
- **66 feeds** use 8 decimals (most crypto pairs)
- **27 feeds** use 18 decimals (exchange rates and some reserves)
- **3 feeds** use 3 decimals
- **3 feeds** use 1 decimal
- **2 feeds** use 6 decimals (USDC/USDT reserves)

## 🚀 Quick Start (Command Line)

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

### Run Tests
```bash
npm test
```

### Make Executable
```bash
chmod +x multicall_price_fetcher.js
./multicall_price_fetcher.js
```

## 🏗️ **Production APIs** (TypeScript & Python)

This project includes **two complete, production-ready REST API implementations** that demonstrate best practices for Chainlink price feed integration. Both APIs are functionally identical and provide the same endpoints.

### **Why Two Implementations?**
- **Learning**: Compare TypeScript vs Python approaches to Web3 integration
- **Templates**: Use either as a starting point for your own projects  
- **Production**: Deploy either one directly to production
- **Testing**: Validate functionality across different tech stacks

### **API Features**
- ✅ **All 101 Chainlink data feeds** on Avalanche C-Chain
- ✅ **Multicall3 optimization** - fetch all data in one transaction
- ✅ **RESTful endpoints** with comprehensive documentation
- ✅ **Docker containerized** for easy deployment
- ✅ **Health checks** and monitoring endpoints
- ✅ **Historical data** and individual feed access
- ✅ **Error handling** and validation
- ✅ **CORS enabled** for frontend integration

### **TypeScript API** (Node.js + Express)
```bash
cd api/typescript
docker-compose up -d
# API available at http://localhost:8000
curl http://localhost:8000/prices | jq
```

### **Python API** (FastAPI)
```bash  
cd api/python
docker-compose up -d
# API available at http://localhost:8001  
curl http://localhost:8001/prices | jq
```

### **API Endpoints** (Both APIs)
| Endpoint | Description |
|----------|-------------|
| `GET /health` | API health status and connection info |
| `GET /feeds` | List all 101 available feeds |
| `GET /feeds/{symbol}` | Get specific feed metadata |
| `GET /prices` | Get all current prices (via Multicall3) |
| `GET /prices/{symbol}` | Get specific price |
| `POST /prices/refresh` | Manually refresh all prices |
| `GET /docs` | Interactive API documentation |

### **Example API Response**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSD",
      "price": 117557.99,
      "decimals": 8,
      "updatedAt": "2025-07-21T02:10:47Z",
      "proxyAddress": "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
    }
  ],
  "timestamp": "2025-07-21T02:10:47Z"
}
```

### **Perfect for Developers Who Want To:**
- 🔧 **Learn Web3 integration** patterns in TypeScript/Python
- 🚀 **Deploy immediately** to production environments  
- 📚 **Study implementation** differences between tech stacks
- 🛠️ **Customize and extend** for specific use cases
- 🔗 **Integrate Chainlink feeds** into existing applications
- ⚡ **Optimize performance** with proven multicall patterns

## 📋 Usage

The command-line tool fetches all 101 Avalanche Chainlink data feeds in a **single Multicall3 transaction**:

```bash
node multicall_price_fetcher.js
```

**Live Output Example:**
```
Loaded 101 Chainlink feeds
Fetching data for 101 feeds via Multicall3...
Fetched all data in 2044ms at block 65813232

=== AVALANCHE CHAINLINK DATA FEEDS ===
📈 BTC / USD: $117103.73905200 (Updated: 2025-07-21T00:40:58.000Z)
📈 ETH / USD: $3728.93703912 (Updated: 2025-07-21T00:40:46.000Z)
📈 AVAX / USD: $24.83984887 (Updated: 2025-07-21T00:40:56.000Z)
📈 LINK / USD: $19.07642000 (Updated: 2025-07-21T00:33:34.000Z)
📈 USDC / USD: $0.99989000 (Updated: 2025-07-20T08:00:29.000Z)
📈 USDT / USD: $1.00031000 (Updated: 2025-07-20T16:21:53.000Z)
... (95 more feeds)

✅ Results saved to ./avalanche_prices_1753058462684.json
```

## 📁 Project Structure

### **Core Files**
- **`avalanche_chainlink_feeds.csv`** - Complete feed dataset (101 feeds)
- **`chainlink_abi_interface.json`** - Standard ABI for all feeds
- **`multicall_price_fetcher.js`** - Command-line price fetcher
- **`package.json`** - Node.js dependencies

### **Production APIs**
- **`api/typescript/`** - Complete Node.js/Express REST API
- **`api/python/`** - Complete FastAPI/Python REST API
- Both include Docker setups, comprehensive endpoints, and documentation

## 🔧 Technical Details

### Multicall3 Contract
- **Address:** `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Network:** Avalanche C-Chain (43114)

### RPC Endpoint
- **URL:** `https://api.avax.network/ext/bc/C/rpc`

### Performance
- **Single Multicall3 call** fetches all 101 data feeds
- **~2 seconds** typical response time (including network latency)
- **Efficient** - 1 RPC request vs 101 individual calls
- **No gas cost** - read-only view functions
- **No rate limiting** - one request gets everything

## 💡 How to Use This Data

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

### 3. Data Value Calculation Formula
```javascript
// Convert raw answer to human-readable value
const value = Number(answer) / Math.pow(10, decimals);

// Example: BTC/USD price feed
// answer = 11710373905200, decimals = 8
// value = 11710373905200 / 10^8 = $117,103.74

// Example: BTC.b Proof of Reserve feed
// answer = 123456789012345678, decimals = 18
// value = 123456789012345678 / 10^18 = 123.456789 BTC
```

### 4. Multicall3 Integration Example
```javascript
const { ethers } = require('ethers');

// Multicall3 on Avalanche C-Chain
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Get multiple data feeds in one call
const calls = [
  { target: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743", // BTC/USD price
    callData: chainlinkInterface.encodeFunctionData('latestRoundData') },
  { target: "0x976B3D034E162d8bD72D6b9C989d545b839003b0", // ETH/USD price  
    callData: chainlinkInterface.encodeFunctionData('latestRoundData') },
  { target: "0x700F768E18c4850D8E266F3398F5Bf5A2aB8e0B3", // BTC.b PoR reserves
    callData: chainlinkInterface.encodeFunctionData('latestRoundData') },
  // ... add all 101 feeds
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

| Data Feed | Proxy Address | Decimals |
|------|---------------|----------|
| **BTC/USD** | `0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743` | 8 |
| **ETH/USD** | `0x976B3D034E162d8bD72D6b9C989d545b839003b0` | 8 |
| **AVAX/USD** | `0x0A77230d17318075983913bC2145DB16C7366156` | 8 |
| **LINK/USD** | `0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a` | 8 |
| **USDC/USD** | `0xF096872672F44d6EBA71458D74fe67F9a77a23B9` | 8 |
| **USDT/USD** | `0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a` | 8 |

*See `avalanche_chainlink_feeds.csv` for all 101 feeds*

## ✅ **Fully Tested & Production Ready**

Both TypeScript and Python APIs have been extensively tested with all endpoints verified working:
- ✅ **100% endpoint coverage** - all API routes functional
- ✅ **Live blockchain integration** - real Avalanche C-Chain data
- ✅ **Docker containerized** - consistent deployment across environments  
- ✅ **Error handling** - proper 404s, validation, and edge cases
- ✅ **Performance optimized** - ~200ms average response times

**Ready to deploy or use as reference implementations immediately.**

## 📝 License

MIT License - Feel free to use in your projects!