"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricesRouter = void 0;
const express_1 = require("express");
exports.pricesRouter = (0, express_1.Router)();
exports.pricesRouter.get('/', async (req, res) => {
    try {
        const priceService = req.priceService;
        const prices = priceService.getPrices();
        const networkInfo = await priceService.getNetworkInfo();
        if (prices.length === 0) {
            await priceService.refreshPrices();
            const refreshedPrices = priceService.getPrices();
            const response = {
                success: true,
                data: refreshedPrices,
                timestamp: new Date().toISOString(),
                blockNumber: networkInfo.blockNumber
            };
            return res.json(response);
        }
        const response = {
            success: true,
            data: prices,
            timestamp: new Date().toISOString(),
            blockNumber: networkInfo.blockNumber
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting prices:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'PRICES_ERROR',
                message: 'Failed to retrieve prices'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.pricesRouter.get('/:symbol', (req, res) => {
    try {
        const priceService = req.priceService;
        const { symbol } = req.params;
        const price = priceService.getPrice(symbol);
        if (!price) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PRICE_NOT_FOUND',
                    message: `Price for symbol '${symbol}' not found`
                },
                timestamp: new Date().toISOString()
            });
        }
        const response = {
            success: true,
            data: price,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting price:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'PRICE_ERROR',
                message: 'Failed to retrieve price'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.pricesRouter.post('/refresh', async (req, res) => {
    try {
        const priceService = req.priceService;
        const result = await priceService.refreshPrices();
        const refreshResponse = {
            refreshed: true,
            totalFeeds: priceService.getFeeds().length,
            successfulFeeds: result.successful,
            errors: result.errors,
            duration: result.duration,
            blockNumber: result.blockNumber
        };
        const response = {
            success: true,
            data: refreshResponse,
            timestamp: new Date().toISOString(),
            blockNumber: result.blockNumber
        };
        return res.json(response);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already in progress')) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'REFRESH_IN_PROGRESS',
                    message: 'Price refresh already in progress'
                },
                timestamp: new Date().toISOString()
            });
        }
        console.error('Error refreshing prices:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'REFRESH_ERROR',
                message: 'Failed to refresh prices'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.pricesRouter.get('/reserves', async (req, res) => {
    try {
        const priceService = req.priceService;
        const reservesSnapshot = await priceService.getReservesSnapshot();
        const response = {
            success: true,
            data: reservesSnapshot,
            timestamp: new Date().toISOString(),
            blockNumber: reservesSnapshot.blockNumber
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting reserves:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'RESERVES_ERROR',
                message: 'Failed to retrieve Proof of Reserve data'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.pricesRouter.get('/reserves/:symbol', async (req, res) => {
    try {
        const priceService = req.priceService;
        const { symbol } = req.params;
        const reserve = await priceService.getProofOfReserveBySymbol(symbol);
        if (!reserve) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'RESERVE_NOT_FOUND',
                    message: `Proof of Reserve data for symbol '${symbol}' not found`
                },
                timestamp: new Date().toISOString()
            });
        }
        const response = {
            success: true,
            data: reserve,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting reserve:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'RESERVE_ERROR',
                message: 'Failed to retrieve reserve data'
            },
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=prices.js.map