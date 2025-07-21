/**
 * Common API Error Types
 * Standardized error definitions for consistent error handling
 */

import { ApiError } from '../middleware/errorHandler';

/**
 * Feed-related errors
 */
export class FeedNotFoundError extends ApiError {
  constructor(symbol: string) {
    super(`Feed with symbol '${symbol}' not found`, 404, 'FEED_NOT_FOUND');
  }
}

export class FeedsLoadError extends ApiError {
  constructor(message: string = 'Failed to load feeds data') {
    super(message, 500, 'FEEDS_LOAD_ERROR');
  }
}

/**
 * Price-related errors
 */
export class PriceNotFoundError extends ApiError {
  constructor(symbol: string) {
    super(`Price for symbol '${symbol}' not found`, 404, 'PRICE_NOT_FOUND');
  }
}

export class PriceRefreshError extends ApiError {
  constructor(message: string = 'Failed to refresh prices') {
    super(message, 500, 'PRICE_REFRESH_ERROR');
  }
}

export class RefreshInProgressError extends ApiError {
  constructor() {
    super('Price refresh already in progress', 409, 'REFRESH_IN_PROGRESS');
  }
}

/**
 * Round data errors
 */
export class RoundNotFoundError extends ApiError {
  constructor(symbol: string, roundId: string) {
    super(`Round ${roundId} not found for symbol '${symbol}'`, 404, 'ROUND_NOT_FOUND');
  }
}

/**
 * Proof of Reserve errors
 */
export class ReserveNotFoundError extends ApiError {
  constructor(symbol: string) {
    super(`Proof of Reserve data for symbol '${symbol}' not found`, 404, 'RESERVE_NOT_FOUND');
  }
}

export class ReservesLoadError extends ApiError {
  constructor(message: string = 'Failed to load Proof of Reserve data') {
    super(message, 500, 'RESERVES_LOAD_ERROR');
  }
}

/**
 * Blockchain-related errors
 */
export class BlockchainConnectionError extends ApiError {
  constructor(message: string = 'Failed to connect to Avalanche blockchain') {
    super(message, 503, 'BLOCKCHAIN_CONNECTION_ERROR');
  }
}

export class ContractCallError extends ApiError {
  constructor(method: string, address: string, message?: string) {
    super(
      message || `Failed to call ${method} on contract ${address}`,
      500,
      'CONTRACT_CALL_ERROR'
    );
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ApiError {
  constructor(field: string, message: string) {
    super(`Validation error for ${field}: ${message}`, 400, 'VALIDATION_ERROR');
  }
}