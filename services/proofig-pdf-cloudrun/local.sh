#!/bin/bash

# local.sh - Build and run the Proofig PDF service container locally.
# Bundles the proofig-pdf-service package, builds the Docker image, and starts it.

set -e  # Exit on any error

echo "🔨 Building proofig-pdf-service package..."

# Navigate to the service package and build it
cd ../../packages/proofig-pdf-service
npm run build

echo "📦 Copying built assets to cloudrun directory..."

# Copy the bundled JavaScript into the cloudrun directory
cp dist/* ../../services/proofig-pdf-cloudrun/

# Navigate back to cloudrun directory
cd ../../services/proofig-pdf-cloudrun

echo "🐳 Building local Docker image..."

docker build --tag proofig-pdf-local .

echo "✅ Local build complete!"
echo ""

PORT="${PORT:-8080}"
echo "🚀 Starting container on port ${PORT}..."
docker run -p "${PORT}:8080" \
    --name proofig-pdf-local \
    --rm \
    proofig-pdf-local
