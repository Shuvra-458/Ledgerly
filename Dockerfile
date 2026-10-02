# ---------- Stage 1: Base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./

# ---------- Stage 2: Development ----------
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# ---------- Stage 3: Build (prod deps only) ----------
FROM base AS prod-deps
ENV NODE_ENV=production
RUN npm ci --omit=dev

# ---------- Stage 4: Production ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache dumb-init
# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=app:app . .

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "server.js"]