# ==============================================================================
# Multi-Stage Dockerfile untuk E-Kinerja AI
# Stage 1: Build Frontend (Vite)
# Stage 2: Production Runtime (Node.js Alpine)
# ==============================================================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Salin manifest dependensi
COPY package*.json ./

# Instal semua dependensi untuk build (termasuk devDependencies)
RUN npm ci

# Salin seluruh source code proyek
COPY . .

# Build frontend single-page application ke direktori dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Runner
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Atur environment produksi
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Instal curl untuk healthcheck dan tzdata untuk zona waktu WIB
RUN apk add --no-cache curl tzdata

# Set zona waktu default ke Asia/Jakarta (WIB)
ENV TZ=Asia/Jakarta

# Salin package.json & install hanya production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Salin hasil build frontend dari stage builder
COPY --from=builder /app/dist ./dist

# Salin direktori server backend dan file pendukung
COPY --from=builder /app/server ./server
COPY --from=builder /app/.env.example ./.env.example

# Buat direktori data untuk volume persisten lokal jika menggunakan SQLite/JSON
RUN mkdir -p database/uploads && chown -R node:node /app

# Gunakan non-root user node demi keamanan kontainer
USER node

# Ekspos port aplikasi
EXPOSE 3000

# Health check container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Jalankan server aplikasi utama (Web App + Bot Telegram terintegrasi)
CMD ["node", "server/server.js"]
