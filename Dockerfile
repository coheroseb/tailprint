# ==========================================
# Multi-stage Dockerfile for RenderEngine
# Includes headless Chromium & font packages
# ==========================================

# 1. Builder Stage
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Prune devDependencies for production runtime
RUN npm prune --production

# 2. Production Stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# Install required system packages, NSS, FreeType, and standard international fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-color-emoji \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Install Playwright's Chromium browser binary globally (cached layer)
RUN mkdir -p /ms-playwright \
    && npx playwright install chromium \
    && chmod -R 777 /ms-playwright

# Create non-privileged user and persistent storage directory
RUN groupadd -r renderuser && useradd -r -g renderuser -G audio,video renderuser \
    && mkdir -p /app/storage \
    && chown -R renderuser:renderuser /app /ms-playwright /app/storage \
    && chmod -R 775 /app/storage

# Copy compiled application code and static assets
COPY --from=builder /app/dist ./dist
COPY assets ./assets

USER renderuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
