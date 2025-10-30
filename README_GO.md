# Golang Multicall3 Crypto Price Fetcher

A high-performance Go application that fetches Avalanche Chainlink feed prices using Multicall3 and saves them to MongoDB.

## Features

- 🚀 **Fast**: Uses Multicall3 to fetch all feed prices in a single blockchain call
- 📊 **Comprehensive**: Fetches all 73+ Avalanche Chainlink price feeds
- 💾 **Persistent**: Saves data to MongoDB with block-number-based document IDs
- 🔄 **Upsert Logic**: Updates existing documents or creates new ones
- 📈 **Detailed Data**: Includes prices, timestamps, round IDs, and raw contract data

## Prerequisites

- Go 1.21 or higher
- MongoDB (local or remote)
- Internet connection to Avalanche C-Chain RPC

## Installation

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Ensure MongoDB is running:**
   ```bash
   # For local MongoDB
   mongod

   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

## Configuration

The application uses the following defaults:

- **RPC Endpoint**: `https://api.avax.network/ext/bc/C/rpc`
- **Multicall3 Address**: `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Chain ID**: `43114` (Avalanche C-Chain)
- **MongoDB URI**: `mongodb://localhost:27017` (can be overridden with `MONGODB_URI` env var)
- **Database**: `chainlink`
- **Collection**: `prices`

### Environment Variables

You can override the MongoDB URI by setting:

```bash
export MONGODB_URI="mongodb://username:password@host:port"
```

## Usage

**Run the application:**

```bash
go run main.go
```

**Build and run:**

```bash
go build -o multicall-prices
./multicall-prices
```

## MongoDB Document Structure

Documents are saved with the following structure:

```json
{
  "_id": "43114-12345678",
  "blockNumber": 12345678,
  "timestamp": "2024-01-01T12:00:00Z",
  "chainId": 43114,
  "totalFeeds": 73,
  "prices": [
    {
      "name": "BTC / USD",
      "proxy": "0xa9f3A8f87CC2156049C38e1aA2134A9a1B5A2fae",
      "price": 45123.456789,
      "decimals": 8,
      "roundId": "18446744073709562345",
      "updatedAt": "2024-01-01T11:59:00Z",
      "raw": {
        "answer": "4512345678900",
        "startedAt": "1704110340",
        "updatedAt": "1704110340",
        "answeredInRound": "18446744073709562345"
      }
    }
    // ... more price feeds
  ]
}
```

### Document ID Format

The `_id` field uses the format: `{chainId}-{blockNumber}`

Example: `43114-12345678` represents:
- Chain ID: `43114` (Avalanche C-Chain)
- Block Number: `12345678`

This ensures each document is uniquely identified by the chain and block it was fetched from.

## How It Works

1. **Load Feeds**: Reads feed data from `avalanche_chainlink_feeds.csv`
2. **Prepare Calls**: Encodes `latestRoundData()` calls for each feed
3. **Multicall**: Executes a single Multicall3 `aggregate()` call with all feed calls
4. **Decode Results**: Unpacks the returned data for each feed
5. **Format Data**: Converts raw contract data to human-readable prices
6. **Save to MongoDB**: Upserts the document with ID format `43114-{blockNumber}`

## Example Output

```
2024/01/01 12:00:00 Starting Avalanche Chainlink Multicall3 Price Fetcher
2024/01/01 12:00:00 Loaded 73 Chainlink feeds
2024/01/01 12:00:00 Fetching prices via Multicall3...
2024/01/01 12:00:01 Fetched all prices in 523ms
2024/01/01 12:00:01 Fetched prices at block 12345678

=== AVALANCHE CHAINLINK FEED PRICES ===
Block Number: 12345678
Document ID: 43114-12345678
Total Feeds: 73

Prices:
  BTC / USD: $45123.45678900 (Updated: 2024-01-01T11:59:00Z)
  ETH / USD: $2345.67890000 (Updated: 2024-01-01T11:59:00Z)
  AVAX / USD: $34.56789000 (Updated: 2024-01-01T11:59:00Z)
  ...

Saving to MongoDB...
2024/01/01 12:00:02 Inserted new document with _id: 43114-12345678

✅ Price fetch and save complete!
```

## Performance

- **Single RPC Call**: All 73+ feeds fetched in one blockchain call
- **Typical Fetch Time**: 500-1000ms depending on network conditions
- **MongoDB Write**: < 100ms for upsert operation

## Error Handling

- Skips feeds with decoding errors and logs warnings
- Continues processing even if individual feeds fail
- Provides detailed error messages for debugging

## MongoDB Queries

**Get the latest price snapshot:**
```javascript
db.prices.find().sort({ blockNumber: -1 }).limit(1)
```

**Get prices for a specific block:**
```javascript
db.prices.findOne({ _id: "43114-12345678" })
```

**Get historical prices:**
```javascript
db.prices.find({ blockNumber: { $gte: 12000000, $lte: 13000000 } })
```

## Dependencies

- `github.com/ethereum/go-ethereum` - Ethereum client library
- `go.mongodb.org/mongo-driver` - MongoDB driver for Go

## License

MIT
