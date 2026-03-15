FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nexus -G nodejs
COPY --from=deps    --chown=nexus:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nexus:nodejs /app/dist ./dist
COPY --from=builder --chown=nexus:nodejs /app/package.json ./
USER nexus
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health/live || exit 1
CMD ["node", "dist/server.js"]

FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
EXPOSE 8080
CMD ["npx", "ts-node-dev", "--respawn", "src/server.ts"]
