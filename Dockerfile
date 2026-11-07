FROM node:24-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
RUN npm --prefix frontend ci && npm --prefix backend ci

COPY frontend/ ./frontend/
COPY backend/ ./backend/
RUN npm --prefix frontend run build

WORKDIR /app/backend
RUN npx prisma generate --config prisma7.config.ts && npm run build \
    && mkdir -p storage && chown node:node storage

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]