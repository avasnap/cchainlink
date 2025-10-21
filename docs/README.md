# Avalanche Chainlink Price Feeds - Live Dashboard

This is a live dashboard that displays all 73 Chainlink price feeds on Avalanche.

## Features

- **Live On-Chain Data**: Fetches prices directly from Avalanche blockchain using Multicall3
- **Auto-Refresh**: Updates every 5 seconds
- **Search & Filter**: Filter by asset class (Crypto, Fiat, Commodity, Proof of Reserve)
- **Beautiful UI**: Clean, responsive design
- **No Backend Required**: Pure client-side HTML/JS

## View Live

This page is served via GitHub Pages and can be accessed at the repository's GitHub Pages URL.

## Technical Details

- Uses ethers.js v6 to interact with Avalanche blockchain
- Fetches all 73 feeds in a single multicall transaction for efficiency
- Displays real-time prices with automatic formatting
- Shows block number, last update time, and feed metadata

## Local Development

Simply open `index.html` in a web browser. No build process or server required.
