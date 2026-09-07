# 🐳 Panduan Deployment Docker: E-Kinerja AI

Repositori ini telah dilengkapi konfigurasi **Easy Deployment** berbasis Docker & Docker Compose, otomatisasi migrasi skema database & seeder, serta CI/CD melalui **GitHub Container Registry (GHCR)**.

---

## 📦 Mengambil Image Docker Siap Pakai (GHCR)

Image Docker otomatis di-build dan dipublikasikan ke GHCR setiap kali branch `smansage` diperbarui:
```bash
docker pull ghcr.io/ardianryan/jurnal-ekin-ai:smansage
# atau tag latest:
docker pull ghcr.io/ardianryan/jurnal-ekin-ai:latest
```

---

## 🛡️ Keamanan & Auto-Migration Produksi

1. **Zero Hardcoded Credentials**: Seluruh kredensial (host, database, user, password) diambil 100% dari environment variables (`.env`).
2. **Auto-Migration Database**: Saat aplikasi pertama kali tersambung ke PostgreSQL, sistem mengeksekusi `CREATE TABLE IF NOT EXISTS` dan `ALTER TABLE ADD COLUMN IF NOT EXISTS` secara otomatis. Struktur tabel selalu sinkron tanpa perlu migrasi manual.
3. **Fresh Install Auto-Seeder**: Jika database masih bersih/kosong (0 akun), sistem otomatis membuat akun administrator awal dan data referensi bawaan. Jika database sudah memiliki data, proses seeding otomatis dilewati sehingga data produksi aman.
4. **Auto-Reconnect & Fallback**: Jika server database sedang booting atau restart, aplikasi mencoba menyambung ulang di background dan menggunakan fallback aman agar layanan tetap online.

---

## 🚀 1. Deployment Mode Stack (Database PostgreSQL Eksternal / Remote VPS)

Gunakan `docker-compose.yml` untuk menghubungkan aplikasi ke server database PostgreSQL Anda (misal IP internal/VPN/VPS).

### Langkah-langkah:
1. Siapkan file `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
2. Pastikan variabel database terisi di `.env`:
   ```env
   DB_TYPE=postgres
   DB_HOST=10.x.x.x
   DB_PORT=5432
   DB_NAME=nama_database_anda
   DB_USER=username_anda
   DB_PASSWORD=password_anda
   ```
3. Jalankan Docker Stack:
   ```bash
   docker compose up -d
   ```
4. Pantau log:
   ```bash
   docker compose logs -f app
   ```

---

## 📦 2. Deployment Mode Standalone (Dengan Database PostgreSQL Lokal Terpadu)

Jika ingin menjalankan aplikasi sekaligus kontainer database PostgreSQL baru di mesin yang sama:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

---

## ⚡ 3. Deployment Cepat dengan Docker Run (Single Container)

```bash
docker run -d \
  --name ekinerja-ai \
  -p 3000:3000 \
  --restart always \
  --env-file .env \
  -v ekinerja_data:/app/database \
  ghcr.io/ardianryan/jurnal-ekin-ai:smansage
```

Aplikasi dapat langsung diakses di browser: `http://localhost:3000`.

---

## 🌐 4. Panduan Portainer Stack (Remote PostgreSQL VM Eksternal)

Jika Anda menggunakan **Portainer**:
1. Buka Portainer UI > **Stacks** > **+ Add stack**.
2. Beri nama stack (misal: `ekinerja-ai`).
3. Pilih metode **Web editor** dan salin isi file [`docker-compose.portainer.yml`](docker-compose.portainer.yml).
4. Pada bagian **Environment variables** di Portainer, tambahkan variabel:
   - `DB_PASSWORD`: *(isi dengan password database VM Anda)*
   - `PORT`: `3000` *(atau port publik yang Anda kehendaki)*
   - *(Opsional)* Variabel Cloudflare R2 / S3 jika ingin mengaktifkan storage presigned.
5. Klik **Deploy the stack**.
6. Aplikasi akan langsung menarik image dari GHCR, terhubung ke VM PostgreSQL, menjalankan auto-migration tabel secara otomatis, dan siap digunakan!

---

## 🛠️ 5. Deployment di Easypanel / Coolify / CapRover

- **Service Type**: App (Docker Image: `ghcr.io/ardianryan/jurnal-ekin-ai:smansage`)
- **Port**: `3000`
- **Health Check Path**: `/health`
- **Persistent Volume**: `/app/database`
- **Environment Variables**: Masukkan variabel dari `.env.example` ke menu Environment pada panel Anda.

