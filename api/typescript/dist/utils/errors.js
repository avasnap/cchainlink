"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ContractCallError = exports.BlockchainConnectionError = exports.ReservesLoadError = exports.ReserveNotFoundError = exports.RoundNotFoundError = exports.RefreshInProgressError = exports.PriceRefreshError = exports.PriceNotFoundError = exports.FeedsLoadError = exports.FeedNotFoundError = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
class FeedNotFoundError extends errorHandler_1.ApiError {
    constructor(symbol) {
        super(`Feed with symbol '${symbol}' not found`, 404, 'FEED_NOT_FOUND');
    }
}
exports.FeedNotFoundError = FeedNotFoundError;
class FeedsLoadError extends errorHandler_1.ApiError {
    constructor(message = 'Failed to load feeds data') {
        super(message, 500, 'FEEDS_LOAD_ERROR');
    }
}
exports.FeedsLoadError = FeedsLoadError;
class PriceNotFoundError extends errorHandler_1.ApiError {
    constructor(symbol) {
        super(`Price for symbol '${symbol}' not found`, 404, 'PRICE_NOT_FOUND');
    }
}
exports.PriceNotFoundError = PriceNotFoundError;
class PriceRefreshError extends errorHandler_1.ApiError {
    constructor(message = 'Failed to refresh prices') {
        super(message, 500, 'PRICE_REFRESH_ERROR');
    }
}
exports.PriceRefreshError = PriceRefreshError;
class RefreshInProgressError extends errorHandler_1.ApiError {
    constructor() {
        super('Price refresh already in progress', 409, 'REFRESH_IN_PROGRESS');
    }
}
exports.RefreshInProgressError = RefreshInProgressError;
class RoundNotFoundError extends errorHandler_1.ApiError {
    constructor(symbol, roundId) {
        super(`Round ${roundId} not found for symbol '${symbol}'`, 404, 'ROUND_NOT_FOUND');
    }
}
exports.RoundNotFoundError = RoundNotFoundError;
class ReserveNotFoundError extends errorHandler_1.ApiError {
    constructor(symbol) {
        super(`Proof of Reserve data for symbol '${symbol}' not found`, 404, 'RESERVE_NOT_FOUND');
    }
}
exports.ReserveNotFoundError = ReserveNotFoundError;
class ReservesLoadError extends errorHandler_1.ApiError {
    constructor(message = 'Failed to load Proof of Reserve data') {
        super(message, 500, 'RESERVES_LOAD_ERROR');
    }
}
exports.ReservesLoadError = ReservesLoadError;
class BlockchainConnectionError extends errorHandler_1.ApiError {
    constructor(message = 'Failed to connect to Avalanche blockchain') {
        super(message, 503, 'BLOCKCHAIN_CONNECTION_ERROR');
    }
}
exports.BlockchainConnectionError = BlockchainConnectionError;
class ContractCallError extends errorHandler_1.ApiError {
    constructor(method, address, message) {
        super(message || `Failed to call ${method} on contract ${address}`, 500, 'CONTRACT_CALL_ERROR');
    }
}
exports.ContractCallError = ContractCallError;
class ValidationError extends errorHandler_1.ApiError {
    constructor(field, message) {
        super(`Validation error for ${field}: ${message}`, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=errors.js.map