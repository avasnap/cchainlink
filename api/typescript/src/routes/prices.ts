import { Router } from 'express';
import { PriceService } from '../services/PriceService';
import { ApiResponse, PriceData, PriceRefreshResponse } from '../types';

export const pricesRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PriceData:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           example: "BTCUSD"
 *         price:
 *           type: number
 *           example: 117402.79073738
 *         decimals:
 *           type: number
 *           example: 8
 *         roundId:
 *           type: string
 *           example: "18446744073709562301"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-07-21T00:59:55.000Z"
 *         proxyAddress:
 *           type: string
 *           example: "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"
 *         raw:
 *           type: object
 *           properties:
 *             answer:
 *               type: string
 *               example: "11740279073738"
 *             startedAt:
 *               type: string
 *               example: "1674123456"
 *             updatedAt:
 *               type: string
 *               example: "1674123456"
 *             answeredInRound:
 *               type: string
 *               example: "18446744073709562301"
 */

/**
 * @swagger
 * /prices:
 *   get:
 *     summary: Get all current prices
 *     description: Returns current prices for all Chainlink feeds via Multicall3
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Prices retrieved successfully
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
 *                     $ref: '#/components/schemas/PriceData'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 blockNumber:
 *                   type: string
 *                   example: "65814031"
 *       500:
 *         description: Failed to retrieve prices
 */
pricesRouter.get('/', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const prices = priceService.getPrices();
    const networkInfo = await priceService.getNetworkInfo();

    if (prices.length === 0) {
      // Try to refresh if no prices available
      await priceService.refreshPrices();
      const refreshedPrices = priceService.getPrices();
      
      const response: ApiResponse<PriceData[]> = {
        success: true,
        data: refreshedPrices,
        timestamp: new Date().toISOString(),
        blockNumber: networkInfo.blockNumber
      };

      return res.json(response);
    }

    const response: ApiResponse<PriceData[]> = {
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
      blockNumber: networkInfo.blockNumber
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /prices/{symbol}:
 *   get:
 *     summary: Get specific price
 *     description: Returns current price for a specific Chainlink feed
 *     tags: [Prices]
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
 *         description: Price retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PriceData'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Price not found
 */
pricesRouter.get('/:symbol', (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
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

    const response: ApiResponse<PriceData> = {
      success: true,
      data: price,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /prices/refresh:
 *   post:
 *     summary: Refresh all prices
 *     description: Manually trigger a refresh of all feed prices via Multicall3
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Prices refreshed successfully
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
 *                     refreshed:
 *                       type: boolean
 *                       example: true
 *                     totalFeeds:
 *                       type: number
 *                       example: 73
 *                     successfulFeeds:
 *                       type: number
 *                       example: 73
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           error:
 *                             type: string
 *                     duration:
 *                       type: number
 *                       example: 2044
 *                     blockNumber:
 *                       type: string
 *                       example: "65814031"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       409:
 *         description: Refresh already in progress
 *       500:
 *         description: Refresh failed
 */
pricesRouter.post('/refresh', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const result = await priceService.refreshPrices();

    const refreshResponse: PriceRefreshResponse = {
      refreshed: true,
      totalFeeds: priceService.getFeeds().length,
      successfulFeeds: result.successful,
      errors: result.errors,
      duration: result.duration,
      blockNumber: result.blockNumber
    };

    const response: ApiResponse<PriceRefreshResponse> = {
      success: true,
      data: refreshResponse,
      timestamp: new Date().toISOString(),
      blockNumber: result.blockNumber
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /prices/reserves:
 *   get:
 *     summary: Get all Proof of Reserve data
 *     description: Returns current reserve amounts for all Proof of Reserve feeds
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Proof of Reserve data retrieved successfully
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
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     blockNumber:
 *                       type: string
 *                       example: "65814031"
 *                     totalReserves:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                             example: "BTCBPOR"
 *                           asset:
 *                             type: string
 *                             example: "BTC.b"
 *                           totalReserves:
 *                             type: number
 *                             example: 4870.83899535
 *                           decimals:
 *                             type: number
 *                             example: 8
 *                           rawReserves:
 *                             type: string
 *                             example: "487083899535"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           roundId:
 *                             type: string
 *                           proxyAddress:
 *                             type: string
 *                           description:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: number
 *                           example: 11
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
pricesRouter.get('/reserves', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    const reservesSnapshot = await priceService.getReservesSnapshot();

    const response: ApiResponse<any> = {
      success: true,
      data: reservesSnapshot,
      timestamp: new Date().toISOString(),
      blockNumber: reservesSnapshot.blockNumber
    };

    return res.json(response);
  } catch (error) {
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

/**
 * @swagger
 * /prices/reserves/{symbol}:
 *   get:
 *     summary: Get specific Proof of Reserve data
 *     description: Returns reserve amount for a specific asset
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset symbol (e.g., BTCB, BTC.b, USDC.e)
 *         example: BTCB
 *     responses:
 *       200:
 *         description: Proof of Reserve data retrieved successfully
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
 *                     symbol:
 *                       type: string
 *                       example: "BTCBPOR"
 *                     asset:
 *                       type: string
 *                       example: "BTC.b"
 *                     totalReserves:
 *                       type: number
 *                       example: 4870.83899535
 *                     decimals:
 *                       type: number
 *                       example: 8
 *                     rawReserves:
 *                       type: string
 *                       example: "487083899535"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     roundId:
 *                       type: string
 *                     proxyAddress:
 *                       type: string
 *                     description:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Reserve data not found
 */
pricesRouter.get('/reserves/:symbol', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
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

    const response: ApiResponse<any> = {
      success: true,
      data: reserve,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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