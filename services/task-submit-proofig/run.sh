#!/bin/sh

# run.sh - Run the local task-submit-proofig Docker image (after ./local.sh or npm run build:local)

docker run \
  -p 8080:8080 \
  --name task-submit-proofig-local \
  --rm \
  task-submit-proofig-local
