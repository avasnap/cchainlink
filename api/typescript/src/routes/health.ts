import { Router } from 'express';
import { PriceService } from '../services/PriceService';
import { HealthCheck, ApiResponse } from '../types';

export const healthRouter = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health check successful
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                       example: healthy
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                       example: 3600
 *                     avalanche:
 *                       type: object
 *                       properties:
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         chainId:
 *                           type: string
 *                           example: "43114"
 *                         blockNumber:
 *                           type: string
 *                           example: "65814031"
 *                     feeds:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 73
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-07-21T01:06:30.000Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-21T01:06:30.000Z"
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "HEALTH_CHECK_FAILED"
 *                     message:
 *                       type: string
 *                       example: "Health check failed"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
healthRouter.get('/', async (req, res) => {
  try {
    const priceService: PriceService = (req as any).priceService;
    
    const networkInfo = await priceService.getNetworkInfo();
    const feeds = priceService.getFeeds();
    const lastUpdate = priceService.getLastUpdate();
    const isHealthy = priceService.isHealthy();
    
    const healthData: HealthCheck = {
      status: isHealthy && networkInfo.connected ? 'healthy' : 'unhealthy',
      version: '1.0.0',
      uptime: process.uptime(),
      avalanche: networkInfo,
      feeds: {
        total: feeds.length,
        lastUpdated: lastUpdate.toISOString()
      }
    };

    const response: ApiResponse<HealthCheck> = {
      success: true,
      data: healthData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
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