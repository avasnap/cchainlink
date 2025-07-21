"""
Comprehensive Type Definitions for Avalanche Chainlink API
Provides strict typing for all data structures and function signatures
"""

from __future__ import annotations
from typing import Dict, List, Optional, Union, Any, TypedDict, Protocol, runtime_checkable
from enum import Enum
from datetime import datetime
from decimal import Decimal

# Blockchain Types
class ChainId(int):
    """Type-safe chain ID (43114 for Avalanche C-Chain)"""
    def __new__(cls, value: int) -> ChainId:
        if value != 43114:
            raise ValueError(f"Invalid chain ID {value}, expected 43114 for Avalanche C-Chain")
        return super().__new__(cls, value)

class Address(str):
    """Type-safe Ethereum address"""
    def __new__(cls, value: str) -> Address:
        if not isinstance(value, str) or len(value) != 42 or not value.startswith('0x'):
            raise ValueError(f"Invalid address format: {value}")
        return super().__new__(cls, value.lower())

class BlockNumber(int):
    """Type-safe block number"""
    def __new__(cls, value: int) -> BlockNumber:
        if value < 0:
            raise ValueError(f"Block number must be non-negative, got {value}")
        return super().__new__(cls, value)

# Chainlink Types
class RoundId(str):
    """Type-safe round ID from Chainlink feeds"""
    pass

class Decimals(int):
    """Type-safe decimals count (0-18)"""
    def __new__(cls, value: int) -> Decimals:
        if not 0 <= value <= 18:
            raise ValueError(f"Decimals must be between 0 and 18, got {value}")
        return super().__new__(cls, value)

class Heartbeat(int):
    """Type-safe heartbeat in seconds"""
    def __new__(cls, value: int) -> Heartbeat:
        if value <= 0:
            raise ValueError(f"Heartbeat must be positive, got {value}")
        return super().__new__(cls, value)

# Enums for better type safety
class AssetClass(str, Enum):
    """Supported asset classes"""
    CRYPTO = "Crypto"
    COMMODITIES = "Commodities"
    FX = "FX"
    RATES = "Rates"

class ProductType(str, Enum):
    """Chainlink product types"""
    PRICE_FEED = "Price Feed"
    PROOF_OF_RESERVE = "Proof of Reserve"
    EMERGENCY_COUNT = "Emergency Count"

class ApiStatus(str, Enum):
    """API health status"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"

# Feed Metadata Types
class FeedMetadataDict(TypedDict):
    """TypedDict for feed metadata from CSV"""
    name: str
    contract_address: str
    proxy_address: str
    deviation_threshold: float
    heartbeat: int
    decimals: int
    asset_class: str
    product_name: str
    base_asset: str
    quote_asset: str

# Raw blockchain response types
class RawRoundDataDict(TypedDict):
    """Raw round data from blockchain"""
    roundId: str
    answer: str
    startedAt: str
    updatedAt: str
    answeredInRound: str

class MulticallResult(TypedDict):
    """Multicall3 aggregation result"""
    blockNumber: int
    returnData: List[bytes]

# Price and round data types
class PriceValue(float):
    """Type-safe price value"""
    def __new__(cls, value: Union[float, int, str, Decimal]) -> PriceValue:
        price = float(value)
        if price < 0:
            raise ValueError(f"Price cannot be negative: {price}")
        return super().__new__(cls, price)

class TimestampStr(str):
    """ISO 8601 timestamp string"""
    def __new__(cls, value: Union[str, datetime]) -> TimestampStr:
        if isinstance(value, datetime):
            return super().__new__(cls, value.isoformat())
        # Validate ISO format
        try:
            datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError(f"Invalid timestamp format: {value}")
        return super().__new__(cls, value)

# Protocol definitions for better interface typing
@runtime_checkable
class Web3ContractProtocol(Protocol):
    """Protocol for Web3 contract interface"""
    def functions(self) -> Any: ...
    def decode_function_result(self, function_name: str, data: bytes) -> tuple: ...

@runtime_checkable
class MulticallContractProtocol(Protocol):
    """Protocol for Multicall3 contract interface"""
    def functions(self) -> Any: ...

# Network information
class NetworkInfo(TypedDict):
    """Network connection information"""
    chainId: ChainId
    blockNumber: str
    connected: bool

# Error types
class ErrorCode(str, Enum):
    """Standardized error codes"""
    FEED_NOT_FOUND = "FEED_NOT_FOUND"
    PRICE_NOT_FOUND = "PRICE_NOT_FOUND"
    ROUND_NOT_FOUND = "ROUND_NOT_FOUND"
    RESERVE_NOT_FOUND = "RESERVE_NOT_FOUND"
    BLOCKCHAIN_ERROR = "BLOCKCHAIN_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"

class ErrorDetail(TypedDict):
    """Error detail structure"""
    code: ErrorCode
    message: str

# Service result types
class RefreshResult(TypedDict):
    """Result from price refresh operation"""
    successful: int
    errors: List[Dict[str, str]]
    duration: float
    blockNumber: str

# Validation helpers
def validate_symbol(symbol: str) -> str:
    """Validate and normalize symbol"""
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol must be a non-empty string")
    return symbol.strip().upper()

def validate_round_id(round_id: Union[str, int]) -> RoundId:
    """Validate and convert round ID"""
    if isinstance(round_id, int):
        if round_id < 0:
            raise ValueError(f"Round ID must be non-negative: {round_id}")
        return RoundId(str(round_id))
    elif isinstance(round_id, str):
        try:
            int(round_id)  # Validate it's a number
            return RoundId(round_id)
        except ValueError:
            raise ValueError(f"Round ID must be a valid number: {round_id}")
    else:
        raise ValueError(f"Round ID must be string or int: {type(round_id)}")

# Type aliases for complex types
SymbolStr = str
ContractCall = tuple[Address, bytes]
FeedDataList = List[Dict[str, Any]]
PriceDataList = List[Dict[str, Any]]
ReserveDataList = List[Dict[str, Any]]

# Union types for API responses
ApiResponseData = Union[
    Dict[str, Any],
    List[Dict[str, Any]],
    str,
    int,
    float,
    bool
]

# Generic response wrapper
class ApiResponseDict(TypedDict, total=False):
    """Generic API response structure"""
    success: bool
    data: ApiResponseData
    timestamp: TimestampStr
    blockNumber: Optional[str]
    error: Optional[ErrorDetail]

# Type guards for runtime type checking
def is_valid_address(value: Any) -> bool:
    """Type guard for valid Ethereum address"""
    return (
        isinstance(value, str) and
        len(value) == 42 and
        value.startswith('0x') and
        all(c in '0123456789abcdefABCDEF' for c in value[2:])
    )

def is_valid_chain_id(value: Any) -> bool:
    """Type guard for valid chain ID"""
    return isinstance(value, int) and value == 43114

def is_price_value(value: Any) -> bool:
    """Type guard for valid price value"""
    try:
        float_val = float(value)
        return float_val >= 0
    except (ValueError, TypeError):
        return False

# Constants with proper typing
AVALANCHE_CHAIN_ID: ChainId = ChainId(43114)
MULTICALL3_ADDRESS: Address = Address("0xcA11bde05977b3631167028862bE2a173976CA11")
AVALANCHE_RPC_URL: str = "https://api.avax.network/ext/bc/C/rpc"

# Type mapping for CSV field conversion
CSV_FIELD_TYPES: Dict[str, type] = {
    'decimals': int,
    'heartbeat': int,
    'deviation_threshold': float,
}

# Export all types for easy importing
__all__ = [
    # Basic types
    'ChainId', 'Address', 'BlockNumber', 'RoundId', 'Decimals', 'Heartbeat',
    'PriceValue', 'TimestampStr', 'SymbolStr',
    
    # Enums
    'AssetClass', 'ProductType', 'ApiStatus', 'ErrorCode',
    
    # TypedDict definitions
    'FeedMetadataDict', 'RawRoundDataDict', 'MulticallResult', 'NetworkInfo',
    'ErrorDetail', 'RefreshResult', 'ApiResponseDict',
    
    # Protocols
    'Web3ContractProtocol', 'MulticallContractProtocol',
    
    # Type aliases
    'ContractCall', 'FeedDataList', 'PriceDataList', 'ReserveDataList',
    'ApiResponseData',
    
    # Validation functions
    'validate_symbol', 'validate_round_id',
    
    # Type guards
    'is_valid_address', 'is_valid_chain_id', 'is_price_value',
    
    # Constants
    'AVALANCHE_CHAIN_ID', 'MULTICALL3_ADDRESS', 'AVALANCHE_RPC_URL',
    'CSV_FIELD_TYPES',
]