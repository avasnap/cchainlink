import { ApiError } from '../middleware/errorHandler';
export declare class FeedNotFoundError extends ApiError {
    constructor(symbol: string);
}
export declare class FeedsLoadError extends ApiError {
    constructor(message?: string);
}
export declare class PriceNotFoundError extends ApiError {
    constructor(symbol: string);
}
export declare class PriceRefreshError extends ApiError {
    constructor(message?: string);
}
export declare class RefreshInProgressError extends ApiError {
    constructor();
}
export declare class RoundNotFoundError extends ApiError {
    constructor(symbol: string, roundId: string);
}
export declare class ReserveNotFoundError extends ApiError {
    constructor(symbol: string);
}
export declare class ReservesLoadError extends ApiError {
    constructor(message?: string);
}
export declare class BlockchainConnectionError extends ApiError {
    constructor(message?: string);
}
export declare class ContractCallError extends ApiError {
    constructor(method: string, address: string, message?: string);
}
export declare class ValidationError extends ApiError {
    constructor(field: string, message: string);
}
//# sourceMappingURL=errors.d.ts.map