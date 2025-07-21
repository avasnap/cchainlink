"""
Price Service for Avalanche Chainlink Price Feeds
Handles all blockchain interactions and data management with comprehensive typing
"""

import os
import csv
import json
import time
import asyncio
from typing import List, Dict, Optional, Any, Final, cast, Union
from datetime import datetime, timezone

from web3 import Web3
from web3.contract import Contract
from web3.types import TxParams, BlockIdentifier
import pandas as pd

from models import (
    FeedMetadata, PriceData, RawPriceData, RoundData, FeedDescription,
    FeedVersion, FeedDecimals, ProofOfReserveData, ReservesSnapshot
)
from chainlink_types import (
    ChainId, Address, BlockNumber, RoundId, Decimals, Heartbeat,
    PriceValue, TimestampStr, SymbolStr, NetworkInfo, ErrorCode,
    FeedMetadataDict, RawRoundDataDict, MulticallResult, RefreshResult,
    Web3ContractProtocol, MulticallContractProtocol, ContractCall,
    AVALANCHE_CHAIN_ID, MULTICALL3_ADDRESS, AVALANCHE_RPC_URL,
    validate_symbol, validate_round_id, is_valid_address, CSV_FIELD_TYPES
)

class PriceService:
    """Service for managing Chainlink price feed data on Avalanche with strict typing"""
    
    # Class constants with proper typing
    CHAIN_ID: Final[ChainId] = AVALANCHE_CHAIN_ID
    RPC_URL: Final[str] = AVALANCHE_RPC_URL
    MULTICALL_ADDRESS: Final[Address] = MULTICALL3_ADDRESS
    
    def __init__(self) -> None:
        # Type-annotated instance variables
        self.w3: Optional[Web3] = None
        self.multicall_contract: Optional[MulticallContractProtocol] = None
        self.feeds: List[FeedMetadata] = []
        self.prices: List[PriceData] = []
        self.last_refresh_time: Optional[TimestampStr] = None
        self.refresh_in_progress: bool = False
        
        # Load ABIs with proper typing
        self.chainlink_abi: List[Dict[str, Any]] = self._load_chainlink_abi()
        self.multicall_abi: List[Dict[str, Any]] = self._load_multicall_abi()
    
    async def initialize(self) -> None:
        """Initialize the service with blockchain connection and feed data"""
        # Initialize Web3 connection with type safety
        self.w3 = Web3(Web3.HTTPProvider(self.RPC_URL))
        if not self.w3.is_connected():
            raise ConnectionError("Failed to connect to Avalanche C-Chain")
        
        # Initialize Multicall3 contract with proper typing
        self.multicall_contract = cast(
            MulticallContractProtocol,
            self.w3.eth.contract(
                address=self.w3.to_checksum_address(self.MULTICALL_ADDRESS),
                abi=self.multicall_abi
            )
        )
        
        # Load feed metadata
        await self._load_feeds()
        
        if self.w3 is not None:
            block_number = BlockNumber(self.w3.eth.block_number)
            print(f"🔗 Connected to Avalanche C-Chain (Block: {block_number})")
            print(f"📊 Loaded {len(self.feeds)} feeds")
    
    def _load_chainlink_abi(self) -> List[Dict[str, Any]]:
        """Load Chainlink AggregatorV3Interface ABI with type safety"""
        abi_path: str = os.path.join('/app', 'chainlink_abi_interface.json')
        try:
            with open(abi_path, 'r') as f:
                abi_data: Any = json.load(f)
                if not isinstance(abi_data, list):
                    raise ValueError(f"Invalid ABI format: expected list, got {type(abi_data)}")
                return cast(List[Dict[str, Any]], abi_data)
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Chainlink ABI file not found: {abi_path}") from e
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in ABI file: {abi_path}") from e
    
    def _load_multicall_abi(self) -> List[Dict[str, Any]]:
        """Load Multicall3 ABI (simplified for our needs) with proper typing"""
        multicall_abi: List[Dict[str, Any]] = [
            {
                "inputs": [
                    {
                        "components": [
                            {"name": "target", "type": "address"},
                            {"name": "callData", "type": "bytes"}
                        ],
                        "name": "calls",
                        "type": "tuple[]"
                    }
                ],
                "name": "aggregate",
                "outputs": [
                    {"name": "blockNumber", "type": "uint256"},
                    {"name": "returnData", "type": "bytes[]"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        return multicall_abi
    
    async def _load_feeds(self) -> None:
        """Load feed metadata from CSV file with comprehensive validation"""
        csv_path: str = os.path.join('/app', 'avalanche_chainlink_feeds.csv')
        
        try:
            self.feeds = []
            with open(csv_path, 'r') as file:
                reader = csv.DictReader(file)
                for row_index, raw_row in enumerate(reader):
                    try:
                        # Validate row data and convert types
                        row: FeedMetadataDict = self._validate_csv_row(raw_row, row_index)
                        
                        # Create symbol from name (remove spaces and special chars)
                        symbol: SymbolStr = validate_symbol(
                            row['name'].replace(' / ', '').replace(' ', '').upper()
                        )
                        
                        # Validate addresses
                        if not is_valid_address(row['contract_address']):
                            raise ValueError(f"Invalid contract address: {row['contract_address']}")
                        if not is_valid_address(row['proxy_address']):
                            raise ValueError(f"Invalid proxy address: {row['proxy_address']}")
                        
                        # Create validated FeedMetadata instance
                        feed = FeedMetadata(
                            name=row['name'],
                            symbol=symbol,
                            contractAddress=Address(row['contract_address']),
                            proxyAddress=Address(row['proxy_address']), 
                            decimals=Decimals(row['decimals']),
                            deviationThreshold=row['deviation_threshold'],
                            heartbeat=Heartbeat(row['heartbeat']),
                            assetClass=row['asset_class'],
                            productName=row['product_name'],
                            baseAsset=row['base_asset'],
                            quoteAsset=row['quote_asset']
                        )
                        self.feeds.append(feed)
                        
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Skipping invalid feed data at row {row_index + 1}: {e}")
                        continue
                        
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Feed data file not found: {csv_path}") from e
    
    def _validate_csv_row(self, raw_row: Dict[str, str], row_index: int) -> FeedMetadataDict:
        """Validate and convert CSV row data with proper typing"""
        required_fields = [
            'name', 'contract_address', 'proxy_address', 'decimals', 
            'deviation_threshold', 'heartbeat', 'asset_class', 'product_name',
            'base_asset', 'quote_asset'
        ]
        
        # Check for missing fields
        missing_fields = [field for field in required_fields if not raw_row.get(field)]
        if missing_fields:
            raise ValueError(f"Missing required fields: {missing_fields}")
        
        # Convert and validate types
        validated_row: FeedMetadataDict = {}
        for field, value in raw_row.items():
            if field in CSV_FIELD_TYPES:
                try:
                    converted_value = CSV_FIELD_TYPES[field](value)
                    validated_row[field] = converted_value  # type: ignore
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Invalid {field} value '{value}': {e}") from e
            else:
                validated_row[field] = value.strip()  # type: ignore
        
        return validated_row
    
    def get_feeds(self) -> List[FeedMetadata]:
        """Get all feed metadata"""
        return self.feeds
    
    def get_feed(self, symbol: str) -> Optional[FeedMetadata]:
        """Get specific feed by symbol"""
        symbol_clean = symbol.replace(' / ', '').replace(' ', '').upper()
        for feed in self.feeds:
            if (feed.symbol == symbol_clean or 
                feed.name.replace(' / ', '').replace(' ', '').upper() == symbol_clean or
                feed.name == symbol):
                return feed
        return None
    
    def get_prices(self) -> List[PriceData]:
        """Get all cached prices"""
        return self.prices
    
    def get_price(self, symbol: str) -> Optional[PriceData]:
        """Get specific price by symbol"""
        symbol_clean = symbol.replace(' / ', '').replace(' ', '').upper()
        for price in self.prices:
            if (price.symbol == symbol_clean or 
                price.symbol.replace(' / ', '').replace(' ', '').upper() == symbol_clean):
                return price
        return None
    
    async def get_network_info(self) -> Dict[str, Any]:
        """Get current network information"""
        block_number = self.w3.eth.block_number
        return {
            "chainId": self.CHAIN_ID,
            "blockNumber": str(block_number),
            "connected": self.w3.is_connected()
        }
    
    async def refresh_prices(self) -> Dict[str, Any]:
        """Refresh all prices using Multicall3"""
        if self.refresh_in_progress:
            raise Exception("Price refresh already in progress")
        
        self.refresh_in_progress = True
        start_time = time.time()
        
        try:
            # Prepare multicall data for latestRoundData
            calls = []
            for feed in self.feeds:
                contract = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(feed.proxyAddress),
                    abi=self.chainlink_abi
                )
                # Use function selector for latestRoundData() - no parameters
                call_data = self.w3.keccak(text='latestRoundData()')[:4]
                calls.append((self.w3.to_checksum_address(feed.proxyAddress), call_data))
            
            # Execute multicall
            block_number, return_data = self.multicall_contract.functions.aggregate(calls).call()
            
            # Process results
            new_prices = []
            errors = []
            
            for i, (feed, data) in enumerate(zip(self.feeds, return_data)):
                try:
                    # Decode the returned data using web3 codec for latestRoundData return types
                    output_types = ['uint80', 'int256', 'uint256', 'uint256', 'uint80']
                    decoded = self.w3.codec.decode(output_types, data)
                    round_id, answer, started_at, updated_at, answered_in_round = decoded
                    
                    # Convert to human-readable price
                    price = float(answer) / (10 ** feed.decimals)
                    
                    # Create price data
                    price_data = PriceData(
                        symbol=feed.symbol,
                        price=price,
                        decimals=feed.decimals,
                        roundId=str(round_id),
                        updatedAt=datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat(),
                        proxyAddress=feed.proxyAddress,
                        raw=RawPriceData(
                            answer=str(answer),
                            startedAt=str(started_at),
                            updatedAt=str(updated_at),
                            answeredInRound=str(answered_in_round)
                        )
                    )
                    new_prices.append(price_data)
                    
                except Exception as e:
                    errors.append({
                        "symbol": feed.symbol,
                        "error": str(e)
                    })
            
            # Update prices and refresh time
            self.prices = new_prices
            self.last_refresh_time = datetime.now(tz=timezone.utc).isoformat()
            
            duration = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            return {
                "successful": len(new_prices),
                "errors": errors,
                "duration": duration,
                "blockNumber": str(block_number)
            }
            
        finally:
            self.refresh_in_progress = False
    
    async def get_round_data(self, symbol: str, round_id: str) -> Optional[Dict[str, Any]]:
        """Get historical round data for specific feed"""
        feed = self.get_feed(symbol)
        if not feed:
            return None
        
        try:
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(feed.proxyAddress),
                abi=self.chainlink_abi
            )
            
            round_data = contract.functions.getRoundData(int(round_id)).call()
            round_id_ret, answer, started_at, updated_at, answered_in_round = round_data
            
            price = float(answer) / (10 ** feed.decimals)
            
            return {
                "roundId": str(round_id_ret),
                "answer": str(answer),
                "startedAt": str(started_at),
                "updatedAt": str(updated_at),
                "answeredInRound": str(answered_in_round),
                "price": price,
                "decimals": feed.decimals,
                "symbol": feed.symbol,
                "timestamp": datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat()
            }
            
        except Exception:
            return None
    
    async def get_feed_description(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get feed description from smart contract"""
        feed = self.get_feed(symbol)
        if not feed:
            return None
        
        try:
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(feed.proxyAddress),
                abi=self.chainlink_abi
            )
            
            description = contract.functions.description().call()
            
            return {
                "symbol": feed.symbol,
                "description": description,
                "proxyAddress": feed.proxyAddress
            }
            
        except Exception:
            return None
    
    async def get_feed_version(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get feed version from smart contract"""
        feed = self.get_feed(symbol)
        if not feed:
            return None
        
        try:
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(feed.proxyAddress),
                abi=self.chainlink_abi
            )
            
            version = contract.functions.version().call()
            
            return {
                "symbol": feed.symbol,
                "version": str(version),
                "proxyAddress": feed.proxyAddress
            }
            
        except Exception:
            return None
    
    async def get_feed_decimals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get feed decimals from smart contract"""
        feed = self.get_feed(symbol)
        if not feed:
            return None
        
        try:
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(feed.proxyAddress),
                abi=self.chainlink_abi
            )
            
            decimals = contract.functions.decimals().call()
            
            return {
                "symbol": feed.symbol,
                "decimals": decimals,
                "proxyAddress": feed.proxyAddress
            }
            
        except Exception:
            return None
    
    def _get_proof_of_reserve_feeds(self) -> List[FeedMetadata]:
        """Get all Proof of Reserve feeds"""
        return [feed for feed in self.feeds if feed.productName == "Proof of Reserve"]
    
    async def get_proof_of_reserve_data(self) -> List[Dict[str, Any]]:
        """Get all Proof of Reserve data"""
        por_feeds = self._get_proof_of_reserve_feeds()
        if not por_feeds:
            return []
        
        # Prepare multicall for all PoR feeds
        calls = []
        for feed in por_feeds:
            contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(feed.proxyAddress),
                abi=self.chainlink_abi
            )
            # Use function selector for latestRoundData() - no parameters
            call_data = self.w3.keccak(text='latestRoundData()')[:4]
            calls.append((self.w3.to_checksum_address(feed.proxyAddress), call_data))
        
        try:
            # Execute multicall
            block_number, return_data = self.multicall_contract.functions.aggregate(calls).call()
            
            por_data = []
            for feed, data in zip(por_feeds, return_data):
                try:
                    # Decode using web3 codec for latestRoundData return types
                    output_types = ['uint80', 'int256', 'uint256', 'uint256', 'uint80']
                    decoded = self.w3.codec.decode(output_types, data)
                    round_id, answer, started_at, updated_at, answered_in_round = decoded
                    
                    # Calculate reserves amount
                    total_reserves = float(answer) / (10 ** feed.decimals)
                    
                    # Extract asset name from feed name
                    asset = feed.baseAsset
                    
                    por_entry = {
                        "symbol": feed.symbol,
                        "asset": asset,
                        "totalReserves": total_reserves,
                        "decimals": feed.decimals,
                        "rawReserves": str(answer),
                        "updatedAt": datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat(),
                        "roundId": str(round_id),
                        "proxyAddress": feed.proxyAddress,
                        "description": feed.name
                    }
                    
                    por_data.append(por_entry)
                    
                except Exception as e:
                    print(f"Error processing PoR feed {feed.symbol}: {e}")
                    continue
            
            return por_data
            
        except Exception as e:
            print(f"Error fetching PoR data: {e}")
            return []
    
    async def get_reserves_snapshot(self) -> Dict[str, Any]:
        """Get complete Proof of Reserve snapshot"""
        por_data = await self.get_proof_of_reserve_data()
        network_info = await self.get_network_info()
        
        # Calculate summary statistics
        total_assets = len(por_data)
        last_updated = max([entry["updatedAt"] for entry in por_data]) if por_data else None
        
        return {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "blockNumber": network_info["blockNumber"],
            "totalReserves": por_data,
            "summary": {
                "totalAssets": total_assets,
                "lastUpdated": last_updated
            }
        }
    
    async def get_proof_of_reserve_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get Proof of Reserve data for specific asset"""
        por_data = await self.get_proof_of_reserve_data()
        
        symbol_clean = symbol.replace(' / ', '').replace(' ', '').upper()
        
        for entry in por_data:
            if (entry["symbol"] == symbol_clean or 
                entry["asset"].replace('.', '').upper() == symbol_clean or
                entry["asset"].upper() == symbol.upper()):
                return entry
        
        return None