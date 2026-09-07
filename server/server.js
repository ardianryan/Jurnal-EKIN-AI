// Unified Production Server E-Kinerja AI untuk Easypanel / Docker / VPS
// Menjalankan Web Server (Frontend & API Sync) + Bot Telegram secara otomatis bersamaan!

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat .env jika tersedia (kompatibel lokal & Easypanel/Docker)
if (fs.existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch (e) {}
}

import crypto from "crypto";
import {
  isR2Configured,
  getR2Status,
  generatePresignedUploadUrl,
  deleteR2Object,
  uploadBufferToR2,
  scanR2ObjectsByYear,
  cleanupR2ObjectsByYear
} from "./r2StorageService.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = path.resolve(__dirname, "../dist");
const DB_FILE = path.resolve(__dirname, "../database/ekinerja_store.json");
const UPLOADS_DIR = path.resolve(__dirname, "../database/uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {}
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf"
};

import { 
  getStore,
  saveStore,
  setCachedStore,
  authenticateUser, 
  sanitizeUser, 
  hashPassword,
  getRegistrationCodes,
  createRegistrationCode,
  deleteRegistrationCode,
  registerNewUser,
  createWebSession,
  getWebSession,
  deleteWebSession,
  cleanupExpiredSessions,
  deleteJournalById,
  deleteUserById,
  ONE_DAY_MS,
  getAccounts,
  findUserById,
  getJournals
} from "./dbStore.js";
import { generateMonthlyReportPdf, generateMonthlyReportZip } from "./pdfGenerator.js";
import { initDatabase, loadStoreFromDatabase, getDatabaseHealth, getActiveDbType } from "./dbAdapter.js";
import { 
  getZitadelConfig, 
  buildZitadelAuthorizeUrl, 
  exchangeZitadelCode, 
  validateZitadelMetadata 
} from "./zitadelService.js";

// Rate Limiter Sederhana In-Memory untuk Cegah Brute-Force & DoS
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);
  return record.count <= limit;
}

// Bersihkan memori rate limit berkala (tiap 5 menit)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(key);
  }
}, 300000);

// Headers Keamanan Web Tingkat Produksi (Cegah Clickjacking, MIME-sniffing, XSS)
function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; worker-src 'self' blob:; child-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'self';"
  );
}

// 1. Jalankan Bot Telegram secara Otomatis dalam Proses yang Sama
console.log("⏳ [Auto-Start] Memulai Bot Telegram...");
import("./telegramBot.js")
  .then(() => {
    console.log("🤖 [Auto-Start] Bot Telegram aktif berjalan.");
  })
  .catch((err) => {
    console.error("⚠️ [Auto-Start] Gagal memuat Bot Telegram:", err.message);
  });

const getBotConfig = () => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const username = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
  return {
    enabled: Boolean(token),
    username: username
  };
};

const getAiConfig = () => {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  const hasServerKey = Boolean(
    rawKey && 
    !rawKey.includes("PASTE_HERE") && 
    !rawKey.includes("KEY_ANDA") && 
    rawKey.length > 10
  );
  return {
    enabled: hasServerKey,
    hasServerKey: hasServerKey,
    provider: "gemini",
    model: "gemini-3.5-flash-lite"
  };
};

// 2. Buat HTTP Server untuk Web App & API Sync yang Aman
const server = http.createServer(async (req, res) => {
  // Pasang security headers di setiap respons
  setSecurityHeaders(res);

  // Batasi HTTP Methods yang diizinkan
  if (!["GET", "POST", "HEAD", "OPTIONS"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Metode HTTP tidak diizinkan.");
    return;
  }

  // Handle CORS preflight jika ada
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  const clientIp = req.socket.remoteAddress || "client";

  // 🛡️ KEAMANAN TINGKAT TINGGI: Deteksi Path Traversal pada RAW URL sebelum dinormalisasi
  const rawUrl = req.url || "/";
  if (rawUrl.includes("..") || /%2e/i.test(rawUrl) || rawUrl.includes("\0")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Upaya Path Traversal Ditolak.");
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = parsedUrl.pathname;

  // 🛡️ KEAMANAN: Tolak akses ke file tersembunyi / dotfiles (.env, .git, .DS_Store, dll.)
  if (pathname.split("/").some(segment => segment.startsWith(".") && segment !== "" && segment !== "." && segment !== "..")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke berkas konfigurasi sistem ditolak.");
    return;
  }

  // 🛡️ KEAMANAN: Tolak akses ke direktori internal sistem
  const forbiddenDirs = ["/database", "/server", "/src", "/node_modules", "/package.json", "/vite.config.js"];
  if (forbiddenDirs.some(dir => pathname.toLowerCase().startsWith(dir))) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke direktori internal sistem ditolak.");
    return;
  }

  // Endpoint Autentikasi Login Aman Server-Side (Cegah Bocor Password ke Client)
  if (pathname === "/api/auth/login") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Proteksi Brute-Force: Maks 10 kali gagal per 10 menit
    if (!checkRateLimit(`login_${clientIp}`, 10, 600000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ 
        success: false, 
        message: "Terlalu banyak percobaan login yang gagal. Demi keamanan, silakan tunggu 10 menit." 
      }));
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy(); // Limit 50KB untuk payload login
    });

    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: "Username dan password wajib diisi!" }));
          return;
        }

        const auth = authenticateUser(username, password);
        if (!auth.success) {
          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: auth.message }));
          return;
        }

        const session = createWebSession(auth.user);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          success: true, 
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt
        }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Format payload tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Registrasi Pengguna Baru (Wajib Kode Registrasi Resmi)
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/register") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // Rate Limiter Registrasi: Maksimal 15 pendaftaran per menit per IP
    if (!checkRateLimit(`register_${clientIp}`, 15, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ 
        success: false, 
        message: "Terlalu banyak permintaan pendaftaran dari IP Anda. Harap tunggu beberapa saat demi keamanan." 
      }));
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const store = getStore();
        if (store.settings?.registrationPolicy?.mode === "closed") {
          res.statusCode = 403;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ 
            success: false, 
            message: "Pendaftaran akun mandiri dinonaktifkan oleh administrator. Silakan hubungi admin atau gunakan tautan pendaftaran resmi." 
          }));
          return;
        }

        const result = registerNewUser(payload);
        let session = null;
        if (result.success && result.user) {
          session = createWebSession(result.user);
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          ...result,
          token: session?.token,
          expiresAt: session?.expiresAt
        }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Konfigurasi Publik SSO Zitadel & Kebijakan Registrasi
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/sso/config") {
    const store = getStore();
    const config = getZitadelConfig(store.settings || {});

    // Hitung canonical redirect URI yang berlaku di server
    let redirectUri = process.env.ZITADEL_REDIRECT_URI;
    if (!redirectUri) {
      const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      if (appUrl) {
        redirectUri = `${appUrl}/api/auth/sso/zitadel/callback`;
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      enabled: config.enabled,
      buttonText: config.buttonText,
      issuer: config.issuer ? "configured" : "",
      redirectUri: redirectUri || "",
      registrationMode: config.registrationMode,
      closedRegistrationUrl: config.closedRegistrationUrl,
      closedRegistrationMessage: config.closedRegistrationMessage,
      schoolName: store.settings?.schoolName || process.env.SCHOOL_NAME || "SMA Negeri 1 Gedeg",
      schoolLogo: store.settings?.schoolLogo || null,
      schoolFavicon: store.settings?.schoolFavicon || null
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Pengaturan Publik (Nama Sekolah, Logo & Favicon untuk Semua Browser)
  // --------------------------------------------------------------------------
  if (pathname === "/api/public-settings" || pathname === "/api/settings/public") {
    const store = getStore();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      schoolName: store.settings?.schoolName || process.env.SCHOOL_NAME || "SMA Negeri 1 Gedeg",
      schoolLogo: store.settings?.schoolLogo || null,
      schoolFavicon: store.settings?.schoolFavicon || null
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Mulai Login Zitadel OIDC (/api/auth/sso/zitadel/login)
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/sso/zitadel/login") {
    try {
      const store = getStore();
      const config = getZitadelConfig(store.settings || {});
      console.log("🔐 [SSO Login] Memulai autentikasi Zitadel...");
      console.log(`🔐 [SSO Login] Issuer: ${config.issuer}, ClientID: ${config.clientId ? config.clientId.slice(0, 8) + '...' : 'KOSONG'}, Enabled: ${config.enabled}`);

      if (!config.enabled) {
        console.warn("⚠️ [SSO Login] SSO Zitadel belum diaktifkan!");
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("SSO Zitadel belum diaktifkan oleh Administrator.");
        return;
      }

      // Deteksi host dan proto yang robust (mendukung reverse proxy Nginx / Cloudflare / Portainer / Domain Kustom)
      let redirectUri = process.env.ZITADEL_REDIRECT_URI;
      if (!redirectUri) {
        const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
        if (appUrl) {
          redirectUri = `${appUrl}/api/auth/sso/zitadel/callback`;
        } else {
          let proto = req.headers["x-forwarded-proto"] || "http";
          if (proto.includes(",")) proto = proto.split(",")[0].trim();

          let host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
          if (host.includes(",")) host = host.split(",")[0].trim();

          if (req.headers["x-forwarded-ssl"] === "on" || req.headers["front-end-https"] === "on") {
            proto = "https";
          }
          redirectUri = `${proto}://${host}/api/auth/sso/zitadel/callback`;
        }
      }

      console.log(`🌐 [SSO Login] Menggunakan Redirect URI: ${redirectUri}`);
      const { url } = buildZitadelAuthorizeUrl(config, redirectUri);
      console.log(`🚀 [SSO Login] Mengalihkan browser ke Zitadel Auth URL: ${url}`);
      res.statusCode = 302;
      res.setHeader("Location", url);
      res.end();
      return;
    } catch (err) {
      console.error("❌ [SSO Login Error]:", err.message, err.stack);
      res.statusCode = 302;
      res.setHeader("Location", `/#/login?error=${encodeURIComponent("Gagal menginisiasi SSO: " + err.message)}`);
      res.end();
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Endpoint Callback Zitadel OIDC (/api/auth/sso/zitadel/callback)
  // Menangkap Code OIDC, Menukarkan Token, dan Validasi Ketat Metadata
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/sso/zitadel/callback") {
    const code = parsedUrl.searchParams.get("code");
    const state = parsedUrl.searchParams.get("state");
    const errorParam = parsedUrl.searchParams.get("error");
    const errorDesc = parsedUrl.searchParams.get("error_description");

    console.log("📥 [SSO Callback] Menerima callback dari Zitadel.");
    console.log(`📥 [SSO Callback] Code: ${code ? code.slice(0, 10) + '...' : 'TIDAK ADA'}, State: ${state ? state.slice(0, 10) + '...' : 'TIDAK ADA'}`);

    if (errorParam) {
      console.error("❌ [SSO Callback Error dari Zitadel]:", errorParam, errorDesc);
      res.statusCode = 302;
      res.setHeader("Location", `/#/login?error=${encodeURIComponent("Gagal dari Zitadel: " + (errorDesc || errorParam))}`);
      res.end();
      return;
    }

    if (!code || !state) {
      console.warn("⚠️ [SSO Callback] Parameter code atau state kosong!");
      res.statusCode = 302;
      res.setHeader("Location", `/#/login?error=${encodeURIComponent("Kode otorisasi SSO tidak ditemukan.")}`);
      res.end();
      return;
    }

    try {
      const store = getStore();
      const config = getZitadelConfig(store.settings || {});

      // Deteksi host dan proto yang robust (mendukung reverse proxy Nginx / Cloudflare / Portainer / Domain Kustom)
      let redirectUri = process.env.ZITADEL_REDIRECT_URI;
      if (!redirectUri) {
        const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
        if (appUrl) {
          redirectUri = `${appUrl}/api/auth/sso/zitadel/callback`;
        } else {
          let proto = req.headers["x-forwarded-proto"] || "http";
          if (proto.includes(",")) proto = proto.split(",")[0].trim();

          let host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
          if (host.includes(",")) host = host.split(",")[0].trim();

          if (req.headers["x-forwarded-ssl"] === "on" || req.headers["front-end-https"] === "on") {
            proto = "https";
          }
          redirectUri = `${proto}://${host}/api/auth/sso/zitadel/callback`;
        }
      }

      console.log(`🔄 [SSO Callback] Menukarkan authorization code dengan token menggunakan redirectUri: ${redirectUri}`);
      const { userInfo, metadata } = await exchangeZitadelCode(code, state, config, redirectUri);
      console.log("✅ [SSO Callback] UserInfo berhasil diperoleh:", JSON.stringify({
        sub: userInfo.sub,
        preferred_username: userInfo.preferred_username,
        name: userInfo.name,
        email: userInfo.email
      }));
      console.log("✅ [SSO Callback] Metadata yang diekstrak:", JSON.stringify(metadata));

      // Ekstraksi data profil dari Zitadel
      const validation = validateZitadelMetadata(metadata, userInfo);
      console.log("🛡️ [SSO Callback] Hasil normalisasi metadata:", JSON.stringify(validation));

      // Cari atau daftarkan akun secara otomatis di database
      const accounts = store.accounts || [];
      const userNip = validation.nip || "";
      const userNik = validation.nik || "";
      const rawUsername = userInfo.preferred_username || userInfo.email?.split("@")[0] || (userNip ? `pegawai_${userNip.slice(-6)}` : `sso_${userInfo.sub?.slice(0, 8)}`);
      const username = String(rawUsername).toLowerCase().trim();
      const namaLengkap = userInfo.name || userInfo.nickname || userInfo.given_name || (userNip ? `Pegawai ${userNip}` : username);

      let existing = accounts.find(a => 
        (userNip && a.nip === userNip) || 
        (a.username && a.username.toLowerCase() === username) || 
        (validation.uuid && a.ssoUuid === validation.uuid)
      );

      const isPreExistingSuperadmin = existing && existing.role === "superadmin";

      // Validasi Ketat Metadata: Batasi hanya akun dengan peran Guru/Tendik DAN memiliki NIP
      // Jika metadata kosong atau tidak memenuhi kriteria, TOLAK sebelum melakukan auto-register atau login!
      if (!validation.allowed && !isPreExistingSuperadmin) {
        console.warn(`⛔ [SSO Callback] Akses DITOLAK untuk pengguna Zitadel "${username}" (${namaLengkap}): ${validation.reason}`);
        const publicBase = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
        const rejectTarget = `${publicBase}/#/login?error=${encodeURIComponent(validation.reason || "Akses Ditolak: Akun Anda tidak memiliki metadata Guru/Tendik dan NIP terdaftar.")}`;
        res.statusCode = 302;
        res.setHeader("Location", rejectTarget);
        res.end();
        return;
      }

      if (existing) {
        console.log(`👤 [SSO Callback] Akun yang cocok ditemukan di database: ${existing.username} (ID: ${existing.id})`);
        if (userNip && !existing.nip) existing.nip = userNip;
        if (userNik && !existing.nik) existing.nik = userNik;
        existing.ssoSource = validation.source;
        existing.ssoUuid = validation.uuid || existing.ssoUuid;
        existing.ssoRole = validation.role || existing.ssoRole;
        if (validation.jabatan && (!existing.jabatan || existing.jabatan === "PENGADMINISTRASI PERKANTORAN")) {
          existing.jabatan = validation.jabatan;
        }
        if (!existing.nama || existing.nama === "Pegawai SSO") {
          existing.nama = namaLengkap;
        }
      } else {
        console.log(`✨ [SSO Callback] Mendaftarkan akun baru secara otomatis: ${username} (Nama: ${namaLengkap}, Role: ${validation.role}, NIP: ${userNip})`);
        existing = {
          id: "usr-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          username,
          password: "", // akun SSO tidak membutuhkan password lokal
          nama: namaLengkap,
          nip: userNip,
          nik: userNik,
          role: "pegawai",
          ssoRole: validation.role || "guru",
          pangkat: validation.pangkat || "Penata Muda / III/a",
          jabatan: validation.jabatan || (validation.role === "guru" ? "Guru Mata Pelajaran" : "Tenaga Kependidikan"),
          unitKerja: store.settings?.schoolName || "SMA Negeri 1 Gedeg",
          allowEnvKey: true,
          ssoSource: validation.source,
          ssoUuid: validation.uuid,
          createdAt: new Date().toISOString()
        };
        accounts.push(existing);
      }

      store.accounts = accounts;
      saveStore(store);

      // Buat Sesi Web Resmi
      const session = createWebSession(existing);
      console.log(`🔑 [SSO Callback] Sesi web berhasil dibuat (Token: ${session.token.slice(0, 12)}..., Exp: ${new Date(session.expiresAt).toLocaleString()})`);

      // Redirect ke frontend membawa token sesi login
      const publicBase = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      const redirectTarget = `${publicBase}/#/sso-callback?token=${encodeURIComponent(session.token)}&user=${encodeURIComponent(JSON.stringify(session.user))}`;
      
      console.log(`🚀 [SSO Callback] Mengarahkan pengguna kembali ke frontend: ${redirectTarget}`);
      res.statusCode = 302;
      res.setHeader("Location", redirectTarget);
      res.end();
      return;
    } catch (err) {
      console.error("❌ [SSO Callback Error]:", err.message, err.stack);
      const publicBase = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      res.statusCode = 302;
      res.setHeader("Location", `${publicBase}/#/login?error=${encodeURIComponent(err.message || "Gagal memproses login SSO.")}`);
      res.end();
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Endpoint Simpan Pengaturan SSO & Registrasi (Superadmin Only)
  // --------------------------------------------------------------------------
  if (pathname === "/api/settings/sso" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const store = getStore();
        if (!store.settings) store.settings = {};

        if (payload.sso) {
          store.settings.sso = {
            ...store.settings.sso,
            ...payload.sso
          };
        }
        if (payload.registrationPolicy) {
          store.settings.registrationPolicy = {
            ...store.settings.registrationPolicy,
            ...payload.registrationPolicy
          };
        }

        saveStore(store);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ 
          success: true, 
          message: "Pengaturan SSO Zitadel & Kebijakan Registrasi berhasil disimpan.",
          config: getZitadelConfig(store.settings)
        }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Gagal menyimpan konfigurasi: " + err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Verifikasi Sesi Web (Berlaku 1 Hari / 24 Jam)
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/verify-session") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const token = parsedUrl.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const session = getWebSession(token);
    if (!session) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ valid: false, message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      valid: true,
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Logout Sesi Web
  // --------------------------------------------------------------------------
  if (pathname === "/api/auth/logout") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      let token = "";
      try {
        const parsed = JSON.parse(body || "{}");
        token = parsed.token;
      } catch (e) {}
      if (!token) {
        token = parsedUrl.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      }
      if (token) deleteWebSession(token);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Berhasil logout." }));
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Admin: Manajemen Kode Registrasi / Undangan
  // --------------------------------------------------------------------------
  if (pathname === "/api/admin/registration-codes" || pathname.startsWith("/api/admin/registration-codes/")) {
    if (req.method === "GET") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, codes: getRegistrationCodes() }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 50000) req.destroy();
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const created = createRegistrationCode(payload);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, code: created }));
        } catch (err) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: err.message }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      const idFromPath = pathname.replace("/api/admin/registration-codes", "").replace(/^\//, "");
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        let codeId = idFromPath;
        if (!codeId && body) {
          try {
            const parsed = JSON.parse(body);
            codeId = parsed.id || parsed.code;
          } catch (e) {}
        }
        if (!codeId) {
          codeId = parsedUrl.searchParams.get("id") || parsedUrl.searchParams.get("code");
        }

        if (!codeId) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: "ID atau Kode wajib disertakan." }));
          return;
        }

        const deleted = deleteRegistrationCode(codeId);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: deleted }));
      });
      return;
    }
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus Kegiatan Jurnal (Hapus Database + Hapus Berkas Fisik di Disk)
  // --------------------------------------------------------------------------
  if (pathname === "/api/journals/delete" || (req.method === "DELETE" && pathname.startsWith("/api/journals/"))) {
    if (req.method !== "POST" && req.method !== "DELETE") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const handleJournalDeletion = (targetId) => {
      if (!targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "ID kegiatan jurnal wajib disertakan!" }));
        return;
      }
      const result = deleteJournalById(targetId, true);
      if (!result.success) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    };

    if (req.method === "DELETE" && pathname.startsWith("/api/journals/")) {
      const idFromPath = pathname.slice("/api/journals/".length).trim();
      handleJournalDeletion(idFromPath);
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        handleJournalDeletion(payload.id);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Payload JSON tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus Akun Pengguna (Hapus Akun + Seluruh Jurnal + Berkas Fisik + Sesi)
  // --------------------------------------------------------------------------
  if (pathname === "/api/accounts/delete" || (req.method === "DELETE" && pathname.startsWith("/api/accounts/"))) {
    if (req.method !== "POST" && req.method !== "DELETE") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    const handleAccountDeletion = (targetId) => {
      if (!targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "ID atau Username pengguna wajib disertakan!" }));
        return;
      }
      const result = deleteUserById(targetId, true);
      if (!result.success) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    };

    if (req.method === "DELETE" && pathname.startsWith("/api/accounts/")) {
      const idFromPath = pathname.slice("/api/accounts/".length).trim();
      handleAccountDeletion(idFromPath);
      return;
    }

    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        handleAccountDeletion(payload.id || payload.userId || payload.username);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Payload JSON tidak valid." }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint Hapus File Fisik Sementara (Saat Pembatalan Draft Upload)
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/uploads/delete") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const { fileUrl, filePath, fileName, storedName } = JSON.parse(body);
        const candidates = [];
        if (filePath) candidates.push(path.resolve(UPLOADS_DIR, path.basename(filePath)));
        if (storedName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(storedName)));
        if (fileName) candidates.push(path.resolve(UPLOADS_DIR, path.basename(fileName)));
        if (fileUrl && typeof fileUrl === "string") {
          const cleanUrl = fileUrl.split("?")[0].split("#")[0];
          const bName = path.basename(cleanUrl);
          if (bName) candidates.push(path.resolve(UPLOADS_DIR, bName));
        }

        let deleted = false;

        // 1. Cek dan hapus dari Cloudflare R2 jika file merupakan URL R2
        if (fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))) {
          const r2Deleted = await deleteR2Object(fileUrl);
          if (r2Deleted) deleted = true;
        } else if (storedName && isR2Configured() && !storedName.startsWith("/uploads/")) {
          const r2Deleted = await deleteR2Object(storedName);
          if (r2Deleted) deleted = true;
        }

        // 2. Cek dan hapus dari storage lokal server (database/uploads/)
        for (const fPath of Array.from(new Set(candidates.filter(Boolean)))) {
          try {
            if (fPath.startsWith(UPLOADS_DIR) && fs.existsSync(fPath)) {
              const stat = fs.statSync(fPath);
              if (stat.isFile()) {
                fs.unlinkSync(fPath);
                deleted = true;
              }
            }
          } catch (e) {}
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, deleted }));
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Bad request" }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Endpoint AI Polish Server-Side (/api/ai/polish)
  // Aman: API Key & URL Google Gemini 100% diproses di server (tidak bocor ke browser)
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/ai/polish") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", async () => {
      let payload = {};
      try {
        payload = JSON.parse(body);
      } catch (e) {}

      try {
        const rawServerKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "")
          .trim()
          .replace(/^["']|["']$/g, "")
          .trim();
        const cleanApiKey = (payload.apiKey && payload.apiKey !== "server-managed" && !payload.apiKey.startsWith("server-"))
          ? payload.apiKey.trim()
          : rawServerKey;

        const { polishJournalNode } = await import("./aiServiceNode.js");
        const result = await polishJournalNode({
          rawText: payload.rawText || "",
          jabatan: payload.jabatan || "",
          unitKerja: payload.unitKerja || "",
          apiKey: cleanApiKey
        });

        console.log(`✨ [API /api/ai/polish] Selesai memoles jurnal. Sumber: ${result.source || "offline"}`);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err) {
        try {
          const { polishJournalOfflineNode } = await import("./aiServiceNode.js");
          const fallback = polishJournalOfflineNode(payload.rawText || "");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(fallback));
        } catch (e2) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Gagal memproses pemolesan jurnal" }));
        }
      }
    });
    return;
  }

  // Handler Status Konfigurasi Bot Telegram
  if (pathname === "/api/bot-status") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getBotConfig()));
    return;
  }

  // Handler Status Konfigurasi Gemini AI Server-Side (Aman tanpa membocorkan API Key)
  if (pathname === "/api/ai-status" || pathname === "/api/ai/status") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getAiConfig()));
    return;
  }

  // Handler Status Database Server (MySQL / MariaDB vs Fallback JSON)
  if (pathname === "/api/system/db-status" && (req.method === "GET" || req.method === "HEAD")) {
    getDatabaseHealth().then(health => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, ...health }));
    }).catch(err => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, type: "error", error: err.message }));
    });
    return;
  }

  // Handler API Sync (Sinkronisasi Web & Telegram Bot)
  if (pathname === "/api/sync") {
    // Rate Limiter API Sync: Maks 120 request per menit
    if (!checkRateLimit(`sync_${clientIp}`, 120, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Terlalu banyak request. Silakan perlambat." }));
      return;
    }

    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json");

      // Jika database aktif (MySQL / PostgreSQL), muat data terbaru dari DB
      if (getActiveDbType() !== "json") {
        try {
          const remoteStore = await loadStoreFromDatabase();
          if (remoteStore) {
            setCachedStore(remoteStore);
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteStore, null, 2), "utf8");
            } catch (e) {}
          }
        } catch (dbErr) {
          console.warn("Sinkronisasi database aktif ke store gagal (menggunakan cache):", dbErr.message);
        }
      }

      const store = getStore();
      const accounts = (store.accounts || []).map(sanitizeUser);
      // Urutkan selalu secara kronologis menurun (paling baru di atas)
      const journals = [...(store.journals || [])].sort((a, b) => {
        const diffDate = String(b.tanggal || "").localeCompare(String(a.tanggal || ""));
        if (diffDate !== 0) return diffDate;
        return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
      });
      res.end(JSON.stringify({
        accounts,
        journals,
        settings: store.settings || {},
        botConfig: getBotConfig(),
        aiConfig: getAiConfig(),
        timestamp: new Date().toISOString()
      }));
      return;
    } else if (req.method === "POST") {
      // Proteksi Ukuran Payload: Maksimal 10MB
      let body = "";
      let isTooLarge = false;
      req.on("data", chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
          isTooLarge = true;
          res.statusCode = 413;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Payload terlalu besar (Maksimal 10MB)." }));
          req.destroy();
        }
      });

      req.on("end", () => {
        if (isTooLarge) return;
        try {
          const incoming = JSON.parse(body);
          const store = getStore();

          if (Array.isArray(incoming.accounts)) {
            const map = new Map((store.accounts || []).map(a => [a.id || a.username, a]));
            incoming.accounts.forEach(a => {
              const existing = map.get(a.id || a.username);
              let passwordToStore = existing?.password || "";
              // Jika payload mengirimkan password baru, hash menggunakan Scrypt
              if (a.password) {
                passwordToStore = hashPassword(a.password);
              }
              map.set(a.id || a.username, { 
                ...existing, 
                ...a,
                password: passwordToStore
              });
            });
            store.accounts = Array.from(map.values());
          }
          if (Array.isArray(incoming.journals)) {
            const jMap = new Map((store.journals || []).map(j => [j.id, j]));
            incoming.journals.forEach(j => jMap.set(j.id, { ...jMap.get(j.id), ...j }));
            store.journals = Array.from(jMap.values());
          }
          if (incoming.settings && typeof incoming.settings === "object") {
            store.settings = { ...(store.settings || {}), ...incoming.settings };
          }

          saveStore(store);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, count: store.accounts?.length }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // Health Check untuk Easypanel / Docker / Uptime Monitoring
  if (pathname === "/health" || pathname === "/healthz") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      status: "ok", 
      bot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      timestamp: new Date().toISOString() 
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // A. Serving Berkas Upload (Foto Dokumentasi & Dokumen Eviden)
  // --------------------------------------------------------------------------
  if (req.method === "GET" && pathname.startsWith("/uploads/")) {
    let rawFile = pathname.slice("/uploads/".length);
    try {
      rawFile = decodeURIComponent(rawFile);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Bad Request: Invalid encoding");
      return;
    }

    // Proteksi Path Traversal & Null-Byte
    if (rawFile.includes("\0") || rawFile.includes("..") || rawFile.includes("/") || rawFile.includes("\\")) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Akses tidak diizinkan.");
      return;
    }

    const safeFileName = path.basename(rawFile);
    const targetFilePath = path.join(UPLOADS_DIR, safeFileName);
    const resolvedUploads = path.resolve(UPLOADS_DIR);

    if (!targetFilePath.startsWith(resolvedUploads + path.sep)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Akses berkas di luar folder upload ditolak.");
      return;
    }

    if (!fs.existsSync(targetFilePath)) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found: Berkas tidak ditemukan.");
      return;
    }

    const ext = path.extname(safeFileName).toLowerCase();
    const uploadMimes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain; charset=utf-8",
      ".csv": "text/csv; charset=utf-8",
      ".zip": "application/zip"
    };

    // Tolak script berbahaya
    const dangerousExts = [".html", ".htm", ".svg", ".svgz", ".js", ".mjs", ".sh", ".exe", ".php", ".py"];
    if (dangerousExts.includes(ext)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("403 Forbidden: Jenis berkas ini tidak dapat diakses langsung.");
      return;
    }

    const contentType = uploadMimes[ext] || "application/octet-stream";
    const stat = fs.statSync(targetFilePath);

    const isInlineViewable = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", isInlineViewable ? `inline; filename="${safeFileName}"` : `attachment; filename="${safeFileName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(targetFilePath).pipe(res);
    return;
  }

  // --------------------------------------------------------------------------
  // B. Endpoint Presigned URL Upload Cloudflare R2 / S3 Storage (Direct Upload)
  // Sangat Ringan: Berkas langsung di-PUT oleh browser pengguna ke R2 Object Storage
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/upload/presign") {
    if (!checkRateLimit(`upload_presign_${clientIp}`, 60, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: "Terlalu banyak permintaan presign. Silakan tunggu sebentar." }));
      return;
    }

    let presignBody = "";
    req.on("data", chunk => {
      presignBody += chunk;
      if (presignBody.length > 50000) req.destroy();
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(presignBody || "{}");
        const rawFileName = payload.fileName || "dokumen.pdf";
        const fileType = payload.fileType || "application/octet-stream";
        const tanggal = payload.tanggal || "";

        const ext = path.extname(rawFileName).toLowerCase();
        const forbiddenExts = [".exe", ".js", ".mjs", ".sh", ".bat", ".cmd", ".php", ".phtml", ".py", ".html", ".htm", ".svg"];
        if (forbiddenExts.includes(ext)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Tipe berkas tidak diizinkan demi alasan keamanan." }));
          return;
        }

        if (!isR2Configured()) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            success: false,
            mode: "local",
            message: "Storage Cloudflare R2 belum dikonfigurasi. Gunakan mode unggah server lokal."
          }));
          return;
        }

        const presignResult = await generatePresignedUploadUrl({
          fileName: rawFileName,
          fileType,
          tanggal
        });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(presignResult));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Gagal membuat token presign: " + err.message }));
      }
    });
    return;
  }

  // Status Storage Cloudflare R2 / S3
  if (req.method === "GET" && (pathname === "/api/storage/status" || pathname === "/api/upload/status")) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getR2Status()));
    return;
  }

  // Pemindaian Berkas Storage Berdasarkan Pilihan Tahun (Dry Run / Pratinjau)
  if (req.method === "POST" && pathname === "/api/storage/cleanup/scan") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const targetYear = payload.targetYear || (new Date().getFullYear() - 1);
        const mode = payload.mode || "before_or_equal"; // "exact" atau "before_or_equal"

        const result = await scanR2ObjectsByYear({ targetYear, mode, limit: 200 });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Gagal memindai berkas: " + err.message }));
      }
    });
    return;
  }

  // Eksekusi Pembersihan Berkas Storage Berdasarkan Pilihan Tahun (Permanen)
  if (req.method === "POST" && pathname === "/api/storage/cleanup/execute") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const targetYear = payload.targetYear;
        const mode = payload.mode || "before_or_equal";

        if (!targetYear) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Tahun target wajib dipilih." }));
          return;
        }

        const result = await cleanupR2ObjectsByYear({ targetYear, mode });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Gagal mengeksekusi pembersihan: " + err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // C. Endpoint Upload Berkas (Web Frontend Upload - Local Server Fallback)
  // --------------------------------------------------------------------------
  if (req.method === "POST" && pathname === "/api/upload") {
    // Rate Limiting Upload: Maks 30 upload per menit per IP
    if (!checkRateLimit(`upload_${clientIp}`, 30, 60000)) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: "Terlalu banyak permintaan upload. Tunggu beberapa saat." }));
      return;
    }

    let uploadBody = "";
    let isTooBig = false;
    const MAX_UPLOAD_SIZE = 15 * 1024 * 1024; // 15MB

    req.on("data", chunk => {
      uploadBody += chunk;
      if (uploadBody.length > MAX_UPLOAD_SIZE) {
        isTooBig = true;
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Ukuran berkas melebihi batas 15MB." }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (isTooBig) return;
      try {
        const payload = JSON.parse(uploadBody);
        const rawFileName = payload.fileName || "dokumen_kinerja.pdf";
        const fileData = payload.fileData; // base64 string

        if (!fileData || typeof fileData !== "string") {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Data berkas tidak valid." }));
          return;
        }

        const ext = path.extname(rawFileName).toLowerCase();
        const forbiddenExts = [".exe", ".js", ".mjs", ".sh", ".bat", ".cmd", ".php", ".phtml", ".py", ".html", ".htm", ".svg"];
        if (forbiddenExts.includes(ext)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Tipe berkas tidak diizinkan demi alasan keamanan." }));
          return;
        }

        // Tentukan keterangan bulan & tahun dari tanggal jurnal atau waktu sekarang
        const tanggalReq = payload.tanggal || payload.date || "";
        const INDO_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        let monthName = "";
        let yearNum = "";

        if (tanggalReq && typeof tanggalReq === "string") {
          const parts = tanggalReq.split("-");
          if (parts.length >= 2) {
            yearNum = parts[0];
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              monthName = INDO_MONTHS[mIdx];
            }
          }
        }
        if (!monthName || !yearNum) {
          const now = new Date();
          monthName = INDO_MONTHS[now.getMonth()];
          yearNum = String(now.getFullYear());
        }

        const monthTag = `${monthName}_${yearNum}`;
        const cleanBaseName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        
        // Pastikan nama berkas menyertakan keterangan bulan agar tidak tereplace dengan berkas bulan lain
        const baseNameWithMonth = cleanBaseName.toLowerCase().includes(monthName.toLowerCase())
          ? cleanBaseName
          : `${monthTag}_${cleanBaseName}`;

        const randomPrefix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const storedFileName = `${randomPrefix}_${baseNameWithMonth}`;
        const targetPath = path.join(UPLOADS_DIR, storedFileName);

        const base64Clean = fileData.replace(/^data:[^;]+;base64,/, "");
        const fileBuffer = Buffer.from(base64Clean, "base64");

        fs.writeFileSync(targetPath, fileBuffer);

        const baseAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
        const relativeUrl = `/uploads/${storedFileName}`;
        const fullUrl = baseAppUrl ? `${baseAppUrl}${relativeUrl}` : relativeUrl;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          fileUrl: fullUrl,
          relativeUrl: relativeUrl,
          fileName: baseNameWithMonth,
          storedName: storedFileName,
          fileSize: `${(fileBuffer.length / 1024).toFixed(0)} KB`
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Gagal menyimpan berkas: " + err.message }));
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // C. Endpoint Download Paket Laporan Bulanan (.ZIP / .PDF)
  // --------------------------------------------------------------------------
  if (pathname === "/api/reports/zip" || pathname === "/api/reports/pdf") {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    const month = parsedUrl.searchParams.get("month") || "07";
    const year = parsedUrl.searchParams.get("year") || "2026";
    const userId = parsedUrl.searchParams.get("userId") || "";
    const username = parsedUrl.searchParams.get("username") || "";
    const sessionToken = parsedUrl.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const gdriveLink = parsedUrl.searchParams.get("gdriveLink") || "";

    // Gunakan getStore() yang sudah di-cache (MySQL-aware) agar data akun selalu akurat
    const liveAccounts = getAccounts();
    const liveJournals = getJournals();

    // Prioritas identifikasi user (dari yang paling reliable):
    // 1. username param — langsung dari session localStorage, konsisten di semua mode
    // 2. session token — lookup via server session store
    // 3. userId param — sebagai fallback terakhir
    // 4. Akun non-superadmin pertama (last resort)
    let targetUser = null;

    // 1. Username (paling reliable)
    if (username) {
      targetUser = liveAccounts.find(a => a.username === username || a.id === username) || null;
      if (targetUser) console.log(`[PDF/ZIP] User ditemukan via username: ${targetUser.nama}`);
    }

    // 2. Session token
    if (!targetUser && sessionToken) {
      const session = getWebSession(sessionToken);
      if (session && session.user) {
        const sessionUserId = session.user.id || session.user.username;
        const sessionUserName = session.user.username || session.user.id;
        targetUser = liveAccounts.find(a => a.username === sessionUserName || a.id === sessionUserId) || null;
        if (targetUser) console.log(`[PDF/ZIP] User ditemukan via session token: ${targetUser.nama}`);
      }
    }

    // 3. userId param
    if (!targetUser && userId) {
      targetUser = liveAccounts.find(a => a.id === userId || a.username === userId) || null;
      if (targetUser) console.log(`[PDF/ZIP] User ditemukan via userId: ${targetUser.nama}`);
    }

    // 4. Last resort: akun non-superadmin pertama
    if (!targetUser) {
      console.warn(`[PDF/ZIP] ⚠️ User tidak ditemukan (username="${username}", userId="${userId}") — fallback ke akun pertama`);
      targetUser = liveAccounts.find(a => a.role !== "superadmin")
        || liveAccounts[0]
        || { nama: "Pegawai E-Kinerja", nip: "200011192025211007", pangkat: "Pengatur Muda / II/a", jabatan: "Staff", unitKerja: "Instansi" };
    }

    const userJournals = liveJournals.filter(j => j.userId === targetUser.id || j.userId === targetUser.username);

    if (pathname === "/api/reports/pdf") {
      generateMonthlyReportPdf({
        pegawai: targetUser,
        journals: userJournals,
        month,
        year,
        gdriveLink,
        uploadsDir: UPLOADS_DIR
      }).then(pdfBuffer => {
        const cleanName = (targetUser.nama || "Pegawai").replace(/[^a-zA-Z0-9]/g, "_");
        const monthIndex = parseInt(month, 10) - 1;
        const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const monthName = NAMA_BULAN[monthIndex] || "Bulan";
        const filename = `Laporan_Kinerja_${monthName}_${year}_${cleanName}.pdf`;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.end(pdfBuffer);
      }).catch(err => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Gagal membuat PDF: " + err.message }));
      });
      return;
    }

    generateMonthlyReportZip({
      pegawai: targetUser,
      journals: userJournals,
      month,
      year,
      gdriveLink,
      uploadsDir: UPLOADS_DIR
    }).then(({ zipBuffer, zipFileName }) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);
      res.setHeader("Content-Length", zipBuffer.length);
      res.end(zipBuffer);
    }).catch(err => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Gagal membuat paket ZIP: " + err.message }));
    });
    return;
  }

  // 🛡️ KEAMANAN: PROTEKSI PATH TRAVERSAL KETAT PADA FILE SERVING STATIC
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bad Request: Invalid URI Encoding");
    return;
  }

  // Tolak Null-Byte Injection
  if (decodedPath.includes("\0")) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bad Request: Null Byte Detected");
    return;
  }

  // Normalisasi path
  const safeNormalized = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, "");
  const resolvedDist = path.resolve(DIST_DIR);
  let targetFilePath = path.resolve(DIST_DIR, safeNormalized === "/" ? "index.html" : "." + safeNormalized);

  // STRICT CONFINEMENT: File harus benar-benar berada di dalam folder dist/
  if (!targetFilePath.startsWith(resolvedDist + path.sep) && targetFilePath !== path.join(resolvedDist, "index.html")) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("403 Forbidden: Akses ke berkas di luar direktori web ditolak.");
    return;
  }

  // Jika berkas tidak ditemukan atau sebuah direktori (SPA routing), fallback ke index.html
  if (!fs.existsSync(targetFilePath) || fs.statSync(targetFilePath).isDirectory()) {
    // Berkas dengan ekstensi file spesifik yang tidak ditemukan wajib return 404 (jangan samarkan dengan index.html)
    if (path.extname(safeNormalized) !== "") {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found: Berkas tidak ditemukan.");
      return;
    }
    targetFilePath = path.join(resolvedDist, "index.html");
  }

  if (fs.existsSync(targetFilePath)) {
    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Cache static assets dengan hash di dist/assets
    if (pathname.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }

    const stream = fs.createReadStream(targetFilePath);
    stream.pipe(res);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Berkas tidak ditemukan. Harap jalankan 'npm run build' terlebih dahulu.");
  }
});

async function startServer() {
  server.listen(PORT, HOST, async () => {
    let dbStatus = "Penyimpanan Berkas JSON Lokal (database/ekinerja_store.json)";
    const activeType = getActiveDbType();

    if (activeType !== "json") {
      try {
        const dbInit = await initDatabase();
        if (dbInit.enabled) {
          const typeLabel = activeType === "postgres" ? "PostgreSQL" : "MySQL / MariaDB";
          dbStatus = `${typeLabel} - Aktif & Terhubung (${dbInit.accountCount || 0} akun)`;
          const remoteStore = await loadStoreFromDatabase();
          if (remoteStore) {
            setCachedStore(remoteStore);
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteStore, null, 2), "utf8");
            } catch (e) {}
          }
        } else {
          dbStatus = `${activeType.toUpperCase()} Fallback (${dbInit.error || dbInit.reason || "offline"}), aktif di JSON lokal`;
          
          // Background Auto-Reconnect: Coba sambungkan otomatis jika service database di Easypanel selesai booting
          let bgAttempt = 0;
          const bgReconnectTimer = setInterval(async () => {
            bgAttempt++;
            try {
              const retryInit = await initDatabase();
              if (retryInit && retryInit.enabled) {
                clearInterval(bgReconnectTimer);
                console.log(`\n🎉 [Database Reconnected] Database ${activeType.toUpperCase()} kini berhasil terhubung di background! (${retryInit.accountCount || 0} akun).`);
                const remoteStore = await loadStoreFromDatabase();
                if (remoteStore) {
                  setCachedStore(remoteStore);
                  try {
                    fs.writeFileSync(DB_FILE, JSON.stringify(remoteStore, null, 2), "utf8");
                  } catch (e) {}
                }
              }
            } catch (e) {}
            if (bgAttempt >= 30) {
              clearInterval(bgReconnectTimer);
            }
          }, 10000);
        }
      } catch (e) {
        dbStatus = `${activeType.toUpperCase()} Gagal (${e.message}), aktif di JSON lokal`;
      }
    }

    const aiConfigInfo = getAiConfig();
    console.log(`
========================================================================
🚀 [EASYPANEL / PRODUCTION SERVER] E-KINERJA AI AKTIF!
========================================================================
🌐 Web App Port   : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}
📊 API Sync Path  : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/api/sync
🗄️ Database Mode  : ${dbStatus}
✨ Gemini AI      : ${aiConfigInfo.hasServerKey ? "Aktif (Google Gemini 3.5 Flash Lite Online)" : "Mode Cerdas Heuristik ASN (Offline/Tanpa Key)"}
🩺 Health Check   : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/health
🤖 Telegram Bot   : ${process.env.TELEGRAM_BOT_TOKEN ? "Aktif Otomatis (Polling Siap)" : "Standby (Menunggu Token di Environment Easypanel)"}
========================================================================
`);
  });
}

startServer();

// Penanganan Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("Menerima sinyal SIGTERM, menutup bot, server & koneksi database...");
  try {
    const { stopBot } = await import("./telegramBot.js");
    await stopBot();
  } catch (e) {}
  try {
    const { closePool } = await import("./mysqlAdapter.js");
    await closePool();
  } catch (e) {}
  server.close(() => process.exit(0));
});

process.on("SIGINT", async () => {
  console.log("Menerima sinyal SIGINT, menutup bot, server & koneksi database...");
  try {
    const { stopBot } = await import("./telegramBot.js");
    await stopBot();
  } catch (e) {}
  try {
    const { closePool } = await import("./mysqlAdapter.js");
    await closePool();
  } catch (e) {}
  server.close(() => process.exit(0));
});
