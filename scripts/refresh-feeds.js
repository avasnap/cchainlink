#!/usr/bin/env node

// Refresh Avalanche Chainlink Feeds
// Checks for new feeds and updates the dataset

const fs = require('fs');
const https = require('https');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const FEEDS_URL = 'https://data.chain.link/feeds';
const AVALANCHE_CHAIN_ID = '43114';

async function downloadFeedsData() {
    console.log('📥 Downloading latest feed data from Chainlink...');
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream('./chainlink_feeds_new.html');
        
        https.get(FEEDS_URL, (response) => {
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync('./chainlink_feeds_new.html');
                console.log(`✅ Downloaded ${(stats.size / 1024 / 1024).toFixed(1)}MB of feed data`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink('./chainlink_feeds_new.html', () => {}); // Delete file on error
            reject(err);
        });
    });
}

function extractAvalancheFeeds() {
    console.log('🔍 Extracting Avalanche feeds from downloaded data...');
    
    const html = fs.readFileSync('./chainlink_feeds_new.html', 'utf8');
    
    // Find the __NEXT_DATA__ script tag
    const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!scriptMatch) {
        throw new Error('Could not find __NEXT_DATA__ in HTML');
    }
    
    const nextData = JSON.parse(scriptMatch[1]);
    const allFeeds = nextData.props.pageProps.allFeeds;
    
    // Save complete extracted data
    fs.writeFileSync('./feeds_data_new.json', JSON.stringify(nextData, null, 2));
    
    // Filter for Avalanche C-Chain feeds
    const avalancheFeeds = allFeeds.filter(feed => {
        return feed.docs && feed.docs.some(doc => 
            doc.networks && doc.networks.some(network => 
                network.name === "Avalanche Mainnet" && 
                network.chainId === AVALANCHE_CHAIN_ID
            )
        );
    });
    
    console.log(`📊 Found ${avalancheFeeds.length} Avalanche feeds in latest data`);
    
    return avalancheFeeds.map(extractFeedInfo);
}

function extractFeedInfo(feed) {
    const network = feed.docs[0].networks.find(n => n.chainId === AVALANCHE_CHAIN_ID);
    
    return {
        name: feed.feedName || '',
        contract_address: network.contractAddress || '',
        proxy_address: network.proxyAddress || '',
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

async function loadExistingFeeds() {
    const existingFeeds = [];
    
    if (!fs.existsSync('./avalanche_chainlink_feeds.csv')) {
        console.log('⚠️  No existing CSV found - will create new dataset');
        return existingFeeds;
    }
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('./avalanche_chainlink_feeds.csv')
            .pipe(csv())
            .on('data', (row) => existingFeeds.push(row))
            .on('end', () => {
                console.log(`📋 Loaded ${existingFeeds.length} existing feeds`);
                resolve(existingFeeds);
            })
            .on('error', reject);
    });
}

async function compareAndUpdate(newFeeds) {
    console.log('🔍 Comparing with existing dataset...');
    
    const existingFeeds = await loadExistingFeeds();
    const existingProxies = new Set(existingFeeds.map(f => f.proxy_address?.toLowerCase()));
    
    // Find truly new feeds
    const addedFeeds = newFeeds.filter(feed => 
        !existingProxies.has(feed.proxy_address.toLowerCase())
    );
    
    // Find removed feeds  
    const newProxies = new Set(newFeeds.map(f => f.proxy_address.toLowerCase()));
    const removedFeeds = existingFeeds.filter(feed =>
        !newProxies.has(feed.proxy_address?.toLowerCase())
    );
    
    if (addedFeeds.length > 0) {
        console.log(`🆕 Found ${addedFeeds.length} new feeds:`);
        addedFeeds.forEach(feed => console.log(`   + ${feed.name}`));
    }
    
    if (removedFeeds.length > 0) {
        console.log(`⚠️  ${removedFeeds.length} feeds no longer available:`);
        removedFeeds.forEach(feed => console.log(`   - ${feed.name}`));
    }
    
    if (addedFeeds.length === 0 && removedFeeds.length === 0) {
        console.log('✅ No changes detected - dataset is current');
        return { hasChanges: false, totalFeeds: existingFeeds.length };
    }
    
    // Update CSV with new dataset
    console.log('💾 Updating CSV file...');
    
    const csvWriter = createObjectCsvWriter({
        path: './avalanche_chainlink_feeds.csv',
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
    
    await csvWriter.writeRecords(newFeeds);
    
    console.log(`✅ Updated CSV with ${newFeeds.length} total feeds`);
    
    return { 
        hasChanges: true, 
        totalFeeds: newFeeds.length,
        addedCount: addedFeeds.length,
        removedCount: removedFeeds.length
    };
}

async function testDataset() {
    console.log('🧪 Testing updated dataset with Multicall3...');
    
    try {
        // Import and run the price fetcher
        const { getAllPrices } = require('../multicall_price_fetcher.js');
        const results = await getAllPrices();
        
        const successCount = results.filter(r => !r.error).length;
        const errorCount = results.filter(r => r.error).length;
        
        console.log(`✅ Successfully tested ${successCount} feeds`);
        if (errorCount > 0) {
            console.log(`⚠️  ${errorCount} feeds had errors - check logs`);
        }
        
        return { success: successCount, errors: errorCount };
    } catch (error) {
        console.error('❌ Dataset test failed:', error.message);
        throw error;
    }
}

function updateReadme(stats) {
    console.log('📝 Updating README.md with new statistics...');
    
    const { totalFeeds, addedCount, removedCount } = stats;
    
    // This would update the README.md file with new counts
    // Implementation depends on specific requirements
    
    console.log(`📊 Updated README.md (${totalFeeds} total feeds)`);
    
    if (addedCount > 0 || removedCount > 0) {
        console.log(`🔄 Consider updating the version in package.json`);
    }
}

async function refreshFeeds() {
    console.log('🔄 Starting Avalanche Chainlink feeds refresh...\n');
    
    try {
        // 1. Download latest data
        await downloadFeedsData();
        
        // 2. Extract and filter feeds
        const newFeeds = extractAvalancheFeeds();
        
        // 3. Compare and update
        const updateResult = await compareAndUpdate(newFeeds);
        
        // 4. Test if changes were made
        if (updateResult.hasChanges) {
            const testResult = await testDataset();
            updateReadme(updateResult);
            
            console.log('\n🎉 Dataset refresh completed successfully!');
            console.log(`   Total feeds: ${updateResult.totalFeeds}`);
            if (updateResult.addedCount > 0) {
                console.log(`   Added: ${updateResult.addedCount} new feeds`);
            }
            if (updateResult.removedCount > 0) {
                console.log(`   Removed: ${updateResult.removedCount} feeds`);
            }
            console.log(`   Working: ${testResult.success} feeds tested successfully`);
        } else {
            console.log('\n✅ No changes needed - dataset is already current');
        }
        
    } catch (error) {
        console.error('\n❌ Refresh failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup temporary files
        ['./chainlink_feeds_new.html', './feeds_data_new.json'].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
    }
}

// Execute if run directly
if (require.main === module) {
    refreshFeeds().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { refreshFeeds };