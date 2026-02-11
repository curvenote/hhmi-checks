# Minimal Node.js 22 image for task-submit-proofig (no system deps)
FROM node:22-bullseye-slim

WORKDIR /usr/app

# Pre-built dist and package files (copied by build:service or local.sh before docker build)
COPY dist/ ./dist/
COPY package.json package-lock.json ./

RUN npm ci

CMD ["npm", "run", "start"]
