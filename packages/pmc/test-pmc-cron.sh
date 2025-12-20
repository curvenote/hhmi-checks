#!/bin/bash

# Test script for PMC workflow sync endpoint
# This script posts to the PMC workflow sync endpoint with the Vercel cron secret

# Configuration
SECRET="oiud9anyo9fxa9ay7k"
BASE_URL="http://localhost:3031"
ENDPOINT="/v1/hooks/pmc-workflow-sync"

echo "🔐 Testing PMC Workflow Sync Endpoint"
echo "📍 URL: ${BASE_URL}${ENDPOINT}"
echo "🔑 Secret: ${SECRET}"
echo ""

# Test with correct authorization
echo "✅ Testing with correct authorization..."
curl -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}${ENDPOINT}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "❌ Testing with incorrect authorization..."
curl -X POST \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  "${BASE_URL}${ENDPOINT}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "❌ Testing without authorization..."
curl -X POST \
  -H "Content-Type: application/json" \
  "${BASE_URL}${ENDPOINT}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "�� Test completed!" 