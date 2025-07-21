# Refresh Avalanche Chainlink Feeds

Update the Avalanche Chainlink feeds dataset by checking for new feeds on the official Chainlink data feeds website.

## Process Overview

This command automates the process of:
1. Downloading the latest feed data from https://data.chain.link/feeds
2. Extracting the embedded JSON data containing all feed information
3. Filtering for Avalanche C-Chain feeds (Chain ID: 43114)
4. Comparing with existing dataset to identify new feeds
5. Updating the CSV file with any new feeds found
6. Testing the updated dataset with Multicall3

## Step-by-Step Process

### 1. Download Latest Feed Data
```bash
# Download the current feeds page
curl -s "https://data.chain.link/feeds" -o chainlink_feeds_new.html
```

### 2. Extract JSON Data
```javascript
// Extract __NEXT_DATA__ from the HTML
const fs = require('fs');
const html = fs.readFileSync('./chainlink_feeds_new.html', 'utf8');

// Find the __NEXT_DATA__ script tag
const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
if (!scriptMatch) {
    throw new Error('Could not find __NEXT_DATA__ in HTML');
}

const nextData = JSON.parse(scriptMatch[1]);
const allFeeds = nextData.props.pageProps.allFeeds;

// Save extracted data
fs.writeFileSync('./feeds_data_new.json', JSON.stringify(nextData, null, 2));
```

### 3. Filter Avalanche Feeds
```javascript
// Filter for Avalanche C-Chain feeds (Chain ID: 43114)
const avalancheFeeds = allFeeds.filter(feed => {
    return feed.docs && feed.docs.some(doc => 
        doc.networks && doc.networks.some(network => 
            network.name === "Avalanche Mainnet" && 
            network.chainId === "43114"
        )
    );
});

console.log(`Found ${avalancheFeeds.length} Avalanche feeds`);
```

### 4. Compare with Existing Dataset
```javascript
const csv = require('csv-parser');
const existingFeeds = new Set();

// Load existing feed proxy addresses
fs.createReadStream('./avalanche_chainlink_feeds.csv')
  .pipe(csv())
  .on('data', (row) => {
    existingFeeds.add(row.proxy_address.toLowerCase());
  })
  .on('end', () => {
    // Check for new feeds
    const newFeeds = avalancheFeeds.filter(feed => {
        const proxyAddress = getProxyAddress(feed).toLowerCase();
        return !existingFeeds.has(proxyAddress);
    });
    
    if (newFeeds.length > 0) {
        console.log(`🆕 Found ${newFeeds.length} new feeds!`);
        newFeeds.forEach(feed => {
            console.log(`- ${feed.feedName}`);
        });
    } else {
        console.log('✅ No new feeds found - dataset is up to date');
    }
  });
```

### 5. Extract Feed Information
For each new feed found, extract:
```javascript
function extractFeedInfo(feed) {
    const network = feed.docs[0].networks.find(n => n.chainId === "43114");
    
    return {
        name: feed.feedName,
        contract_address: network.contractAddress,
        proxy_address: network.proxyAddress,
        deviation_threshold: feed.threshold || 0,
        heartbeat: feed.heartbeat || 86400,
        decimals: feed.decimals || 8,
        asset_class: feed.assetClass || 'Unknown',
        product_name: feed.productName || '',
        ens: feed.ens || '',
        path: feed.path || '',
        base_asset: feed.baseAsset || '',
        quote_asset: feed.quoteAsset || ''
    };
}
```

### 6. Update CSV File
```javascript
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
    path: './avalanche_chainlink_feeds_updated.csv',
    header: [
        {id: 'name', title: 'name'},
        {id: 'contract_address', title: 'contract_address'},
        {id: 'proxy_address', title: 'proxy_address'},
        {id: 'deviation_threshold', title: 'deviation_threshold'},
        {id: 'heartbeat', title: 'heartbeat'},
        {id: 'decimals', title: 'decimals'},
        {id: 'asset_class', title: 'asset_class'},
        {id: 'product_name', title: 'product_name'},
        {id: 'ens', title: 'ens'},
        {id: 'path', title: 'path'},
        {id: 'base_asset', title: 'base_asset'},
        {id: 'quote_asset', title: 'quote_asset'}
    ]
});

// Combine existing + new feeds and write
const allFeedsData = [...existingFeedsData, ...newFeedsData];
await csvWriter.writeRecords(allFeedsData);
```

### 7. Test Updated Dataset
```bash
# Test that all feeds work with Multicall3
npm run prices

# Verify the count matches
echo "Expected feeds: $(wc -l < avalanche_chainlink_feeds_updated.csv)"
echo "Feeds tested: $(grep '📈' output.log | wc -l)"
```

### 8. Update Documentation
```javascript
// Update README.md with new feed count
const feedCount = allFeedsData.length;
const priceFeeds = allFeedsData.filter(f => f.asset_class === 'Crypto' || f.asset_class === 'Fiat' || f.asset_class === 'Commodity').length;
const porFeeds = allFeedsData.filter(f => f.asset_class === 'Proof of Reserve').length;
const otherFeeds = feedCount - priceFeeds - porFeeds;

console.log(`Update README.md:`);
console.log(`- **${feedCount} Total Feeds** on Avalanche C-Chain mainnet`);
console.log(`- **${priceFeeds} Price Feeds**`);
console.log(`- **${porFeeds} Proof of Reserve Feeds**`);
if (otherFeeds > 0) console.log(`- **${otherFeeds} Other Feeds**`);
```

## Automation Script

Create `scripts/refresh-feeds.js`:
```javascript
#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');

async function refreshFeeds() {
    console.log('🔄 Checking for new Avalanche Chainlink feeds...');
    
    // 1. Download latest data
    await downloadFeedsData();
    
    // 2. Extract and process
    const newFeeds = await extractAvalancheFeeds();
    
    // 3. Compare with existing
    const updatedFeeds = await compareAndUpdate(newFeeds);
    
    // 4. Test if changes were made
    if (updatedFeeds.hasChanges) {
        await testDataset();
        console.log('✅ Dataset updated and tested successfully!');
    } else {
        console.log('✅ No changes needed - dataset is current');
    }
}

if (require.main === module) {
    refreshFeeds().catch(console.error);
}
```

## Usage

```bash
# Manual refresh
node scripts/refresh-feeds.js

# Or use as Claude command
/refresh
```

## Expected Output

```
🔄 Checking for new Avalanche Chainlink feeds...
📥 Downloaded latest feed data (1.7MB)
🔍 Found 73 Avalanche feeds in data
📊 Comparing with existing dataset...
✅ No new feeds found - dataset is up to date

OR

🔄 Checking for new Avalanche Chainlink feeds...
📥 Downloaded latest feed data (1.8MB)  
🔍 Found 75 Avalanche feeds in data
📊 Comparing with existing dataset...
🆕 Found 2 new feeds!
- SOL / USD
- DOGE / USD
💾 Updated CSV with 75 total feeds
🧪 Testing updated dataset...
✅ All 75 feeds working via Multicall3
📝 README.md updated with new feed count
✅ Dataset updated and tested successfully!
```

## Files Updated

- `chainlink_feeds_new.html` - Latest downloaded data
- `feeds_data_new.json` - Extracted JSON data  
- `avalanche_chainlink_feeds.csv` - Updated with new feeds
- `README.md` - Updated feed counts and examples
- `package.json` - Version bump if feeds added

## Frequency

- **Manual**: Run when Chainlink announces new feeds
- **Automated**: Could be scheduled weekly/monthly
- **Triggered**: Run before major releases or when feed issues reported

This process ensures the Avalanche Chainlink feeds dataset stays current and comprehensive.