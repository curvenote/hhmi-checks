#!/bin/bash

# local.sh - Build task-submit-proofig package, copy dist into this folder, build Docker image, then optionally run.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# services/task-submit-proofig is under hhmi-checks root; package is at packages/task-submit-proofig
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PACKAGE_DIR="$REPO_ROOT/packages/task-submit-proofig"
cd "$SCRIPT_DIR"

echo "Building task-submit-proofig package..."
cd "$PACKAGE_DIR"
npm install
npm run build

echo "Copying dist into services/task-submit-proofig..."
rm -rf "$SCRIPT_DIR/dist"
cp -r dist "$SCRIPT_DIR/"

cd "$SCRIPT_DIR"

echo "Building local Docker image..."
docker build --tag task-submit-proofig-local .

echo "Local build complete!"

if [ -f ".env" ]; then
    source .env
    echo "Starting container with .env..."
    docker run -p "${PORT:-8080}:8080" \
      --name task-submit-proofig-local \
      --rm \
      task-submit-proofig-local
else
    echo "No .env found. To run: docker run -p 8080:8080 --rm task-submit-proofig-local"
    echo "Or copy .env.sample to .env and run ./local.sh again."
fi
