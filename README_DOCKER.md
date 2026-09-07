# 🐳 Panduan Deployment Docker: E-Kinerja AI

Repositori ini telah dilengkapi konfigurasi **Easy Deployment** berbasis Docker & Docker Compose, serta otomatisasi CI/CD melalui **GitHub Container Registry (GHCR)**.

---

## 📦 Mengambil Image Docker Siap Pakai (GHCR)

Anda tidak perlu mem-build ulang image dari nol. Setiap kali kode di-push ke branch `smansage`, GitHub Actions akan otomatis mem-build image Docker dan mempublikasikannya ke GHCR.

Untuk menarik image terbaru:
```bash
docker pull ghcr.io/ardianryan/jurnal-ekin-ai:smansage
# atau tag latest:
docker pull ghcr.io/ardianryan/jurnal-ekin-ai:latest
```

---

## ⚡ 1. Jalankan Cepat dengan Docker Run (Standalone)

```bash
docker run -d \
  --name ekinerja-app \
  -p 3000:3000 \
  --restart always \
  --env-file .env \
  -v ekinerja_data:/app/database \
  ghcr.io/ardianryan/jurnal-ekin-ai:smansage
```

Aplikasi langsung dapat diakses di browser: `http://localhost:3000`.

---

## 🚀 2. Jalankan dengan Docker Compose (Direkomendasikan)

Tersedia file `docker-compose.yml` lengkap dengan PostgreSQL database dan volume persisten.

1. Siapkan file environment:
   ```bash
   cp .env.example .env
   # Edit konfigurasi di .env (kredensial database, Cloudflare R2, Telegram Bot, dll.)
   nano .env
   ```

2. Jalankan service di background:
   ```bash
   docker compose up -d
   ```

3. Cek status dan log:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```

4. Menghentikan service:
   ```bash
   docker compose down
   ```

---

## 🛠️ 3. Build Image Sendiri Secara Lokal

Jika ingin mem-build image langsung dari source code lokal:
```bash
docker build -t ekinerja-ai:local .
docker run -d -p 3000:3000 --env-file .env ekinerja-ai:local
```

---

## 🌐 4. Deployment ke Easypanel / Portainer / Coolify

- **Build Type**: Dockerfile
- **Dockerfile Path**: `Dockerfile`
- **Exposed Port**: `3000`
- **Healthcheck Path**: `/health`
- **Persistent Volume**:
  - Path Kontainer: `/app/database`
- **Environment Variables**:
  - Salin dari file `.env.example`.
