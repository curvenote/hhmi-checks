#!/bin/sh

docker run \
  -p 8080:8080 \
  --name proofig-pdf-local \
  --rm \
  proofig-pdf-local
