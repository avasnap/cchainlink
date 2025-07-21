"""
Pydantic models for Avalanche Chainlink API
These models match the TypeScript types exactly to ensure API compatibility
"""

from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field, validator, ValidationError
from datetime import datetime
import re


class FeedMetadata(BaseModel):
    name: str
    symbol: str
    contractAddress: str = Field(alias="contract_address")
    proxyAddress: str = Field(alias="proxy_address")
    decimals: int
    deviationThreshold: float = Field(alias="deviation_threshold")
    heartbeat: int
    assetClass: str = Field(alias="asset_class")
    productName: str = Field(alias="product_name")
    baseAsset: str = Field(alias="base_asset")
    quoteAsset: str = Field(alias="quote_asset")

    @validator('contractAddress', 'proxyAddress')
    def validate_ethereum_address(cls, v):
        """Validate Ethereum address format"""
        if not isinstance(v, str):
            raise ValueError('Address must be a string')
        if len(v) != 42:
            raise ValueError('Address must be 42 characters long')
        if not v.startswith('0x'):
            raise ValueError('Address must start with 0x')
        if not re.match(r'^0x[a-fA-F0-9]{40}$', v):
            raise ValueError('Address must contain only hexadecimal characters')
        return v.lower()
    
    @validator('decimals')
    def validate_decimals(cls, v):
        """Validate decimals range"""
        if not 0 <= v <= 18:
            raise ValueError('Decimals must be between 0 and 18')
        return v
    
    @validator('heartbeat')
    def validate_heartbeat(cls, v):
        """Validate heartbeat is positive"""
        if v <= 0:
            raise ValueError('Heartbeat must be positive')
        return v
    
    @validator('symbol')
    def validate_symbol(cls, v):
        """Validate symbol format"""
        if not v or not isinstance(v, str):
            raise ValueError('Symbol must be a non-empty string')
        return v.strip().upper()

    class Config:
        populate_by_name = True


class RawPriceData(BaseModel):
    answer: str
    startedAt: str
    updatedAt: str
    answeredInRound: str


class PriceData(BaseModel):
    symbol: str
    price: float
    decimals: int
    roundId: str
    updatedAt: str
    proxyAddress: str
    raw: RawPriceData


class ApiResponse(BaseModel):
    success: bool
    data: Union[
        List[FeedMetadata],
        FeedMetadata,
        List[PriceData],
        PriceData,
        dict,
        List[dict]
    ]
    timestamp: str
    blockNumber: Optional[str] = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: dict
    timestamp: str


class HealthCheck(BaseModel):
    status: Literal["healthy", "unhealthy"]
    version: str
    uptime: float
    avalanche: dict
    feeds: dict


class PriceRefreshResponse(BaseModel):
    refreshed: bool
    totalFeeds: int
    successfulFeeds: int
    errors: List[dict]
    duration: float
    blockNumber: str


class RoundData(BaseModel):
    roundId: str
    answer: str
    startedAt: str
    updatedAt: str
    answeredInRound: str
    price: float
    decimals: int
    symbol: str
    timestamp: str


class FeedDescription(BaseModel):
    symbol: str
    description: str
    proxyAddress: str


class FeedVersion(BaseModel):
    symbol: str
    version: str
    proxyAddress: str


class FeedDecimals(BaseModel):
    symbol: str
    decimals: int
    proxyAddress: str


class ProofOfReserveData(BaseModel):
    symbol: str
    asset: str
    totalReserves: float
    decimals: int
    rawReserves: str
    updatedAt: str
    roundId: str
    proxyAddress: str
    backingRatio: Optional[float] = None
    description: str


class ReservesSnapshot(BaseModel):
    timestamp: str
    blockNumber: str
    totalReserves: List[ProofOfReserveData]
    summary: dict