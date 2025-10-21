#!/usr/bin/env python3
"""
Chainlink Historical Price Retrieval Demo

This script demonstrates how to retrieve historical Chainlink prices using:
1. Block numbers (requires archive node)
2. Round IDs (works with standard RPC)
3. Time-based queries

Usage:
    python historical_price_demo.py
"""

import asyncio
from web3 import Web3
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import csv

# Avalanche C-Chain RPC (you may want to use an archive node for historical data)
AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc"

# BTC/USD feed on Avalanche (from your dataset)
BTC_USD_FEED = "0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743"

# Chainlink AggregatorV3 ABI
CHAINLINK_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint80", "name": "_roundId", "type": "uint80"}],
        "name": "getRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "description",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    }
]

class ChainlinkHistoricalFetcher:
    def __init__(self, rpc_url: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        # Add POA middleware for Avalanche
        try:
            from web3.middleware import ExtraDataToPOAMiddleware
            self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        except ImportError:
            # Fallback for older web3.py versions
            try:
                from web3.middleware import geth_poa_middleware
                self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            except ImportError:
                pass
        if not self.w3.is_connected():
            raise Exception(f"Failed to connect to {rpc_url}")
        print(f"✅ Connected to Avalanche C-Chain (Block: {self.w3.eth.block_number:,})")
    
    def get_feed_info(self, feed_address: str) -> Dict[str, Any]:
        """Get basic feed information"""
        contract = self.w3.eth.contract(address=feed_address, abi=CHAINLINK_ABI)
        
        try:
            description = contract.functions.description().call()
            decimals = contract.functions.decimals().call()
            return {
                "address": feed_address,
                "description": description,
                "decimals": decimals
            }
        except Exception as e:
            print(f"❌ Error getting feed info: {e}")
            return {}
    
    def get_latest_price(self, feed_address: str) -> Dict[str, Any]:
        """Get current latest price"""
        contract = self.w3.eth.contract(address=feed_address, abi=CHAINLINK_ABI)
        
        try:
            round_id, answer, started_at, updated_at, answered_in_round = contract.functions.latestRoundData().call()
            decimals = contract.functions.decimals().call()
            
            price = answer / (10 ** decimals)
            
            return {
                "round_id": round_id,
                "price": price,
                "raw_answer": answer,
                "started_at": started_at,
                "updated_at": updated_at,
                "timestamp": datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat(),
                "answered_in_round": answered_in_round,
                "decimals": decimals
            }
        except Exception as e:
            print(f"❌ Error getting latest price: {e}")
            return {}
    
    def get_price_at_block(self, feed_address: str, block_number: int) -> Dict[str, Any]:
        """Get price at specific block number (requires archive node)"""
        contract = self.w3.eth.contract(address=feed_address, abi=CHAINLINK_ABI)
        
        try:
            # Query at specific block
            round_id, answer, started_at, updated_at, answered_in_round = contract.functions.latestRoundData().call(block_identifier=block_number)
            decimals = contract.functions.decimals().call()
            
            price = answer / (10 ** decimals)
            
            # Get block info
            block = self.w3.eth.get_block(block_number)
            
            return {
                "block_number": block_number,
                "block_timestamp": block.timestamp,
                "block_datetime": datetime.fromtimestamp(block.timestamp, tz=timezone.utc).isoformat(),
                "round_id": round_id,
                "price": price,
                "raw_answer": answer,
                "started_at": started_at,
                "updated_at": updated_at,
                "price_timestamp": datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat(),
                "answered_in_round": answered_in_round,
                "decimals": decimals
            }
        except Exception as e:
            print(f"❌ Error getting price at block {block_number}: {e}")
            # If archive node access fails, suggest alternative
            if "missing trie node" in str(e) or "header not found" in str(e):
                print("💡 This requires an archive node. Try using a historical round ID instead.")
            return {}
    
    def get_price_by_round(self, feed_address: str, round_id: int) -> Dict[str, Any]:
        """Get price for specific round ID"""
        contract = self.w3.eth.contract(address=feed_address, abi=CHAINLINK_ABI)
        
        try:
            ret_round_id, answer, started_at, updated_at, answered_in_round = contract.functions.getRoundData(round_id).call()
            decimals = contract.functions.decimals().call()
            
            price = answer / (10 ** decimals)
            
            return {
                "requested_round_id": round_id,
                "returned_round_id": ret_round_id,
                "price": price,
                "raw_answer": answer,
                "started_at": started_at,
                "updated_at": updated_at,
                "timestamp": datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat(),
                "answered_in_round": answered_in_round,
                "decimals": decimals
            }
        except Exception as e:
            print(f"❌ Error getting round {round_id}: {e}")
            return {}
    
    def get_recent_rounds(self, feed_address: str, num_rounds: int = 10) -> list:
        """Get last N rounds of data"""
        latest = self.get_latest_price(feed_address)
        if not latest:
            return []
        
        latest_round = latest["round_id"]
        rounds = []
        
        print(f"📊 Fetching last {num_rounds} rounds from round {latest_round}...")
        
        for i in range(num_rounds):
            round_id = latest_round - i
            if round_id <= 0:
                break
                
            round_data = self.get_price_by_round(feed_address, round_id)
            if round_data:
                rounds.append(round_data)
            else:
                break
        
        return rounds
    
    def load_feeds_from_csv(self, csv_path: str = "avalanche_chainlink_feeds.csv"):
        """Load feeds from the CSV file"""
        feeds = []
        try:
            with open(csv_path, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    feeds.append({
                        "name": row["name"],
                        "proxy_address": row["proxy_address"],
                        "decimals": int(row["decimals"]),
                        "asset_class": row["asset_class"]
                    })
            print(f"📋 Loaded {len(feeds)} feeds from {csv_path}")
            return feeds
        except Exception as e:
            print(f"❌ Error loading feeds: {e}")
            return []

def main():
    print("🔗 Chainlink Historical Price Retrieval Demo")
    print("=" * 50)
    
    # Initialize fetcher
    fetcher = ChainlinkHistoricalFetcher(AVALANCHE_RPC)
    
    # Get feed info
    print("\n1️⃣ Getting BTC/USD Feed Information...")
    feed_info = fetcher.get_feed_info(BTC_USD_FEED)
    print(f"   📍 Address: {feed_info.get('address', 'N/A')}")
    print(f"   📝 Description: {feed_info.get('description', 'N/A')}")
    print(f"   🔢 Decimals: {feed_info.get('decimals', 'N/A')}")
    
    # Get current price
    print("\n2️⃣ Getting Current Price...")
    current = fetcher.get_latest_price(BTC_USD_FEED)
    if current:
        print(f"   💰 Current Price: ${current['price']:,.2f}")
        print(f"   🆔 Round ID: {current['round_id']}")
        print(f"   ⏰ Updated: {current['timestamp']}")
    
    # Try historical block query (may fail without archive node)
    print("\n3️⃣ Attempting Historical Block Query...")
    current_block = fetcher.w3.eth.block_number
    historical_block = current_block - 1000  # ~1000 blocks ago
    
    print(f"   🧱 Querying block {historical_block:,} (current: {current_block:,})")
    historical = fetcher.get_price_at_block(BTC_USD_FEED, historical_block)
    if historical:
        print(f"   💰 Historical Price: ${historical['price']:,.2f}")
        print(f"   ⏰ Block Time: {historical['block_datetime']}")
        print(f"   🆔 Round ID: {historical['round_id']}")
    
    # Get historical rounds (this should work with standard RPC)
    print("\n4️⃣ Getting Historical Rounds...")
    rounds = fetcher.get_recent_rounds(BTC_USD_FEED, 5)
    
    if rounds:
        print(f"\n   📊 Last 5 Rounds of BTC/USD:")
        print("   " + "-" * 80)
        print(f"   {'Round ID':<20} {'Price':<15} {'Timestamp':<25}")
        print("   " + "-" * 80)
        
        for round_data in rounds:
            timestamp = datetime.fromisoformat(round_data['timestamp'].replace('Z', '+00:00'))
            print(f"   {round_data['returned_round_id']:<20} ${round_data['price']:<14,.2f} {timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    # Demonstrate with multiple feeds
    print("\n5️⃣ Testing Multiple Feeds...")
    feeds = fetcher.load_feeds_from_csv()
    
    if feeds:
        # Test first few price feeds
        price_feeds = [f for f in feeds if f["asset_class"] == "Crypto"][:3]
        
        for feed in price_feeds:
            print(f"\n   🔍 Testing {feed['name']}...")
            latest = fetcher.get_latest_price(feed['proxy_address'])
            if latest:
                print(f"      💰 Price: ${latest['price']:,.6f}")
                print(f"      🆔 Round: {latest['round_id']}")
    
    print("\n" + "=" * 50)
    print("✅ Demo completed!")
    print("\n💡 Key Takeaways:")
    print("   • getRoundData() works with any RPC node")
    print("   • Block-specific queries need archive nodes")
    print("   • Round IDs are sequential and reliable")
    print("   • Each feed updates independently")
    
if __name__ == "__main__":
    main()