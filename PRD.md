# Product Requirement Document (PRD) — E-Kinerja SMAN 1 Gedeg

## 1. Ringkasan Eksekutif & Tujuan Produk
Aplikasi **E-Kinerja SMAN 1 Gedeg (SMAN Garuda)** adalah platform web pencatatan logbook kinerja harian pegawai, pemoles narasi SKP dengan kecerdasan buatan (Google Gemini), pembuat laporan bulanan otomatis berstandar **PermenPAN-RB No. 6 Tahun 2022**, dan penyimpan eviden dokumen/foto ke Cloudflare R2 Object Storage.

Platform dirancang untuk Tenaga Pendidik (Guru) dan Tenaga Kependidikan (Tendik) di lingkungan SMAN 1 Gedeg.

---

## 2. Arsitektur Teknis
- **Frontend**: React 19 + Vite + Tailwind CSS + Lucide Icons + JSPDF/AutoTable + ExcelJS.
- **Backend**: Node.js Native HTTP Server (`server/server.js`) + ES Modules.
- **Database Engine**:
  - PostgreSQL VM Eksternal (Production) via `pg` (IP: `10.1.0.18:5432`).
  - Fallback: Local JSON Store (`database/ekinerja_store.json`) jika database eksternal terputus.
- **Object Storage**: Cloudflare R2 / S3 API via Presigned URLs (Upload langsung dari browser ke R2 tanpa membebani memori server).
- **Single Sign-On (SSO)**: OIDC Zitadel (`auth.sman1gedeg.sch.id`).
- **Bot Integrasi**: Telegram Bot (`server/telegramBot.js`) untuk input logbook via chat.
- **Deployment**: Docker Multi-stage + Portainer Stack + GitHub Container Registry (GHCR).

---

## 3. Fitur Utama & Kebutuhan Fungsional

### 3.1. Autentikasi & Manajemen Sesi
1. **OIDC Single Sign-On (SMAGE ID / Zitadel)**:
   - Tombol SSO di bagian atas form login: *"Masuk dengan SMAGE ID"*.
   - **Auto-Registration**: Setiap pengguna yang sukses login melalui Zitadel otomatis terdaftar di database PostgreSQL.
   - Sinkronisasi atribut: Nama, NIP, NIK, dan Role (Guru/Tendik/Pegawai).
   - Toleran: Jika NIP/Jabatan belum lengkap di Zitadel, user tetap bisa masuk dan diarahkan ke modal kelengkapan profil (*Onboarding*).
2. **Autentikasi Akun Lokal**:
   - Hash password menggunakan Scrypt dengan salt unik 16-byte.
   - Proteksi brute-force login server-side (maks 10 percobaan per 10 menit per IP).
   - Masa aktif sesi: 24 jam (1 hari) dengan pembersihan otomatis sesi kadaluarsa.
3. **Pendaftaran Akun Baru (Registration Code Policy)**:
   - Administrator dapat membuka atau menutup pendaftaran mandiri.
   - Pendaftaran terproteksi menggunakan kode undangan resmi (*invite code*).

### 3.2. Jurnal & Logbook Kinerja Harian
1. Pencatatan tanggal, rentang jam kerja (default `08:00 - 16:00`), deskripsi kegiatan, volume/output, link tautan, dan dokumen eviden.
2. Filter & Pencarian cepat berdasarkan rentang tanggal, status eviden, atau kata kunci.
3. Rekap otomatis jam kerja akumulatif bulanan.

### 3.3. Integrasi AI (Gemini 3.5 Flash Lite)
1. **Poles Bahasa Baku ASN**: Mengubah catatan kasar/singkatan menjadi bahasa formal kedinasan sesuai kaidah EYD dan standar SKP BKN.
2. **Kunci API Fleksibel**:
   - Mendukung Environment Server `GEMINI_API_KEY`.
   - Mendukung Personal API Key per akun pengguna jika diizinkan superadmin.

### 3.4. Penyimpanan Berkas & Eviden (Cloudflare R2)
1. Generate Presigned URL PUT untuk upload file langsung dari browser ke bucket R2.
2. Generate Presigned URL GET atau Public URL untuk unduh/preview dokumen.
3. Kompresi gambar otomatis di browser sebelum proses unggah.

### 3.5. Database Auto-Migration & Auto-Seeder
1. **Auto-Migration**:
   - Skrip migrasi non-destruktif berjalan otomatis setiap kali kontainer Docker dinyalakan.
   - Menggunakan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk kolom baru (`nik`, `sso_uuid`, `sso_role`, `sso_source`, `gdrive_link`, dll.).
2. **Auto-Seeder**:
   - Menghitung jumlah baris pada tabel `accounts`.
   - Jika kosong (`count === 0`), otomatis menyuntikkan akun default (`superadmin`).
   - Jika sudah ada data, seeder otomatis dilewati tanpa mengubah data yang ada.

---

## 4. Keamanan & Kepatuhan
1. **No Hardcoded Credentials**: Seluruh kredensial (Postgres, R2, Zitadel Secret, Telegram Bot Token) wajib dibaca melalui environment variables (`process.env`).
2. **Reverse Proxy Friendly**:
   - Variabel `APP_URL` mengunci canonical origin agar callback SSO tidak terganggu oleh reverse proxy (Nginx, Portainer, Cloudflare Tunnel).
3. **Security Headers**:
   - X-Content-Type-Options: `nosniff`
   - X-Frame-Options: `SAMEORIGIN`
   - Content-Security-Policy & Rate Limiting pada seluruh endpoint sensitif.
