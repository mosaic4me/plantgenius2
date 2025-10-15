#!/bin/bash

# PlantGenius Backend API Test Script
# Usage: ./test-api.sh <api-url>

API_URL=${1:-http://localhost:3000}

echo "🧪 Testing PlantGenius Backend API at $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -n "Testing $description... "

    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo -e "${GREEN}✓${NC} ($status_code)"
    else
        echo -e "${RED}✗${NC} ($status_code)"
        echo "  Response: $body"
    fi
}

# Run tests
echo "=== Health & Status ==="
test_endpoint "GET" "/health" "" "Health check"

echo ""
echo "=== Authentication ==="

# Generate random email for testing
TEST_EMAIL="test$(date +%s)@test.com"
TEST_PASSWORD="test123456"

test_endpoint "POST" "/api/auth/signup" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"fullName\":\"Test User\"}" \
    "Sign up"

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "Token received: ${GREEN}✓${NC}"

    echo ""
    echo "=== Authenticated Endpoints ==="

    # Get user profile
    USER_ID=$(echo $TOKEN_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

    test_endpoint "GET" "/api/users/$USER_ID" "" "Get user profile (with auth)"

    # Test other endpoints
    TODAY=$(date +%Y-%m-%d)
    test_endpoint "POST" "/api/scans/$USER_ID/$TODAY/increment" "" "Increment daily scan"
    test_endpoint "GET" "/api/subscriptions/active/$USER_ID" "" "Get active subscription"
else
    echo -e "Token not received: ${RED}✗${NC}"
fi

echo ""
echo "=== Summary ==="
echo "✅ Basic tests complete"
echo "⚠️  For full testing, use Postman or similar tools"
echo ""
echo "Next steps:"
echo "  1. Test payment verification with Paystack"
echo "  2. Test webhook handling"
echo "  3. Load test with k6 or Apache Bench"
