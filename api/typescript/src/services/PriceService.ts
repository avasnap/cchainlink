import { ethers } from 'ethers';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { FeedMetadata, PriceData, RoundData, FeedDescription, FeedVersion, FeedDecimals, ProofOfReserveData, ReservesSnapshot } from '../types';

export class PriceService {
  private provider: ethers.JsonRpcProvider;
  private multicall: ethers.Contract;
  private feeds: FeedMetadata[] = [];
  private prices: Map<string, PriceData> = new Map();
  private lastUpdate: Date = new Date(0);
  private isRefreshing = false;

  private readonly MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
  private readonly AVALANCHE_RPC = 'https://api.avax.network/ext/bc/C/rpc';
  
  private readonly MULTICALL3_ABI = [
    {
      "inputs": [
        {
          "components": [
            { "internalType": "address", "name": "target", "type": "address" },
            { "internalType": "bytes", "name": "callData", "type": "bytes" }
          ],
          "internalType": "struct Multicall3.Call[]",
          "name": "calls",
          "type": "tuple[]"
        }
      ],
      "name": "aggregate",
      "outputs": [
        { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
        { "internalType": "bytes[]", "name": "returnData", "type": "bytes[]" }
      ],
      "stateMutability": "payable",
      "type": "function"
    }
  ];

  private readonly CHAINLINK_ABI = [
    {
      "inputs": [],
      "name": "latestRoundData",
      "outputs": [
        { "internalType": "uint80", "name": "roundId", "type": "uint80" },
        { "internalType": "int256", "name": "answer", "type": "int256" },
        { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
        { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
        { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint80", "name": "_roundId", "type": "uint80" }
      ],
      "name": "getRoundData",
      "outputs": [
        { "internalType": "uint80", "name": "roundId", "type": "uint80" },
        { "internalType": "int256", "name": "answer", "type": "int256" },
        { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
        { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
        { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        { "internalType": "uint8", "name": "", "type": "uint8" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "description",
      "outputs": [
        { "internalType": "string", "name": "", "type": "string" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "version",
      "outputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider(this.AVALANCHE_RPC);
    this.multicall = new ethers.Contract(this.MULTICALL3_ADDRESS, this.MULTICALL3_ABI, this.provider);
    this.loadFeeds();
  }

  private async loadFeeds(): Promise<void> {
    const csvPath = process.env.NODE_ENV === 'production' 
      ? path.join('/app', 'avalanche_chainlink_feeds.csv')
      : path.join(__dirname, '../../../avalanche_chainlink_feeds.csv');
    
    return new Promise((resolve, reject) => {
      const feedsData: FeedMetadata[] = [];
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Convert CSV row to FeedMetadata format
          const symbol = this.extractSymbol(row.name);
          feedsData.push({
            name: row.name,
            symbol,
            contractAddress: row.contract_address,
            proxyAddress: row.proxy_address,
            decimals: parseInt(row.decimals),
            deviationThreshold: parseFloat(row.deviation_threshold),
            heartbeat: parseInt(row.heartbeat),
            assetClass: row.asset_class,
            productName: row.product_name,
            baseAsset: row.base_asset,
            quoteAsset: row.quote_asset
          });
        })
        .on('end', () => {
          this.feeds = feedsData;
          console.log(`📊 Loaded ${this.feeds.length} Chainlink feeds`);
          resolve();
        })
        .on('error', reject);
    });
  }

  private extractSymbol(name: string): string {
    // Extract symbol from feed name (e.g., "BTC / USD" -> "BTCUSD")
    const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    
    // Handle special cases
    if (name.includes('Proof of Reserves')) {
      return cleaned.replace('PROOFOFRESERVES', '_POR');
    }
    if (name.includes('Emergency Count')) {
      return cleaned.replace('EMERGENCYCOUNT', '_EMERGENCY');
    }
    if (name.includes('Exchange Rate')) {
      return cleaned.replace('EXCHANGERATE', '_RATE');
    }
    
    return cleaned;
  }

  public async refreshPrices(): Promise<{ successful: number; errors: any[]; blockNumber: string; duration: number }> {
    if (this.isRefreshing) {
      throw new Error('Price refresh already in progress');
    }

    this.isRefreshing = true;
    const startTime = Date.now();
    const errors: any[] = [];

    try {
      const chainlinkInterface = new ethers.Interface(this.CHAINLINK_ABI);
      
      // Prepare multicall data
      const calls = this.feeds.map(feed => ({
        target: feed.proxyAddress,
        callData: chainlinkInterface.encodeFunctionData('latestRoundData', [])
      }));

      console.log(`🔄 Fetching prices for ${calls.length} feeds via Multicall3...`);
      
      // Execute multicall
      if (!this.multicall.aggregate) {
        throw new Error('Multicall contract not properly initialized');
      }
      const [blockNumber, returnData] = await this.multicall.aggregate.staticCall(calls);
      
      // Process results
      let successful = 0;
      
      returnData.forEach((data: string, index: number) => {
        try {
          const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
            chainlinkInterface.decodeFunctionResult('latestRoundData', data);
          
          const feed = this.feeds[index];
          if (!feed) return;
          
          const price = Number(answer) / Math.pow(10, feed.decimals);
          
          const priceData: PriceData = {
            symbol: feed.symbol,
            price,
            decimals: feed.decimals,
            roundId: roundId.toString(),
            updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
            proxyAddress: feed.proxyAddress,
            raw: {
              answer: answer.toString(),
              startedAt: startedAt.toString(),
              updatedAt: updatedAt.toString(),
              answeredInRound: answeredInRound.toString()
            }
          };
          
          this.prices.set(feed.symbol, priceData);
          successful++;
          
        } catch (error) {
          const feed = this.feeds[index];
          const errorInfo = {
            symbol: feed?.symbol || `Feed_${index}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          errors.push(errorInfo);
          console.error(`❌ Error processing feed ${errorInfo.symbol}:`, error);
        }
      });

      this.lastUpdate = new Date();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Price refresh completed: ${successful}/${this.feeds.length} successful in ${duration}ms`);
      
      return {
        successful,
        errors,
        blockNumber: blockNumber.toString(),
        duration
      };
      
    } catch (error) {
      console.error('❌ Price refresh failed:', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  public getFeeds(): FeedMetadata[] {
    return [...this.feeds];
  }

  public getFeed(symbol: string): FeedMetadata | undefined {
    return this.feeds.find(feed => 
      feed.symbol.toLowerCase() === symbol.toLowerCase() ||
      feed.name.toLowerCase().includes(symbol.toLowerCase())
    );
  }

  public getPrices(): PriceData[] {
    return Array.from(this.prices.values());
  }

  public getPrice(symbol: string): PriceData | undefined {
    // Try exact match first
    let price = this.prices.get(symbol.toUpperCase());
    if (price) return price;
    
    // Try partial match
    for (const [key, value] of this.prices.entries()) {
      if (key.toLowerCase().includes(symbol.toLowerCase()) ||
          value.symbol.toLowerCase().includes(symbol.toLowerCase())) {
        return value;
      }
    }
    
    return undefined;
  }

  public getLastUpdate(): Date {
    return this.lastUpdate;
  }

  public isHealthy(): boolean {
    return this.feeds.length > 0 && !this.isRefreshing;
  }

  public async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        connected: true,
        chainId: network.chainId.toString(),
        blockNumber: blockNumber.toString()
      };
    } catch (error) {
      return {
        connected: false,
        chainId: 'unknown',
        blockNumber: 'unknown'
      };
    }
  }

  // Historical round data
  public async getRoundData(symbol: string, roundId: string): Promise<RoundData | null> {
    const feed = this.getFeed(symbol);
    if (!feed) return null;

    try {
      const contract = new ethers.Contract(feed.proxyAddress, this.CHAINLINK_ABI, this.provider);
      if (!contract.getRoundData) {
        throw new Error('getRoundData function not available');
      }
      const [retRoundId, answer, startedAt, updatedAt, answeredInRound] = 
        await contract.getRoundData(roundId);
      
      const price = Number(answer) / Math.pow(10, feed.decimals);
      
      return {
        roundId: retRoundId.toString(),
        answer: answer.toString(),
        startedAt: startedAt.toString(),
        updatedAt: updatedAt.toString(),
        answeredInRound: answeredInRound.toString(),
        price,
        decimals: feed.decimals,
        symbol: feed.symbol,
        timestamp: new Date(Number(updatedAt) * 1000).toISOString()
      };
    } catch (error) {
      console.error(`Error getting round data for ${symbol}:`, error);
      return null;
    }
  }

  // Get feed descriptions via multicall
  public async getFeedDescriptions(): Promise<FeedDescription[]> {
    try {
      const chainlinkInterface = new ethers.Interface(this.CHAINLINK_ABI);
      
      const calls = this.feeds.map(feed => ({
        target: feed.proxyAddress,
        callData: chainlinkInterface.encodeFunctionData('description', [])
      }));

      if (!this.multicall.aggregate) {
        throw new Error('Multicall contract not properly initialized');
      }
      const [, returnData] = await this.multicall.aggregate.staticCall(calls);
      
      const descriptions: FeedDescription[] = [];
      returnData.forEach((data: string, index: number) => {
        try {
          const [description] = chainlinkInterface.decodeFunctionResult('description', data);
          const feed = this.feeds[index];
          if (feed) {
            descriptions.push({
              symbol: feed.symbol,
              description: description,
              proxyAddress: feed.proxyAddress
            });
          }
        } catch (error) {
          console.error(`Error decoding description for feed ${index}:`, error);
        }
      });

      return descriptions;
    } catch (error) {
      console.error('Error getting feed descriptions:', error);
      return [];
    }
  }

  // Get feed versions via multicall
  public async getFeedVersions(): Promise<FeedVersion[]> {
    try {
      const chainlinkInterface = new ethers.Interface(this.CHAINLINK_ABI);
      
      const calls = this.feeds.map(feed => ({
        target: feed.proxyAddress,
        callData: chainlinkInterface.encodeFunctionData('version', [])
      }));

      if (!this.multicall.aggregate) {
        throw new Error('Multicall contract not properly initialized');
      }
      const [, returnData] = await this.multicall.aggregate.staticCall(calls);
      
      const versions: FeedVersion[] = [];
      returnData.forEach((data: string, index: number) => {
        try {
          const [version] = chainlinkInterface.decodeFunctionResult('version', data);
          const feed = this.feeds[index];
          if (feed) {
            versions.push({
              symbol: feed.symbol,
              version: version.toString(),
              proxyAddress: feed.proxyAddress
            });
          }
        } catch (error) {
          console.error(`Error decoding version for feed ${index}:`, error);
        }
      });

      return versions;
    } catch (error) {
      console.error('Error getting feed versions:', error);
      return [];
    }
  }

  // Get feed decimals via multicall
  public async getFeedDecimals(): Promise<FeedDecimals[]> {
    try {
      const chainlinkInterface = new ethers.Interface(this.CHAINLINK_ABI);
      
      const calls = this.feeds.map(feed => ({
        target: feed.proxyAddress,
        callData: chainlinkInterface.encodeFunctionData('decimals', [])
      }));

      if (!this.multicall.aggregate) {
        throw new Error('Multicall contract not properly initialized');
      }
      const [, returnData] = await this.multicall.aggregate.staticCall(calls);
      
      const decimalsData: FeedDecimals[] = [];
      returnData.forEach((data: string, index: number) => {
        try {
          const [decimals] = chainlinkInterface.decodeFunctionResult('decimals', data);
          const feed = this.feeds[index];
          if (feed) {
            decimalsData.push({
              symbol: feed.symbol,
              decimals: Number(decimals),
              proxyAddress: feed.proxyAddress
            });
          }
        } catch (error) {
          console.error(`Error decoding decimals for feed ${index}:`, error);
        }
      });

      return decimalsData;
    } catch (error) {
      console.error('Error getting feed decimals:', error);
      return [];
    }
  }

  // Proof of Reserve specific methods
  public getProofOfReserveFeeds(): FeedMetadata[] {
    return this.feeds.filter(feed => 
      feed.assetClass === 'Proof of Reserve' ||
      feed.name.toLowerCase().includes('proof of reserves') ||
      feed.name.toLowerCase().includes('reserves')
    );
  }

  public async getProofOfReserveData(): Promise<ProofOfReserveData[]> {
    const porFeeds = this.getProofOfReserveFeeds();
    const reserves: ProofOfReserveData[] = [];

    try {
      const chainlinkInterface = new ethers.Interface(this.CHAINLINK_ABI);
      
      // Get latest round data for PoR feeds
      const calls = porFeeds.map(feed => ({
        target: feed.proxyAddress,
        callData: chainlinkInterface.encodeFunctionData('latestRoundData', [])
      }));

      if (calls.length === 0) return reserves;

      if (!this.multicall.aggregate) {
        throw new Error('Multicall contract not properly initialized');
      }
      const [, returnData] = await this.multicall.aggregate.staticCall(calls);
      
      returnData.forEach((data: string, index: number) => {
        try {
          const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
            chainlinkInterface.decodeFunctionResult('latestRoundData', data);
          
          const feed = porFeeds[index];
          if (!feed) return;
          
          const totalReserves = Number(answer) / Math.pow(10, feed.decimals);
          const asset = this.extractAssetFromPorName(feed.name);
          
          reserves.push({
            symbol: feed.symbol,
            asset,
            totalReserves,
            decimals: feed.decimals,
            rawReserves: answer.toString(),
            updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
            roundId: roundId.toString(),
            proxyAddress: feed.proxyAddress,
            description: feed.name
          });
          
        } catch (error) {
          console.error(`Error processing PoR feed ${index}:`, error);
        }
      });

      return reserves;
    } catch (error) {
      console.error('Error getting proof of reserve data:', error);
      return [];
    }
  }

  public async getReservesSnapshot(): Promise<ReservesSnapshot> {
    const reserves = await this.getProofOfReserveData();
    const networkInfo = await this.getNetworkInfo();
    
    return {
      timestamp: new Date().toISOString(),
      blockNumber: networkInfo.blockNumber,
      totalReserves: reserves,
      summary: {
        totalAssets: reserves.length,
        lastUpdated: reserves.length > 0 
          ? reserves.reduce((latest, reserve) => 
              reserve.updatedAt > latest ? reserve.updatedAt : latest, 
              reserves[0]?.updatedAt || new Date().toISOString()
            )
          : new Date().toISOString()
      }
    };
  }

  public getProofOfReserveBySymbol(symbol: string): Promise<ProofOfReserveData | null> {
    return this.getProofOfReserveData().then(reserves => 
      reserves.find(reserve => 
        reserve.symbol.toLowerCase() === symbol.toLowerCase() ||
        reserve.asset.toLowerCase() === symbol.toLowerCase()
      ) || null
    );
  }

  private extractAssetFromPorName(name: string): string {
    // Extract asset name from PoR feed names
    // "BTC.b Proof of Reserves" -> "BTC.b"
    // "USDC.e Proof of Reserves" -> "USDC.e"
    
    if (name.includes('Proof of Reserves')) {
      return name.replace('Proof of Reserves', '').trim();
    }
    
    if (name.includes('Reserves')) {
      return name.replace('Reserves', '').trim();
    }
    
    // For feeds like "Ion Digital Total Reserve"
    if (name.includes('Reserve')) {
      const parts = name.split(' ');
      return parts.slice(0, -2).join(' '); // Remove "Total Reserve"
    }
    
    return name;
  }
}