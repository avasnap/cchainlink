"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', async (req, res) => {
    try {
        const priceService = req.priceService;
        const networkInfo = await priceService.getNetworkInfo();
        const feeds = priceService.getFeeds();
        const lastUpdate = priceService.getLastUpdate();
        const isHealthy = priceService.isHealthy();
        const healthData = {
            status: isHealthy && networkInfo.connected ? 'healthy' : 'unhealthy',
            version: '1.0.0',
            uptime: process.uptime(),
            avalanche: networkInfo,
            feeds: {
                total: feeds.length,
                lastUpdated: lastUpdate.toISOString()
            }
        };
        const response = {
            success: true,
            data: healthData,
            timestamp: new Date().toISOString()
        };
        res.json(response);
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'HEALTH_CHECK_FAILED',
                message: 'Health check failed'
            },
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=health.js.map