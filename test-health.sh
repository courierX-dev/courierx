#!/bin/bash

echo "🧪 Testing CourierX API Health Endpoints"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "\n${YELLOW}Testing /v1/health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" "$API_URL/v1/health")
HTTP_STATUS=$(echo $HEALTH_RESPONSE | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo $HEALTH_RESPONSE | sed -E 's/HTTP_STATUS:[0-9]*$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}❌ Health endpoint failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $RESPONSE_BODY"
fi

echo -e "\n${YELLOW}Testing /v1/ready endpoint...${NC}"
READY_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" "$API_URL/v1/ready")
HTTP_STATUS=$(echo $READY_RESPONSE | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo $READY_RESPONSE | sed -E 's/HTTP_STATUS:[0-9]*$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Ready endpoint responding${NC}"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "Response: $RESPONSE_BODY"
else
    echo -e "${RED}❌ Ready endpoint failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $RESPONSE_BODY"
fi

echo -e "\n${YELLOW}Testing database connectivity via health check...${NC}"
DB_STATUS=$(echo $RESPONSE_BODY | jq -r '.database' 2>/dev/null || echo "unknown")

if [ "$DB_STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Database connectivity confirmed${NC}"
else
    echo -e "${RED}❌ Database connectivity issue${NC}"
fi

echo -e "\n🎉 Health check tests completed!"
