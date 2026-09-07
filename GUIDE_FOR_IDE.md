# Guide for IDE & Developer Onboarding

Panduan ringkas untuk developer dan AI Assistant (Antigravity/Cursor/VS Code) saat bekerja pada repository ini.

---

## 1. Lingkungan Pengembangan Lokal

### Prasyarat:
- Node.js v20+ atau v22+
- npm v10+
- Docker & Docker Compose (opsional jika ingin menjalankan containerized)

### Instalasi Dependensi:
```bash
npm install
```

### Menjalankan Server Lokal (Development):
```bash
# Terminal 1: Menjalankan Vite Client (Hot Reload)
npm run dev

# Terminal 2: Menjalankan Backend Server (API & Database Sync)
npm run start:server
```

### Build Produksi:
```bash
npm run build
```

---

## 2. Struktur Proyek

```text
ekinsmansage/
├── PRD.md                     # Product Requirement Document resmi
├── AGENTS.md                  # Aturan & instruksi otomatis untuk Antigravity IDE
├── GUIDE_FOR_IDE.md           # Panduan alur kerja & runbook IDE ini
├── Dockerfile                 # Multi-stage build (Node Alpine)
├── docker-compose.portainer.yml # Template stack resmi untuk Portainer
├── server/                    # Backend Node.js
│   ├── server.js              # Entrypoint HTTP server, routing API, security headers
│   ├── zitadelService.js      # Integrasi OIDC Zitadel & verifikasi metadata
│   ├── postgresAdapter.js     # Driver PostgreSQL, auto-migration & auto-seeder
│   ├── dbStore.js             # Abstraksi data layer & session management
│   ├── telegramBot.js         # Service Bot Telegram
│   └── r2StorageService.js    # Presigned URL Cloudflare R2 / S3
├── src/                       # Frontend React 19 + Vite
│   ├── App.jsx                # Router & state pengguna utama
│   ├── components/            # Komponen UI (LoginPage, JurnalSection, Settings, dll.)
│   └── services/              # API Client & local storage bridge
└── database/                  # Tempat cache file lokal & fallback JSON
```

---

## 3. Konfigurasi Environment (`.env`)

Salin dari `.env.example`:
```bash
cp .env.example .env
```

Variabel Penting:
| Variabel | Keterangan | Contoh |
| :--- | :--- | :--- |
| `APP_URL` | Domain publik resmi untuk canonical callback SSO | `https://ekin.sman1gedeg.sch.id` |
| `DB_TYPE` | Tipe database yang digunakan | `postgres` |
| `DB_HOST` | Host VM PostgreSQL eksternal | `10.1.0.18` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nama database | `ekinaism` |
| `DB_USER` | Pengguna PostgreSQL | `ekinaism` |
| `DB_PASSWORD` | Password database (jangan pernah di-commit) | `***` |
| `ZITADEL_ISSUER`| Domain OIDC Zitadel | `https://auth.sman1gedeg.sch.id` |
| `ZITADEL_CLIENT_ID`| Client ID aplikasi dari Zitadel Console | `389674084520231723` |
| `ZITADEL_CLIENT_SECRET`| Client Secret aplikasi dari Zitadel | `***` |

---

## 4. Alur Git & Deployment

- **Cabang Aktif**: Selalu bekerja dan commit ke branch **`smansage`**.
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/docker-publish.yml`) otomatis mentrigger build dan push Docker image ke GitHub Container Registry (`ghcr.io/ardianryan/jurnal-ekin-ai:smansage`).
- **Deploy ke Portainer**: Di stack Portainer, centang *"Re-pull image and redeploy"* lalu klik *"Update the stack"*.
