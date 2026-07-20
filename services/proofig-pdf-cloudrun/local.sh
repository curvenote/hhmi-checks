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

DOCKER_ENV=()
if [[ -f ".env" ]]; then
  # shellcheck source=/dev/null
  source .env
fi

if [[ "${PROOFIG_PDF_RENDER_ONLY:-}" == "1" ]]; then
  echo "🧪 Render-only test mode enabled (POST /test-render)"
  DOCKER_ENV+=(-e "PROOFIG_PDF_RENDER_ONLY=1")
fi

if [[ -n "${RENDER_OUTPUT_DIR:-}" ]]; then
  mkdir -p "${RENDER_OUTPUT_DIR}"
  echo "📁 Render output mounted at ${RENDER_OUTPUT_DIR}"
  DOCKER_ENV+=(-e "RENDER_OUTPUT_DIR=${RENDER_OUTPUT_DIR}" -v "${RENDER_OUTPUT_DIR}:${RENDER_OUTPUT_DIR}")
fi

docker run -p "${PORT}:8080" \
    "${DOCKER_ENV[@]}" \
    --name proofig-pdf-local \
    --rm \
    proofig-pdf-local
