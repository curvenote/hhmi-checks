#!/bin/bash

# deploy.sh - Deploy task-submit-proofig to Google Cloud Run using .env

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

echo "Deploying task-submit-proofig to Cloud Run..."
echo "Project: $GCP_PROJECT"
echo "Region: ${GCP_REGION:-us-central1}"

gcloud run deploy task-submit-proofig \
  --project "$GCP_PROJECT" \
  --image "gcr.io/$GCP_PROJECT/task-submit-proofig:$(git rev-parse --short HEAD)" \
  --platform managed \
  --ingress internal \
  --memory 512Mi \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 10 \
  --region "${GCP_REGION:-us-central1}" \
  --no-allow-unauthenticated

echo "Deployment complete!"
