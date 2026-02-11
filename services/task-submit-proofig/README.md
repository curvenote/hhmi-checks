# Task-submit-proofig – Cloud Run

This directory holds the Dockerfile and scripts to build and deploy the **task-submit-proofig** service on Google Cloud Run (Pub/Sub triggered). The image is minimal: Node.js only, no system deps.

## Build flow

Pre-built assets are copied here by `build:service` or `local.sh`:

1. Build `packages/task-submit-proofig` and copy `dist/` here.
2. Run `docker build` or `gcloud builds submit` from this directory.

## Setup

```bash
cp .env.sample .env
# Edit .env: set GCP_PROJECT (and optionally GCP_REGION, PORT)
```

## Scripts

| Script        | Description                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `./local.sh`  | Build package, copy dist here, build Docker image, then run container.           |
| `./build.sh`  | Remote Docker build on GCP (run `npm run build:service` first).                 |
| `./deploy.sh` | Deploy current image to Cloud Run.                                             |
| `./run.sh`    | Run the local image `task-submit-proofig-local` (port 8080).                     |

## npm scripts (run from this directory)

| Command                 | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm run build:service` | Build package and copy `dist/` here.                     |
| `npm run build`         | `build:service` then `./build.sh`.                        |
| `npm run deploy`        | `./deploy.sh`                                            |
| `npm run build:local`   | `build:service` then `docker build -t task-submit-proofig-local .` |
| `npm run dev`           | `build:local` then `./run.sh`                             |

## Environment variables

| Variable      | Description             | Default       |
| ------------- | ----------------------- | ------------- |
| `GCP_PROJECT` | Google Cloud project ID | (required)    |
| `GCP_REGION`  | Cloud Run region        | us-central1   |
| `PORT`        | Local dev port          | 8080          |
