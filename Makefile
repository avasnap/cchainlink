.PHONY: help build run clean install test docker-mongo

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install Go dependencies
	go mod download
	go mod tidy

build: ## Build the application
	go build -o multicall-prices main.go

run: ## Run the application
	go run main.go

clean: ## Clean build artifacts
	rm -f multicall-prices

test: ## Run tests
	go test -v ./...

docker-mongo: ## Start MongoDB in Docker
	docker run -d -p 27017:27017 --name mongodb mongo:latest

docker-mongo-stop: ## Stop MongoDB Docker container
	docker stop mongodb
	docker rm mongodb

# Development targets
dev: install build ## Install dependencies and build

run-with-mongo: docker-mongo ## Start MongoDB and run the app
	@echo "Waiting for MongoDB to start..."
	@sleep 3
	@make run
