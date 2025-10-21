const fs = require('fs');

const csvContent = fs.readFileSync('./avalanche_chainlink_feeds.csv', 'utf8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

const feeds = lines.slice(1).map(line => {
    const values = line.split(',');
    const feed = {};
    
    headers.forEach((header, index) => {
        feed[header.trim()] = values[index]?.trim() || '';
    });
    
    // Skip feeds without proxy addresses or that are Proof of Reserve or Emergency Count
    if (!feed.proxy_address || feed.asset_class === 'Proof of Reserve' || 
        feed.name.includes('Emergency Count') || feed.name.includes('Proof of Reserves')) {
        return null;
    }
    
    return {
        name: feed.name,
        symbol: feed.path.toUpperCase().replace(/-/g, ''),
        proxyAddress: feed.proxy_address,
        decimals: parseInt(feed.decimals),
        baseAsset: feed.base_asset,
        quoteAsset: feed.quote_asset
    };
}).filter(feed => feed !== null);

console.log('const AVALANCHE_FEEDS = [');
feeds.forEach((feed, index) => {
    const comma = index === feeds.length - 1 ? '' : ',';
    console.log(`    ${JSON.stringify(feed)}${comma}`);
});
console.log('];');