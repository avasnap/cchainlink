export interface FeedMetadata {
    name: string;
    symbol: string;
    contractAddress: string;
    proxyAddress: string;
    decimals: number;
    deviationThreshold: number;
    heartbeat: number;
    assetClass: string;
    productName: string;
    baseAsset: string;
    quoteAsset: string;
}
export interface PriceData {
    symbol: string;
    price: number;
    decimals: number;
    roundId: string;
    updatedAt: string;
    proxyAddress: string;
    raw: {
        answer: string;
        startedAt: string;
        updatedAt: string;
        answeredInRound: string;
    };
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    timestamp: string;
    blockNumber?: string;
}
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
    timestamp: string;
}
export interface HealthCheck {
    status: 'healthy' | 'unhealthy';
    version: string;
    uptime: number;
    avalanche: {
        connected: boolean;
        chainId: string;
        blockNumber: string;
    };
    feeds: {
        total: number;
        lastUpdated: string;
    };
}
export interface PriceRefreshResponse {
    refreshed: boolean;
    totalFeeds: number;
    successfulFeeds: number;
    errors: Array<{
        symbol: string;
        error: string;
    }>;
    duration: number;
    blockNumber: string;
}
export interface RoundData {
    roundId: string;
    answer: string;
    startedAt: string;
    updatedAt: string;
    answeredInRound: string;
    price: number;
    decimals: number;
    symbol: string;
    timestamp: string;
}
export interface FeedDescription {
    symbol: string;
    description: string;
    proxyAddress: string;
}
export interface FeedVersion {
    symbol: string;
    version: string;
    proxyAddress: string;
}
export interface FeedDecimals {
    symbol: string;
    decimals: number;
    proxyAddress: string;
}
export interface ProofOfReserveData {
    symbol: string;
    asset: string;
    totalReserves: number;
    decimals: number;
    rawReserves: string;
    updatedAt: string;
    roundId: string;
    proxyAddress: string;
    backingRatio?: number;
    description: string;
}
export interface ReservesSnapshot {
    timestamp: string;
    blockNumber: string;
    totalReserves: Array<ProofOfReserveData>;
    summary: {
        totalAssets: number;
        totalValueUSD?: number;
        lastUpdated: string;
    };
}
//# sourceMappingURL=types.d.ts.map