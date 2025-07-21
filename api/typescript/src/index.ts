import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import cron from 'node-cron';

import { feedsRouter } from './routes/feeds';
import { pricesRouter } from './routes/prices';
import { healthRouter } from './routes/health';
import { PriceService } from './services/PriceService';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Swagger/OpenAPI configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Avalanche Chainlink Price Feeds API',
      version: '1.0.0',
      description: `
        A REST API providing access to all 73 Chainlink price feeds on Avalanche C-Chain mainnet.
        
        This API provides real-time price data and feed metadata for DeFi applications.
        All prices are fetched efficiently via Multicall3 in a single blockchain transaction.
        
        **Key Features:**
        - 73 Chainlink feeds (Price feeds, Proof of Reserve, Emergency Count)
        - Real-time price data with timestamps
        - Comprehensive feed metadata
        - Efficient Multicall3 aggregation
        - OpenAPI documentation
        
        **Data Sources:**
        - Avalanche C-Chain Mainnet (Chain ID: 43114)
        - Official Chainlink price feed contracts
        - Multicall3 contract: 0xcA11bde05977b3631167028862bE2a173976CA11
      `,
      contact: {
        name: 'Avasnap',
        url: 'https://github.com/avasnap/cchainlink'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'API health and status endpoints'
      },
      {
        name: 'Feeds',
        description: 'Chainlink feed metadata and information'
      },
      {
        name: 'Prices',
        description: 'Real-time price data from Chainlink feeds'
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Avalanche Chainlink API Docs'
}));

// API spec endpoint
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Initialize price service
const priceService = new PriceService();

// Add price service to request context
app.use((req, res, next) => {
  (req as any).priceService = priceService;
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/feeds', feedsRouter);
app.use('/prices', pricesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Avalanche Chainlink Price Feeds API',
    version: '1.0.0',
    description: 'REST API for all 73 Chainlink price feeds on Avalanche C-Chain',
    documentation: '/docs',
    openapi: '/openapi.json',
    endpoints: {
      health: '/health',
      feeds: '/feeds',
      prices: '/prices'
    },
    github: 'https://github.com/avasnap/cchainlink'
  });
});

// Error handling middleware (must be last)
app.use('*', notFoundHandler);
app.use(errorHandler);

// Schedule price updates every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('🔄 Scheduled price refresh starting...');
    await priceService.refreshPrices();
    console.log('✅ Scheduled price refresh completed');
  } catch (error) {
    console.error('❌ Scheduled price refresh failed:', error);
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Avalanche Chainlink API server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
  console.log(`🔗 OpenAPI Spec: http://localhost:${PORT}/openapi.json`);
  
  // Initial price fetch
  priceService.refreshPrices().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;