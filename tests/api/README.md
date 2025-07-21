# Avalanche Chainlink API Tests

Comprehensive test suite that validates both TypeScript and Python implementations provide identical functionality and response formats.

## Overview

This test suite ensures that both API implementations:
- Return identical data structures
- Handle errors consistently
- Provide same functionality across all endpoints
- Meet performance requirements
- Follow OpenAPI specifications

## Test Coverage

### Core Functionality Tests
- ✅ **Health Endpoint**: Status, uptime, network connectivity
- ✅ **Feed Metadata**: All 73 Avalanche feeds data consistency
- ✅ **Price Data**: Real-time price fetching and formatting
- ✅ **Error Handling**: Consistent error responses and status codes
- ✅ **Advanced Functions**: Descriptions, decimals, versions
- ✅ **Proof of Reserves**: PoR data fetching and validation

### Validation Tests
- ✅ **Schema Validation**: Response format compliance using Joi
- ✅ **Data Integrity**: Address formats, decimals, heartbeats
- ✅ **Type Safety**: Proper data types across implementations
- ✅ **Performance**: Response time comparisons

## Test Architecture

```
tests/api/
├── api-comparison.test.js    # Main test suite
├── package.json             # Test dependencies
├── run-tests.sh            # Test runner script
└── README.md               # This file
```

## Quick Start

### Option 1: Automated Test Runner (Recommended)
```bash
# Navigate to project root
cd /ssd/aidev/cchainlink

# Run complete test suite
./tests/api/run-tests.sh
```

### Option 2: Manual Execution
```bash
# 1. Start both APIs
docker-compose up -d

# 2. Wait for APIs to be ready
sleep 15

# 3. Navigate to test directory
cd tests/api/

# 4. Install dependencies
npm install

# 5. Run tests
npm test
```

## Test Scenarios

### 1. Health Checks
```javascript
// Validates both APIs return healthy status
GET /health → { status: "healthy", avalanche: { chainId: 43114 } }
```

### 2. Feed Metadata Consistency
```javascript
// Ensures both APIs return identical feed data
GET /feeds → Array[73] identical feed objects
GET /feeds/BTCUSD → Same BTC/USD feed data
```

### 3. Price Data Validation
```javascript
// Tests real-time price fetching
POST /prices/refresh → Successful multicall execution
GET /prices → Array of current prices
GET /prices/BTCUSD → BTC price data
```

### 4. Advanced Functionality
```javascript
// Tests Chainlink ABI functions
GET /feeds/BTCUSD/description → Feed description
GET /feeds/BTCUSD/decimals → Decimal places
GET /feeds/BTCUSD/version → Contract version
```

### 5. Proof of Reserves
```javascript
// Tests PoR functionality
GET /proof-of-reserves → Array[11] PoR feeds
GET /proof-of-reserves/snapshot → Complete PoR snapshot
```

### 6. Error Handling
```javascript
// Tests consistent error responses
GET /feeds/INVALID → 404 with error format
GET /nonexistent → 404 with error format
```

## Test Configuration

### Timeouts
- **Standard API calls**: 30 seconds
- **Price refresh operations**: 60 seconds
- **Complex blockchain operations**: 75 seconds

### API Endpoints
- **TypeScript API**: `http://localhost:3000`
- **Python API**: `http://localhost:8001`

### Validation Schemas
The test suite uses Joi schemas to validate:
- Health response format
- Feed metadata structure
- API response wrapper format
- Error response format

## Expected Results

### Success Criteria
- ✅ All 73 feeds returned by both APIs
- ✅ Identical response structures
- ✅ Consistent error handling
- ✅ Response times under 10 seconds
- ✅ Valid Ethereum addresses
- ✅ Proper decimal ranges (0-18)

### Sample Output
```
🚀 Starting API comparison tests...
📡 Checking API availability...
TypeScript API (http://localhost:3000): ✅ Healthy
Python API (http://localhost:8001): ✅ Healthy

✅ Health Endpoint Tests
  ✓ should have healthy status on both APIs
  ✓ should return 200 status code

✅ Feed Metadata Endpoints  
  ✓ GET /feeds should return same feed count (73 feeds)
  ✓ should have identical feed structure
  ✓ GET /feeds/:symbol should return identical feed data

✅ Price Data Endpoints
  ✓ GET /prices should return price data
  ✓ POST /prices/refresh should work on both APIs
  ✓ GET /prices/:symbol should return price data

✅ All tests passed! Both APIs are identical
```

## Troubleshooting

### APIs Not Responding
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs typescript-api
docker-compose logs python-api

# Restart containers
docker-compose restart
```

### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- --testNamePattern="Health Endpoint"

# Check API endpoints manually
curl http://localhost:3000/health
curl http://localhost:8001/health
```

### Performance Issues
```bash
# Run with extended timeout
npm test -- --testTimeout=120000

# Check network connectivity
ping localhost
```

## Integration with CI/CD

This test suite can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run API Tests
  run: |
    docker-compose up -d
    sleep 30
    cd tests/api && npm install && npm test
    docker-compose down
```

## Manual Testing

After running the automated tests, you can manually verify the APIs:

- **TypeScript API**: http://localhost:3000/docs
- **Python API**: http://localhost:8001/docs
- **Health Checks**: 
  - http://localhost:3000/health
  - http://localhost:8001/health
- **Feed Data**:
  - http://localhost:3000/feeds
  - http://localhost:8001/feeds

## Contributing

To add new tests:

1. Add test cases to `api-comparison.test.js`
2. Update validation schemas if needed
3. Run the test suite to verify
4. Update this README with new test coverage

## Dependencies

- **Node.js** (v16+)
- **npm** 
- **Docker & Docker Compose**
- **Jest** (testing framework)
- **Axios** (HTTP client)
- **Joi** (schema validation)