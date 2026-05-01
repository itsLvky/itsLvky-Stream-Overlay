# ══════════════════════════════════════════════════════════════════════════════
#  Stream Overlay – Dockerfile (Multi-Stage)
#
#  NEXT_PUBLIC_* Variablen werden zur BUILD-Zeit eingebacken.
#  Beim Ändern des Kanalnamens muss das Image neu gebaut werden:
#    docker compose build --no-cache
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Abhängigkeiten installieren ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Zur Build-Zeit verfügbare NEXT_PUBLIC_* Variablen (werden in den Client-Bundle eingebacken)
ARG NEXT_PUBLIC_CHANNEL_NAME
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_STREAMERBOT_HOST=host.docker.internal
ARG NEXT_PUBLIC_STREAMERBOT_PORT=8080

ENV NEXT_PUBLIC_CHANNEL_NAME=$NEXT_PUBLIC_CHANNEL_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STREAMERBOT_HOST=$NEXT_PUBLIC_STREAMERBOT_HOST
ENV NEXT_PUBLIC_STREAMERBOT_PORT=$NEXT_PUBLIC_STREAMERBOT_PORT
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: Produktions-Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Unprivilegierter Nutzer für mehr Sicherheit
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Statische Assets
COPY --from=builder /app/.next/static   ./.next/static
COPY --from=builder /app/public         ./public

# Standalone-Build (enthält minimalen Node-Server + alle Dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Data-Verzeichnis für Token-Persistenz (wird als Volume gemountet)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
