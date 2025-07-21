"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedsRouter = void 0;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const errors_1 = require("../utils/errors");
exports.feedsRouter = (0, express_1.Router)();
exports.feedsRouter.get('/', (req, res) => {
    try {
        const priceService = req.priceService;
        let feeds = priceService.getFeeds();
        const assetClass = req.query.assetClass;
        if (assetClass) {
            feeds = feeds.filter(feed => feed.assetClass.toLowerCase() === assetClass.toLowerCase());
        }
        const response = {
            success: true,
            data: feeds,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting feeds:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'FEEDS_ERROR',
                message: 'Failed to retrieve feeds'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.feedsRouter.get('/:symbol', (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
    const priceService = req.priceService;
    const { symbol } = req.params;
    if (!symbol) {
        throw new errors_1.FeedNotFoundError('undefined');
    }
    const feed = priceService.getFeed(symbol);
    if (!feed) {
        throw new errors_1.FeedNotFoundError(symbol);
    }
    const response = {
        success: true,
        data: feed,
        timestamp: new Date().toISOString()
    };
    res.json(response);
}));
exports.feedsRouter.get('/reserves', (req, res) => {
    try {
        const priceService = req.priceService;
        const porFeeds = priceService.getProofOfReserveFeeds();
        const response = {
            success: true,
            data: porFeeds,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting PoR feeds:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'POR_FEEDS_ERROR',
                message: 'Failed to retrieve Proof of Reserve feeds'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.feedsRouter.get('/descriptions', async (req, res) => {
    try {
        const priceService = req.priceService;
        const descriptions = await priceService.getFeedDescriptions();
        const response = {
            success: true,
            data: descriptions,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting feed descriptions:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'DESCRIPTIONS_ERROR',
                message: 'Failed to retrieve feed descriptions'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.feedsRouter.get('/versions', async (req, res) => {
    try {
        const priceService = req.priceService;
        const versions = await priceService.getFeedVersions();
        const response = {
            success: true,
            data: versions,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting feed versions:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VERSIONS_ERROR',
                message: 'Failed to retrieve feed versions'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.feedsRouter.get('/decimals', async (req, res) => {
    try {
        const priceService = req.priceService;
        const decimals = await priceService.getFeedDecimals();
        const response = {
            success: true,
            data: decimals,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting feed decimals:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'DECIMALS_ERROR',
                message: 'Failed to retrieve feed decimals'
            },
            timestamp: new Date().toISOString()
        });
    }
});
exports.feedsRouter.get('/:symbol/rounds/:roundId', async (req, res) => {
    try {
        const priceService = req.priceService;
        const { symbol, roundId } = req.params;
        const roundData = await priceService.getRoundData(symbol, roundId);
        if (!roundData) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ROUND_NOT_FOUND',
                    message: `Round data not found for feed '${symbol}' and round '${roundId}'`
                },
                timestamp: new Date().toISOString()
            });
        }
        const response = {
            success: true,
            data: roundData,
            timestamp: new Date().toISOString()
        };
        return res.json(response);
    }
    catch (error) {
        console.error('Error getting round data:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'ROUND_DATA_ERROR',
                message: 'Failed to retrieve round data'
            },
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=feeds.js.map