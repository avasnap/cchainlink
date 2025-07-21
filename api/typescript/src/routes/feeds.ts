import { Router, Request, Response, NextFunction } from 'express';
import { PriceService } from '../services/PriceService';
import { ApiResponse, FeedMetadata } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { FeedNotFoundError, FeedsLoadError } from '../utils/errors';

export const feedsRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FeedMetadata:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "BTC / USD"
 *         symbol:
 *           type: string
 *           example: "BTCUSD"
 *         contractAddress:
 *           type: string
 *           example: "0xa9Afa74dDAC812B86Eeaa60A035c6592470F4A48"
 *         proxyAddress:
 *           type: string
 *           example: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
 *         decimals:
 *           type: number
 *           example: 8
 *         deviationThreshold:
 *           type: number
 *           example: 0.1
 *         heartbeat:
 *           type: number
 *           example: 86400
 *         assetClass:
 *           type: string
 *           example: "Crypto"
 *         productName:
 *           type: string
 *           example: "BTC/USD-RefPrice-DF-Avalanche-001"
 *         baseAsset:
 *           type: string
 *           example: "BTC"
 *         quoteAsset:
 *           type: string
 *           example: "USD"
 */

/**
 * @swagger
 * /feeds:
 *   get:
 *     summary: Get all Chainlink feed metadata
 *     description: Returns metadata for all 73 Chainlink feeds on Avalanche C-Chain
 *     tags: [Feeds]
 *     parameters:
 *       - in: query
 *         name: assetClass
 *         schema:
 *           type: string
 *           enum: [Crypto, Fiat, Commodity, "Proof of Reserve"]
 *         description: Filter feeds by asset class
 *     responses:
 *       200:
 *         description: Feed metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeedMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
feedsRouter.get('/', (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    let feeds = priceService.getFeeds();

    // Filter by asset class if specified
    const assetClass = req.query.assetClass as string;
    if (assetClass) {
      feeds = feeds.filter(feed => 
        feed.assetClass.toLowerCase() === assetClass.toLowerCase()
      );
    }

    const response: ApiResponse<FeedMetadata[]> = {
      success: true,
      data: feeds,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /feeds/{symbol}:
 *   get:
 *     summary: Get specific feed metadata
 *     description: Returns metadata for a specific Chainlink feed
 *     tags: [Feeds]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Feed symbol (e.g., BTCUSD, BTC, or "BTC / USD")
 *         example: BTCUSD
 *     responses:
 *       200:
 *         description: Feed metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FeedMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Feed not found
 */
feedsRouter.get('/:symbol', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const priceService: PriceService = (req as any).priceService;
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new FeedNotFoundError('undefined');
  }
  
  const feed = priceService.getFeed(symbol);

  if (!feed) {
    throw new FeedNotFoundError(symbol);
  }

  const response: ApiResponse<FeedMetadata> = {
    success: true,
    data: feed,
    timestamp: new Date().toISOString()
  };

  res.json(response);
}));

/**
 * @swagger
 * /feeds/reserves:
 *   get:
 *     summary: Get all Proof of Reserve feeds
 *     description: Returns metadata for all Proof of Reserve feeds that show token backing
 *     tags: [Feeds]
 *     responses:
 *       200:
 *         description: Proof of Reserve feeds retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeedMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
feedsRouter.get('/reserves', (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const porFeeds = priceService.getProofOfReserveFeeds();

    const response: ApiResponse<FeedMetadata[]> = {
      success: true,
      data: porFeeds,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /feeds/descriptions:
 *   get:
 *     summary: Get all feed descriptions
 *     description: Returns descriptions from all feed contracts via multicall
 *     tags: [Feeds]
 *     responses:
 *       200:
 *         description: Feed descriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: "BTCUSD"
 *                       description:
 *                         type: string
 *                         example: "BTC / USD"
 *                       proxyAddress:
 *                         type: string
 *                         example: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
feedsRouter.get('/descriptions', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const descriptions = await priceService.getFeedDescriptions();

    const response: ApiResponse<any[]> = {
      success: true,
      data: descriptions,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /feeds/versions:
 *   get:
 *     summary: Get all feed versions
 *     description: Returns version numbers from all feed contracts via multicall
 *     tags: [Feeds]
 *     responses:
 *       200:
 *         description: Feed versions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: "BTCUSD"
 *                       version:
 *                         type: string
 *                         example: "6"
 *                       proxyAddress:
 *                         type: string
 *                         example: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
feedsRouter.get('/versions', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const versions = await priceService.getFeedVersions();

    const response: ApiResponse<any[]> = {
      success: true,
      data: versions,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /feeds/decimals:
 *   get:
 *     summary: Get all feed decimals
 *     description: Returns decimal precision from all feed contracts via multicall
 *     tags: [Feeds]
 *     responses:
 *       200:
 *         description: Feed decimals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                         example: "BTCUSD"
 *                       decimals:
 *                         type: number
 *                         example: 8
 *                       proxyAddress:
 *                         type: string
 *                         example: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
feedsRouter.get('/decimals', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const decimals = await priceService.getFeedDecimals();

    const response: ApiResponse<any[]> = {
      success: true,
      data: decimals,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /feeds/{symbol}/rounds/{roundId}:
 *   get:
 *     summary: Get historical round data for a feed
 *     description: Returns historical price data for a specific round ID
 *     tags: [Feeds]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Feed symbol
 *         example: BTCUSD
 *       - in: path
 *         name: roundId
 *         required: true
 *         schema:
 *           type: string
 *         description: Round ID to retrieve
 *         example: "18446744073709562301"
 *     responses:
 *       200:
 *         description: Round data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     roundId:
 *                       type: string
 *                       example: "18446744073709562301"
 *                     answer:
 *                       type: string
 *                       example: "11740279073738"
 *                     price:
 *                       type: number
 *                       example: 117402.79073738
 *                     decimals:
 *                       type: number
 *                       example: 8
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-21T00:59:55.000Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Feed or round not found
 */
feedsRouter.get('/:symbol/rounds/:roundId', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
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

    const response: ApiResponse<any> = {
      success: true,
      data: roundData,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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