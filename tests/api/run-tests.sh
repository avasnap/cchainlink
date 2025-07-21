#!/bin/bash

# API Test Runner for Avalanche Chainlink APIs
# Tests both TypeScript and Python implementations for compatibility

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Avalanche Chainlink API Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found${NC}"
    echo "Please install docker-compose to run the tests"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js to run the tests"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    echo "Please install npm to run the tests"
    exit 1
fi

# Navigate to project root (assuming we're in tests/api/)
cd ../../

echo -e "${YELLOW}📋 Checking API containers...${NC}"

# Check if containers are running
TYPESCRIPT_RUNNING=$(docker-compose ps -q typescript-api)
PYTHON_RUNNING=$(docker-compose ps -q python-api)

if [ -z "$TYPESCRIPT_RUNNING" ] || [ -z "$PYTHON_RUNNING" ]; then
    echo -e "${YELLOW}⚠️  One or both APIs are not running${NC}"
    echo -e "${BLUE}🔄 Starting API containers...${NC}"
    
    # Start the containers
    docker-compose up -d
    
    echo -e "${YELLOW}⏳ Waiting for APIs to be ready...${NC}"
    sleep 15
    
    # Check if they're running now
    TYPESCRIPT_RUNNING=$(docker-compose ps -q typescript-api)
    PYTHON_RUNNING=$(docker-compose ps -q python-api)
    
    if [ -z "$TYPESCRIPT_RUNNING" ] || [ -z "$PYTHON_RUNNING" ]; then
        echo -e "${RED}❌ Failed to start API containers${NC}"
        echo "Please check docker-compose.yml and try again"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Both API containers are running${NC}"
fi

# Wait a bit more for APIs to be fully ready
echo -e "${YELLOW}⏳ Waiting for APIs to initialize...${NC}"
sleep 10

# Health check the APIs
echo -e "${BLUE}🏥 Performing health checks...${NC}"

# Check TypeScript API
echo -n "TypeScript API (localhost:3000): "
if curl -s -f "http://localhost:3000/health" > /dev/null; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
    echo -e "${YELLOW}🔍 Checking container logs...${NC}"
    docker-compose logs --tail=20 typescript-api
fi

# Check Python API
echo -n "Python API (localhost:8001): "
if curl -s -f "http://localhost:8001/health" > /dev/null; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
    echo -e "${YELLOW}🔍 Checking container logs...${NC}"
    docker-compose logs --tail=20 python-api
fi

# Navigate to test directory
cd tests/api/

# Install test dependencies
echo -e "${BLUE}📦 Installing test dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Run the tests
echo -e "${BLUE}🧪 Running API comparison tests...${NC}"
echo -e "${BLUE}====================================${NC}"

# Set test environment variables
export NODE_ENV=test
export API_TIMEOUT=30000

# Run Jest with appropriate configuration
npm test -- --verbose --testTimeout=75000

# Capture exit code
TEST_EXIT_CODE=$?

echo -e "${BLUE}====================================${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo -e "${GREEN}✅ Both APIs are working correctly and providing identical functionality${NC}"
else
    echo -e "${RED}💥 Some tests failed${NC}"
    echo -e "${YELLOW}💡 Check the test output above for details${NC}"
    echo -e "${YELLOW}🔍 You can also check container logs:${NC}"
    echo "   docker-compose logs typescript-api"
    echo "   docker-compose logs python-api"
fi

# Optional: Generate coverage report
if [ "$1" == "--coverage" ]; then
    echo -e "${BLUE}📊 Generating coverage report...${NC}"
    npm run test:coverage
fi

# Optional: Keep containers running
if [ "$1" != "--keep-running" ]; then
    echo -e "${YELLOW}🛑 Stopping API containers...${NC}"
    cd ../../
    docker-compose down
else
    echo -e "${BLUE}📡 Containers will keep running for manual testing${NC}"
    echo "TypeScript API: http://localhost:3000"
    echo "Python API: http://localhost:8001"
    echo "OpenAPI Docs: http://localhost:3000/docs (TS) | http://localhost:8001/docs (PY)"
fi

exit $TEST_EXIT_CODE