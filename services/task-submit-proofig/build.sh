#!/bin/bash

# build.sh - Build task-submit-proofig Docker image on GCP Cloud Build

set -e

if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Copy .env.sample to .env and set GCP_PROJECT (and optionally GCP_REGION)."
    exit 1
fi

source .env

if [ -z "$GCP_PROJECT" ]; then
    echo "Error: GCP_PROJECT must be set in .env"
    exit 1
fi

echo "Building task-submit-proofig image on GCP..."
echo "Project: $GCP_PROJECT"
echo "Region: ${GCP_REGION:-us-central1}"

echo "Running build:service (packages/task-submit-proofig build → dist/)..."
npm run build:service

gcloud builds submit \
  --project "$GCP_PROJECT" \
  --tag "gcr.io/$GCP_PROJECT/task-submit-proofig:$(git rev-parse --short HEAD)" \
  --timeout 15m \
  .
