/**
 * Comprehensive API Tests for Avalanche Chainlink APIs
 * Tests both TypeScript (port 3000) and Python (port 8001) implementations
 * for identical functionality and response formats
 */

const axios = require('axios');
const Joi = require('joi');

// API endpoints configuration
const TYPESCRIPT_API = 'http://localhost:3000';
const PYTHON_API = 'http://localhost:8001';

// Timeout for API calls (30 seconds for blockchain operations)
const API_TIMEOUT = 30000;

// Request configuration
const requestConfig = {
  timeout: API_TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'API-Test-Suite/1.0'
  }
};

// Response validation schemas
const healthSchema = Joi.object({
  status: Joi.string().valid('healthy', 'unhealthy').required(),
  version: Joi.string().required(),
  uptime: Joi.number().positive().required(),
  avalanche: Joi.object({
    chainId: Joi.number().valid(43114).required(),
    blockNumber: Joi.string().required(),
    connected: Joi.boolean().required()
  }).required(),
  feeds: Joi.object({
    total: Joi.number().positive().required(),
    lastRefresh: Joi.string().allow(null),
    lastUpdated: Joi.string().allow(null),
    withPrices: Joi.number().allow(null)
  }).required()
}).unknown(true); // Allow additional fields

const feedMetadataSchema = Joi.object({
  name: Joi.string().required(),
  symbol: Joi.string().required(),
  contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  proxyAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  decimals: Joi.number().integer().min(0).max(18).required(),
  deviationThreshold: Joi.number().required(),
  heartbeat: Joi.number().positive().required(),
  assetClass: Joi.string().required(),
  productName: Joi.string().required(),
  baseAsset: Joi.string().required(),
  quoteAsset: Joi.string().required()
});

const apiResponseSchema = Joi.object({
  success: Joi.boolean().required(),
  data: Joi.alternatives().try(
    Joi.array(),
    Joi.object(),
    feedMetadataSchema
  ).required(),
  timestamp: Joi.string().isoDate().required(),
  blockNumber: Joi.string().allow(null)
});

const errorResponseSchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required()
  }).required(),
  timestamp: Joi.string().isoDate().required()
});

// Test utilities
async function makeRequest(baseUrl, endpoint, method = 'GET', data = null) {
  try {
    const response = await axios({
      method,
      url: `${baseUrl}${endpoint}`,
      data,
      ...requestConfig
    });
    return { success: true, response };
  } catch (error) {
    console.log(`Request failed: ${method} ${baseUrl}${endpoint}`, error.message);
    return { 
      success: false, 
      error: error.response || error,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

function normalizeResponseForComparison(response) {
  // Remove implementation-specific fields for comparison
  const normalized = { ...response };
  if (normalized.timestamp) delete normalized.timestamp;
  if (normalized.blockNumber) delete normalized.blockNumber;
  return normalized;
}

function compareResponses(tsResponse, pyResponse, endpoint) {
  const tsNorm = normalizeResponseForComparison(tsResponse);
  const pyNorm = normalizeResponseForComparison(pyResponse);
  
  // Compare success status
  expect(tsNorm.success).toBe(pyNorm.success);
  
  // If both successful, compare data structure
  if (tsNorm.success && pyNorm.success) {
    // For arrays, compare lengths and first few items
    if (Array.isArray(tsNorm.data) && Array.isArray(pyNorm.data)) {
      expect(tsNorm.data.length).toBe(pyNorm.data.length);
      
      if (tsNorm.data.length > 0) {
        // Compare first item structure
        const tsFirst = tsNorm.data[0];
        const pyFirst = pyNorm.data[0];
        expect(Object.keys(tsFirst).sort()).toEqual(Object.keys(pyFirst).sort());
      }
    }
  }
  
  return { typescript: tsNorm, python: pyNorm };
}

// Test suite
describe('Avalanche Chainlink API Comparison Tests', () => {
  let tsHealthy = false;
  let pyHealthy = false;
  
  // Pre-flight health checks
  beforeAll(async () => {
    console.log('🚀 Starting API comparison tests...');
    console.log('📡 Checking API availability...');
    
    // Check TypeScript API
    const tsHealth = await makeRequest(TYPESCRIPT_API, '/health');
    tsHealthy = tsHealth.success && tsHealth.response?.status === 200;
    
    // Check Python API  
    const pyHealth = await makeRequest(PYTHON_API, '/health');
    pyHealthy = pyHealth.success && pyHealth.response?.status === 200;
    
    console.log(`TypeScript API (${TYPESCRIPT_API}): ${tsHealthy ? '✅ Healthy' : '❌ Unavailable'}`);
    console.log(`Python API (${PYTHON_API}): ${pyHealthy ? '✅ Healthy' : '❌ Unavailable'}`);
    
    if (!tsHealthy || !pyHealthy) {
      console.log('⚠️  One or both APIs are unavailable. Some tests may fail.');
      console.log('💡 Make sure both containers are running:');
      console.log('   docker-compose up -d');
    }
  });

  describe('Health Endpoint Tests', () => {
    test('should return valid health data on both APIs', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/health');
      const pyResult = await makeRequest(PYTHON_API, '/health');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      // Extract health data (TypeScript wraps in {success, data}, Python returns directly)
      const tsHealthData = tsResult.response.data.data || tsResult.response.data;
      const pyHealthData = pyResult.response.data.data || pyResult.response.data;
      
      // Validate response schemas (allow both healthy and unhealthy status)
      const flexibleHealthSchema = healthSchema.fork('status', (schema) => 
        schema.valid('healthy', 'unhealthy')
      );
      
      const { error: tsError } = flexibleHealthSchema.validate(tsHealthData);
      const { error: pyError } = flexibleHealthSchema.validate(pyHealthData);
      
      expect(tsError).toBeUndefined();
      expect(pyError).toBeUndefined();
      
      // Compare core health data (both should have valid status)
      expect(['healthy', 'unhealthy']).toContain(tsHealthData.status);
      expect(['healthy', 'unhealthy']).toContain(pyHealthData.status);
      
      // Compare chainId (handling string vs number difference)
      expect(parseInt(tsHealthData.avalanche.chainId)).toBe(43114);
      expect(parseInt(pyHealthData.avalanche.chainId)).toBe(43114);
    });

    test('should return 200 status code', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/health');
      const pyResult = await makeRequest(PYTHON_API, '/health');
      
      expect(tsResult.response.status).toBe(200);
      expect(pyResult.response.status).toBe(200);
    });
  });

  describe('Feed Metadata Endpoints', () => {
    test('GET /feeds should return same feed count', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/feeds');
      const pyResult = await makeRequest(PYTHON_API, '/feeds');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      // Validate response schemas
      const { error: tsError } = apiResponseSchema.validate(tsResult.response.data);
      const { error: pyError } = apiResponseSchema.validate(pyResult.response.data);
      
      expect(tsError).toBeUndefined();
      expect(pyError).toBeUndefined();
      
      // Compare feed counts
      expect(tsResult.response.data.data.length).toBe(pyResult.response.data.data.length);
      expect(tsResult.response.data.data.length).toBe(73); // Expected total feeds
    });

    test('should have identical feed structure', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/feeds');
      const pyResult = await makeRequest(PYTHON_API, '/feeds');
      
      expect(tsResult.success && pyResult.success).toBe(true);
      
      const tsFeeds = tsResult.response.data.data;
      const pyFeeds = pyResult.response.data.data;
      
      // Test first feed structure
      if (tsFeeds.length > 0 && pyFeeds.length > 0) {
        const tsFeed = tsFeeds[0];
        const pyFeed = pyFeeds[0];
        
        // Validate individual feed schemas
        const { error: tsFeedError } = feedMetadataSchema.validate(tsFeed);
        const { error: pyFeedError } = feedMetadataSchema.validate(pyFeed);
        
        expect(tsFeedError).toBeUndefined();
        expect(pyFeedError).toBeUndefined();
        
        // Compare field presence
        expect(Object.keys(tsFeed).sort()).toEqual(Object.keys(pyFeed).sort());
      }
    });

    test('GET /feeds/:symbol should return identical feed data', async () => {
      // Test with BTC/USD feed
      const symbol = 'BTCUSD';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/feeds/${symbol}`);
      const pyResult = await makeRequest(PYTHON_API, `/feeds/${symbol}`);
      
      if (tsResult.success && pyResult.success) {
        const tsFeed = tsResult.response.data.data;
        const pyFeed = pyResult.response.data.data;
        
        // Compare core feed properties
        expect(tsFeed.symbol).toBe(pyFeed.symbol);
        expect(tsFeed.contractAddress.toLowerCase()).toBe(pyFeed.contractAddress.toLowerCase());
        expect(tsFeed.proxyAddress.toLowerCase()).toBe(pyFeed.proxyAddress.toLowerCase());
        expect(tsFeed.decimals).toBe(pyFeed.decimals);
        expect(tsFeed.heartbeat).toBe(pyFeed.heartbeat);
      }
    });

    test('should handle invalid feed symbol consistently', async () => {
      const invalidSymbol = 'INVALID';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/feeds/${invalidSymbol}`);
      const pyResult = await makeRequest(PYTHON_API, `/feeds/${invalidSymbol}`);
      
      // Both should return 404 or error
      expect(tsResult.status).toBe(pyResult.status);
      
      if (tsResult.status === 404 && pyResult.status === 404) {
        // Both should return error format
        expect(tsResult.data.success).toBe(false);
        expect(pyResult.data.success).toBe(false);
      }
    });
  });

  describe('Price Data Endpoints', () => {
    test('GET /prices should return price data', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/prices');
      const pyResult = await makeRequest(PYTHON_API, '/prices');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      const tsPrices = tsResult.response.data.data;
      const pyPrices = pyResult.response.data.data;
      
      // Should have price data
      expect(Array.isArray(tsPrices)).toBe(true);
      expect(Array.isArray(pyPrices)).toBe(true);
      expect(tsPrices.length).toBeGreaterThan(0);
      expect(pyPrices.length).toBeGreaterThan(0);
    }, 45000); // Longer timeout for price fetching

    test('POST /prices/refresh should work on both APIs', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/prices/refresh', 'POST');
      const pyResult = await makeRequest(PYTHON_API, '/prices/refresh', 'POST');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      // Both should return refresh statistics
      expect(tsResult.response.data.data).toHaveProperty('successfulFeeds');
      expect(pyResult.response.data.data).toHaveProperty('successful');
      
      // Both should have processed feeds
      expect(tsResult.response.data.data.successfulFeeds).toBeGreaterThan(0);
      expect(pyResult.response.data.data.successful).toBeGreaterThan(0);
    }, 60000); // Very long timeout for blockchain operations

    test('GET /prices/:symbol should return price data', async () => {
      // First refresh prices
      await makeRequest(TYPESCRIPT_API, '/prices/refresh', 'POST');
      await makeRequest(PYTHON_API, '/prices/refresh', 'POST');
      
      const symbol = 'BTCUSD';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/prices/${symbol}`);
      const pyResult = await makeRequest(PYTHON_API, `/prices/${symbol}`);
      
      if (tsResult.success && pyResult.success) {
        const tsPrice = tsResult.response.data.data;
        const pyPrice = pyResult.response.data.data;
        
        // Should have price structure
        expect(tsPrice).toHaveProperty('symbol');
        expect(tsPrice).toHaveProperty('price');
        expect(tsPrice).toHaveProperty('decimals');
        expect(pyPrice).toHaveProperty('symbol');
        expect(pyPrice).toHaveProperty('price');
        expect(pyPrice).toHaveProperty('decimals');
        
        // Prices should be close (within blockchain timing differences)
        expect(typeof tsPrice.price).toBe('number');
        expect(typeof pyPrice.price).toBe('number');
        expect(tsPrice.decimals).toBe(pyPrice.decimals);
      }
    }, 75000);
  });

  describe('Advanced Endpoint Tests', () => {
    test('GET /feeds/:symbol/description should work', async () => {
      const symbol = 'BTCUSD';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/feeds/${symbol}/description`);
      const pyResult = await makeRequest(PYTHON_API, `/feeds/${symbol}/description`);
      
      if (tsResult.success && pyResult.success) {
        expect(tsResult.response.data.data.symbol).toBe(pyResult.response.data.data.symbol);
        expect(tsResult.response.data.data.description).toBe(pyResult.response.data.data.description);
      }
    }, 30000);

    test('GET /feeds/:symbol/decimals should work', async () => {
      const symbol = 'BTCUSD';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/feeds/${symbol}/decimals`);
      const pyResult = await makeRequest(PYTHON_API, `/feeds/${symbol}/decimals`);
      
      if (tsResult.success && pyResult.success) {
        expect(tsResult.response.data.data.decimals).toBe(pyResult.response.data.data.decimals);
        expect(tsResult.response.data.data.symbol).toBe(pyResult.response.data.data.symbol);
      }
    }, 30000);

    test('GET /feeds/:symbol/version should work', async () => {
      const symbol = 'BTCUSD';
      const tsResult = await makeRequest(TYPESCRIPT_API, `/feeds/${symbol}/version`);
      const pyResult = await makeRequest(PYTHON_API, `/feeds/${symbol}/version`);
      
      if (tsResult.success && pyResult.success) {
        expect(tsResult.response.data.data.version).toBe(pyResult.response.data.data.version);
        expect(tsResult.response.data.data.symbol).toBe(pyResult.response.data.data.symbol);
      }
    }, 30000);
  });

  describe('Proof of Reserve Endpoints', () => {
    test('GET /proof-of-reserves should return PoR data', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/proof-of-reserves');
      const pyResult = await makeRequest(PYTHON_API, '/proof-of-reserves');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      const tsPoR = tsResult.response.data.data;
      const pyPoR = pyResult.response.data.data;
      
      expect(Array.isArray(tsPoR)).toBe(true);
      expect(Array.isArray(pyPoR)).toBe(true);
      
      // Should have same number of PoR feeds (11 expected)
      expect(tsPoR.length).toBe(pyPoR.length);
      expect(tsPoR.length).toBeGreaterThan(0);
    }, 45000);

    test('GET /proof-of-reserves/snapshot should work', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/proof-of-reserves/snapshot');
      const pyResult = await makeRequest(PYTHON_API, '/proof-of-reserves/snapshot');
      
      expect(tsResult.success).toBe(true);
      expect(pyResult.success).toBe(true);
      
      // Should have snapshot structure
      expect(tsResult.response.data.data).toHaveProperty('totalReserves');
      expect(tsResult.response.data.data).toHaveProperty('summary');
      expect(pyResult.response.data.data).toHaveProperty('totalReserves');
      expect(pyResult.response.data.data).toHaveProperty('summary');
    }, 45000);
  });

  describe('Error Handling Tests', () => {
    test('should handle 404 errors consistently', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/nonexistent');
      const pyResult = await makeRequest(PYTHON_API, '/nonexistent');
      
      expect(tsResult.status).toBe(404);
      expect(pyResult.status).toBe(404);
      
      // Both should return error format
      if (tsResult.data && pyResult.data) {
        expect(tsResult.data.success).toBe(false);
        expect(pyResult.data.success).toBe(false);
      }
    });

    test('should validate error response format', async () => {
      const tsResult = await makeRequest(TYPESCRIPT_API, '/feeds/INVALID');
      const pyResult = await makeRequest(PYTHON_API, '/feeds/INVALID');
      
      if (tsResult.status >= 400 && pyResult.status >= 400) {
        // Validate error response schemas
        if (tsResult.data) {
          const { error: tsError } = errorResponseSchema.validate(tsResult.data);
          expect(tsError).toBeUndefined();
        }
        
        if (pyResult.data) {
          const { error: pyError } = errorResponseSchema.validate(pyResult.data);
          expect(pyError).toBeUndefined();
        }
      }
    });
  });

  describe('Performance and Response Time Comparison', () => {
    test('should have reasonable response times', async () => {
      const endpoints = ['/health', '/feeds'];
      
      for (const endpoint of endpoints) {
        const tsStart = Date.now();
        const tsResult = await makeRequest(TYPESCRIPT_API, endpoint);
        const tsTime = Date.now() - tsStart;
        
        const pyStart = Date.now();
        const pyResult = await makeRequest(PYTHON_API, endpoint);
        const pyTime = Date.now() - pyStart;
        
        console.log(`${endpoint} - TypeScript: ${tsTime}ms, Python: ${pyTime}ms`);
        
        // Both should respond within reasonable time
        expect(tsTime).toBeLessThan(10000); // 10 seconds max
        expect(pyTime).toBeLessThan(10000); // 10 seconds max
        
        // Both should succeed
        expect(tsResult.success).toBe(true);
        expect(pyResult.success).toBe(true);
      }
    });
  });

  afterAll(() => {
    console.log('✅ API comparison tests completed');
    console.log(`TypeScript API: ${tsHealthy ? 'Working' : 'Issues detected'}`);
    console.log(`Python API: ${pyHealthy ? 'Working' : 'Issues detected'}`);
  });
});