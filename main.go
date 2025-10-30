package main

import (
	"context"
	"encoding/csv"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"math/big"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11"
	AVALANCHE_RPC      = "https://api.avax.network/ext/bc/C/rpc"
	CHAIN_ID           = 43114
	MONGODB_URI        = "mongodb://localhost:27017"
	DATABASE_NAME      = "chainlink"
	COLLECTION_NAME    = "prices"
)

// Feed represents a Chainlink price feed
type Feed struct {
	Name         string
	ProxyAddress string
	Decimals     int
}

// PriceData represents the latest round data from a Chainlink feed
type PriceData struct {
	Name      string    `bson:"name"`
	Proxy     string    `bson:"proxy"`
	Price     float64   `bson:"price"`
	Decimals  int       `bson:"decimals"`
	RoundID   string    `bson:"roundId"`
	UpdatedAt time.Time `bson:"updatedAt"`
	Raw       RawData   `bson:"raw"`
}

// RawData contains the raw values from the contract
type RawData struct {
	Answer          string `bson:"answer"`
	StartedAt       string `bson:"startedAt"`
	UpdatedAt       string `bson:"updatedAt"`
	AnsweredInRound string `bson:"answeredInRound"`
}

// PriceDocument is the MongoDB document structure
type PriceDocument struct {
	ID          string      `bson:"_id"`
	BlockNumber uint64      `bson:"blockNumber"`
	Timestamp   time.Time   `bson:"timestamp"`
	ChainID     int         `bson:"chainId"`
	TotalFeeds  int         `bson:"totalFeeds"`
	Prices      []PriceData `bson:"prices"`
}

// Multicall3 Call struct
type Call struct {
	Target   common.Address
	CallData []byte
}

// LoadFeeds reads the CSV file and returns a slice of feeds
func LoadFeeds(filename string) ([]Feed, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV: %w", err)
	}

	feeds := make([]Feed, 0)
	// Skip header row
	for i, record := range records {
		if i == 0 {
			continue
		}
		if len(record) < 6 {
			continue
		}

		decimals, err := strconv.Atoi(record[5])
		if err != nil {
			log.Printf("Warning: invalid decimals for %s, skipping", record[0])
			continue
		}

		feeds = append(feeds, Feed{
			Name:         record[0],
			ProxyAddress: record[2],
			Decimals:     decimals,
		})
	}

	return feeds, nil
}

// GetMulticall3ABI returns the ABI for the Multicall3 aggregate function
func GetMulticall3ABI() (abi.ABI, error) {
	multicallJSON := `[{
		"inputs": [{
			"components": [
				{"internalType": "address", "name": "target", "type": "address"},
				{"internalType": "bytes", "name": "callData", "type": "bytes"}
			],
			"internalType": "struct Multicall3.Call[]",
			"name": "calls",
			"type": "tuple[]"
		}],
		"name": "aggregate",
		"outputs": [
			{"internalType": "uint256", "name": "blockNumber", "type": "uint256"},
			{"internalType": "bytes[]", "name": "returnData", "type": "bytes[]"}
		],
		"stateMutability": "payable",
		"type": "function"
	}]`

	return abi.JSON(strings.NewReader(multicallJSON))
}

// GetChainlinkABI returns the ABI for Chainlink price feed
func GetChainlinkABI() (abi.ABI, error) {
	chainlinkJSON := `[{
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
	}]`

	return abi.JSON(strings.NewReader(chainlinkJSON))
}

// FetchAllPrices fetches all feed prices using Multicall3
func FetchAllPrices(client *ethclient.Client, feeds []Feed) (*PriceDocument, error) {
	ctx := context.Background()

	// Get ABIs
	multicallABI, err := GetMulticall3ABI()
	if err != nil {
		return nil, fmt.Errorf("failed to get Multicall3 ABI: %w", err)
	}

	chainlinkABI, err := GetChainlinkABI()
	if err != nil {
		return nil, fmt.Errorf("failed to get Chainlink ABI: %w", err)
	}

	// Prepare call data for latestRoundData()
	calls := make([]Call, len(feeds))
	for i, feed := range feeds {
		callData, err := chainlinkABI.Pack("latestRoundData")
		if err != nil {
			return nil, fmt.Errorf("failed to pack latestRoundData call: %w", err)
		}

		calls[i] = Call{
			Target:   common.HexToAddress(feed.ProxyAddress),
			CallData: callData,
		}
	}

	// Pack the multicall aggregate call
	callsData := make([]struct {
		Target   common.Address
		CallData []byte
	}, len(calls))

	for i, call := range calls {
		callsData[i] = struct {
			Target   common.Address
			CallData []byte
		}{
			Target:   call.Target,
			CallData: call.CallData,
		}
	}

	data, err := multicallABI.Pack("aggregate", callsData)
	if err != nil {
		return nil, fmt.Errorf("failed to pack multicall data: %w", err)
	}

	// Call the contract
	multicallAddr := common.HexToAddress(MULTICALL3_ADDRESS)
	msg := ethereum.CallMsg{
		To:   &multicallAddr,
		Data: data,
	}

	startTime := time.Now()
	result, err := client.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call contract: %w", err)
	}
	elapsed := time.Since(startTime)

	log.Printf("Fetched all prices in %v", elapsed)

	// Unpack the result
	var out struct {
		BlockNumber *big.Int
		ReturnData  [][]byte
	}

	err = multicallABI.UnpackIntoInterface(&out, "aggregate", result)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack result: %w", err)
	}

	blockNumber := out.BlockNumber.Uint64()
	log.Printf("Fetched prices at block %d", blockNumber)

	// Decode each result
	prices := make([]PriceData, 0, len(feeds))
	for i, returnData := range out.ReturnData {
		feed := feeds[i]

		var latestRound struct {
			RoundID         *big.Int
			Answer          *big.Int
			StartedAt       *big.Int
			UpdatedAt       *big.Int
			AnsweredInRound *big.Int
		}

		err := chainlinkABI.UnpackIntoInterface(&latestRound, "latestRoundData", returnData)
		if err != nil {
			log.Printf("Warning: failed to decode data for %s: %v", feed.Name, err)
			continue
		}

		// Convert to human-readable price
		answerFloat := new(big.Float).SetInt(latestRound.Answer)
		divisor := new(big.Float).SetFloat64(math.Pow10(feed.Decimals))
		priceFloat := new(big.Float).Quo(answerFloat, divisor)
		price, _ := priceFloat.Float64()

		updatedAtTime := time.Unix(latestRound.UpdatedAt.Int64(), 0)

		priceData := PriceData{
			Name:      feed.Name,
			Proxy:     feed.ProxyAddress,
			Price:     price,
			Decimals:  feed.Decimals,
			RoundID:   latestRound.RoundID.String(),
			UpdatedAt: updatedAtTime,
			Raw: RawData{
				Answer:          latestRound.Answer.String(),
				StartedAt:       latestRound.StartedAt.String(),
				UpdatedAt:       latestRound.UpdatedAt.String(),
				AnsweredInRound: latestRound.AnsweredInRound.String(),
			},
		}

		prices = append(prices, priceData)
	}

	// Create the document
	doc := &PriceDocument{
		ID:          fmt.Sprintf("%d-%d", CHAIN_ID, blockNumber),
		BlockNumber: blockNumber,
		Timestamp:   time.Now(),
		ChainID:     CHAIN_ID,
		TotalFeeds:  len(prices),
		Prices:      prices,
	}

	return doc, nil
}

// SaveToMongoDB saves the price document to MongoDB
func SaveToMongoDB(doc *PriceDocument) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get MongoDB URI from environment or use default
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = MONGODB_URI
	}

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}
	defer client.Disconnect(ctx)

	// Get collection
	collection := client.Database(DATABASE_NAME).Collection(COLLECTION_NAME)

	// Upsert the document (replace if exists, insert if not)
	filter := bson.M{"_id": doc.ID}
	update := bson.M{"$set": doc}
	opts := options.Update().SetUpsert(true)

	result, err := collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("failed to save to MongoDB: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new document with _id: %s", doc.ID)
	} else {
		log.Printf("Updated existing document with _id: %s", doc.ID)
	}

	return nil
}

func main() {
	log.Println("Starting Avalanche Chainlink Multicall3 Price Fetcher")

	// Load feeds from CSV
	feeds, err := LoadFeeds("./avalanche_chainlink_feeds.csv")
	if err != nil {
		log.Fatalf("Failed to load feeds: %v", err)
	}
	log.Printf("Loaded %d Chainlink feeds", len(feeds))

	// Connect to Ethereum client
	client, err := ethclient.Dial(AVALANCHE_RPC)
	if err != nil {
		log.Fatalf("Failed to connect to Avalanche RPC: %v", err)
	}
	defer client.Close()

	// Fetch all prices
	log.Println("Fetching prices via Multicall3...")
	doc, err := FetchAllPrices(client, feeds)
	if err != nil {
		log.Fatalf("Failed to fetch prices: %v", err)
	}

	// Display results
	log.Printf("\n=== AVALANCHE CHAINLINK FEED PRICES ===")
	log.Printf("Block Number: %d", doc.BlockNumber)
	log.Printf("Document ID: %s", doc.ID)
	log.Printf("Total Feeds: %d", doc.TotalFeeds)
	log.Println("\nPrices:")
	for _, price := range doc.Prices {
		log.Printf("  %s: $%.8f (Updated: %s)", price.Name, price.Price, price.UpdatedAt.Format(time.RFC3339))
	}

	// Save to MongoDB
	log.Println("\nSaving to MongoDB...")
	err = SaveToMongoDB(doc)
	if err != nil {
		log.Fatalf("Failed to save to MongoDB: %v", err)
	}

	log.Println("\n✅ Price fetch and save complete!")
}
