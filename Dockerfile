# Dockerfile Produksi E-Kinerja AI untuk Easypanel / Coolify / Docker VPS
# Otomatis menjalankan Web Server + Bot Telegram secara bersamaan!

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install dependensi produksi saja (cepat & hemat RAM VPS)
COPY package*.json ./
RUN npm ci --omit=dev

# Salin frontend pre-built dan server backend
COPY dist ./dist
COPY server ./server
COPY database ./database

# Pastikan folder database tersedia
RUN mkdir -p /app/database

# Port aplikasi
EXPOSE 3000

# Health check untuk Easypanel
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Otomatis menjalankan Web App + Bot Telegram saat kontainer dimulai
CMD ["node", "server/server.js"]
