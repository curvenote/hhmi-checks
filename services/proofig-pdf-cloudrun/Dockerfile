# Playwright base image ships Chromium + system deps matching the pinned playwright version.
# Keep this tag in sync with the `playwright` dependency in package.json.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /usr/app

# index.js is the pre-bundled service (esbuild) copied in by build:service.
COPY index.js package.json package-lock.json* ./
RUN npm install --omit=dev

CMD ["npm", "run", "start"]
