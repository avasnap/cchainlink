import { FeedMetadata, PriceData, RoundData, FeedDescription, FeedVersion, FeedDecimals, ProofOfReserveData, ReservesSnapshot } from '../types';
export declare class PriceService {
    private provider;
    private multicall;
    private feeds;
    private prices;
    private lastUpdate;
    private isRefreshing;
    private readonly MULTICALL3_ADDRESS;
    private readonly AVALANCHE_RPC;
    private readonly MULTICALL3_ABI;
    private readonly CHAINLINK_ABI;
    constructor();
    private loadFeeds;
    private extractSymbol;
    refreshPrices(): Promise<{
        successful: number;
        errors: any[];
        blockNumber: string;
        duration: number;
    }>;
    getFeeds(): FeedMetadata[];
    getFeed(symbol: string): FeedMetadata | undefined;
    getPrices(): PriceData[];
    getPrice(symbol: string): PriceData | undefined;
    getLastUpdate(): Date;
    isHealthy(): boolean;
    getNetworkInfo(): Promise<{
        connected: boolean;
        chainId: string;
        blockNumber: string;
    }>;
    getRoundData(symbol: string, roundId: string): Promise<RoundData | null>;
    getFeedDescriptions(): Promise<FeedDescription[]>;
    getFeedVersions(): Promise<FeedVersion[]>;
    getFeedDecimals(): Promise<FeedDecimals[]>;
    getProofOfReserveFeeds(): FeedMetadata[];
    getProofOfReserveData(): Promise<ProofOfReserveData[]>;
    getReservesSnapshot(): Promise<ReservesSnapshot>;
    getProofOfReserveBySymbol(symbol: string): Promise<ProofOfReserveData | null>;
    private extractAssetFromPorName;
}
//# sourceMappingURL=PriceService.d.ts.map