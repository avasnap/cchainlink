"""
Avalanche Chainlink Price Feeds API - Python/FastAPI Implementation
Provides comprehensive access to all Chainlink price feeds on Avalanche C-Chain
"""

import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from price_service import PriceService
from models import (
    ApiResponse, ErrorResponse, HealthCheck, FeedMetadata, PriceData,
    PriceRefreshResponse, RoundData, FeedDescription, FeedVersion, 
    FeedDecimals, ProofOfReserveData, ReservesSnapshot
)

# Global price service instance
price_service: PriceService = None
app_start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application lifecycle"""
    global price_service
    
    # Startup
    try:
        price_service = PriceService()
        await price_service.initialize()
        print("✅ Avalanche Chainlink API initialized successfully")
        print(f"📊 Loaded {len(price_service.get_feeds())} feeds")
        
        # Initial price refresh
        print("🔄 Performing initial price refresh...")
        result = await price_service.refresh_prices()
        print(f"✅ Refreshed {result['successful']} feeds in {result['duration']:.2f}ms")
        
    except Exception as e:
        print(f"❌ Failed to initialize API: {e}")
        raise
    
    yield
    
    # Cleanup
    print("🛑 Shutting down Avalanche Chainlink API...")

# Create FastAPI app with lifecycle management
app = FastAPI(
    title="Avalanche Chainlink Price Feeds API",
    description="Comprehensive API for accessing all Chainlink price feeds on Avalanche C-Chain",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error={
                "code": "INTERNAL_ERROR",
                "message": str(exc)
            },
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        ).dict()
    )

# Health check endpoint
@app.get("/health", response_model=HealthCheck, tags=["Health"])
async def health_check():
    """Get API health status"""
    network_info = await price_service.get_network_info()
    feeds = price_service.get_feeds()
    prices = price_service.get_prices()
    
    return HealthCheck(
        status="healthy" if len(prices) > 0 else "unhealthy",
        version="1.0.0",
        uptime=time.time() - app_start_time,
        avalanche={
            "chainId": 43114,
            "blockNumber": network_info["blockNumber"],
            "connected": True
        },
        feeds={
            "total": len(feeds),
            "withPrices": len(prices),
            "lastRefresh": price_service.last_refresh_time
        }
    )

# Feed endpoints
@app.get("/feeds", response_model=ApiResponse, tags=["Feeds"])
async def get_all_feeds():
    """Get all available Chainlink feeds metadata"""
    feeds = price_service.get_feeds()
    
    return ApiResponse(
        success=True,
        data=[feed.dict() for feed in feeds],
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

@app.get("/feeds/{symbol}", response_model=ApiResponse, tags=["Feeds"])
async def get_feed_by_symbol(symbol: str):
    """Get specific feed metadata by symbol"""
    feed = price_service.get_feed(symbol)
    
    if not feed:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "FEED_NOT_FOUND",
                    "message": f"Feed with symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=feed.dict(),
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

@app.get("/feeds/{symbol}/description", response_model=ApiResponse, tags=["Feeds"])
async def get_feed_description(symbol: str):
    """Get feed description from smart contract"""
    description = await price_service.get_feed_description(symbol)
    
    if not description:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "FEED_NOT_FOUND", 
                    "message": f"Feed with symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=description,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

@app.get("/feeds/{symbol}/version", response_model=ApiResponse, tags=["Feeds"])
async def get_feed_version(symbol: str):
    """Get feed version from smart contract"""
    version = await price_service.get_feed_version(symbol)
    
    if not version:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "FEED_NOT_FOUND",
                    "message": f"Feed with symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=version,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

@app.get("/feeds/{symbol}/decimals", response_model=ApiResponse, tags=["Feeds"])
async def get_feed_decimals(symbol: str):
    """Get feed decimals from smart contract"""
    decimals = await price_service.get_feed_decimals(symbol)
    
    if not decimals:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "FEED_NOT_FOUND",
                    "message": f"Feed with symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=decimals,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

# Price endpoints
@app.get("/prices", response_model=ApiResponse, tags=["Prices"])
async def get_all_prices():
    """Get all current prices via Multicall3"""
    prices = price_service.get_prices()
    network_info = await price_service.get_network_info()
    
    if len(prices) == 0:
        # Try to refresh if no prices available
        await price_service.refresh_prices()
        refreshed_prices = price_service.get_prices()
        
        return ApiResponse(
            success=True,
            data=[price.dict() for price in refreshed_prices],
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            blockNumber=network_info["blockNumber"]
        )
    
    return ApiResponse(
        success=True,
        data=[price.dict() for price in prices],
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        blockNumber=network_info["blockNumber"]
    )

@app.get("/prices/{symbol}", response_model=ApiResponse, tags=["Prices"])
async def get_price_by_symbol(symbol: str):
    """Get current price for specific feed"""
    price = price_service.get_price(symbol)
    
    if not price:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "PRICE_NOT_FOUND",
                    "message": f"Price for symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=price.dict(),
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

@app.post("/prices/refresh", response_model=ApiResponse, tags=["Prices"])
async def refresh_all_prices():
    """Manually refresh all feed prices"""
    try:
        result = await price_service.refresh_prices()
        
        refresh_response = PriceRefreshResponse(
            refreshed=True,
            totalFeeds=len(price_service.get_feeds()),
            successfulFeeds=result["successful"],
            errors=result["errors"],
            duration=result["duration"],
            blockNumber=result["blockNumber"]
        )
        
        return ApiResponse(
            success=True,
            data=refresh_response.dict(),
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            blockNumber=result["blockNumber"]
        )
        
    except Exception as e:
        if "already in progress" in str(e):
            raise HTTPException(
                status_code=409,
                detail={
                    "success": False,
                    "error": {
                        "code": "REFRESH_IN_PROGRESS",
                        "message": "Price refresh already in progress"
                    },
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                }
            )
        raise

@app.get("/prices/reserves", response_model=ApiResponse, tags=["Prices"])
async def get_all_reserves():
    """Get all Proof of Reserve data"""
    reserves_snapshot = await price_service.get_reserves_snapshot()
    
    return ApiResponse(
        success=True,
        data=reserves_snapshot,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        blockNumber=reserves_snapshot["blockNumber"]
    )

@app.get("/prices/reserves/{symbol}", response_model=ApiResponse, tags=["Prices"])
async def get_reserve_by_symbol(symbol: str):
    """Get Proof of Reserve data for specific asset"""
    reserve = await price_service.get_proof_of_reserve_by_symbol(symbol)
    
    if not reserve:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "RESERVE_NOT_FOUND",
                    "message": f"Proof of Reserve data for symbol '{symbol}' not found"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=reserve,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

# Round data endpoints
@app.get("/feeds/{symbol}/rounds/{round_id}", response_model=ApiResponse, tags=["Rounds"])
async def get_round_data(symbol: str, round_id: str):
    """Get historical round data for specific feed"""
    round_data = await price_service.get_round_data(symbol, round_id)
    
    if not round_data:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": {
                    "code": "ROUND_NOT_FOUND",
                    "message": f"Round {round_id} not found for symbol '{symbol}'"
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        )
    
    return ApiResponse(
        success=True,
        data=round_data,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )