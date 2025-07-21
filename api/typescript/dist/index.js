"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const node_cron_1 = __importDefault(require("node-cron"));
const feeds_1 = require("./routes/feeds");
const prices_1 = require("./routes/prices");
const health_1 = require("./routes/health");
const PriceService_1 = require("./services/PriceService");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
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
    apis: ['./src/routes/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Avalanche Chainlink API Docs'
}));
app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
const priceService = new PriceService_1.PriceService();
app.use((req, res, next) => {
    req.priceService = priceService;
    next();
});
app.use('/health', health_1.healthRouter);
app.use('/feeds', feeds_1.feedsRouter);
app.use('/prices', prices_1.pricesRouter);
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
app.use('*', errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
node_cron_1.default.schedule('*/5 * * * *', async () => {
    try {
        console.log('🔄 Scheduled price refresh starting...');
        await priceService.refreshPrices();
        console.log('✅ Scheduled price refresh completed');
    }
    catch (error) {
        console.error('❌ Scheduled price refresh failed:', error);
    }
});
const server = app.listen(PORT, () => {
    console.log(`🚀 Avalanche Chainlink API server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`🔗 OpenAPI Spec: http://localhost:${PORT}/openapi.json`);
    priceService.refreshPrices().catch(console.error);
});
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
exports.default = app;
//# sourceMappingURL=index.js.map