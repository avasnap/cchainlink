#!/usr/bin/env node

// Convert CSV to JSON for GitHub Pages
// This script reads the CSV file and generates a JSON file for the HTML page to consume

const fs = require('fs');
const csv = require('csv-parser');

async function convertCsvToJson() {
    console.log('📋 Converting CSV to JSON for GitHub Pages...');

    const feeds = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream('./avalanche_chainlink_feeds.csv')
            .pipe(csv())
            .on('data', (row) => {
                // Only include the fields needed by the HTML page
                feeds.push({
                    name: row.name,
                    proxy_address: row.proxy_address,
                    decimals: parseInt(row.decimals) || 8,
                    asset_class: row.asset_class || 'Crypto'
                });
            })
            .on('end', () => {
                // Write to docs folder for GitHub Pages
                const outputPath = './docs/feeds.json';
                fs.writeFileSync(outputPath, JSON.stringify(feeds, null, 2));
                console.log(`✅ Generated ${outputPath} with ${feeds.length} feeds`);
                resolve(feeds);
            })
            .on('error', reject);
    });
}

// Execute if run directly
if (require.main === module) {
    convertCsvToJson().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

module.exports = { convertCsvToJson };
