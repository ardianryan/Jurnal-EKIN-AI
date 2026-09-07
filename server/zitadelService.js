import crypto from "crypto";

/**
 * Service untuk mengelola autentikasi OIDC Zitadel & Validasi Metadata Pengguna
 */

// Memory store sementara untuk state & nonce login OIDC (cegah CSRF)
const pendingAuthStates = new Map();

// Bersihkan state kadaluwarsa setiap 10 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingAuthStates.entries()) {
    if (now - val.createdAt > 10 * 60 * 1000) {
      pendingAuthStates.delete(key);
    }
  }
}, 600000);

/**
 * Ambil konfigurasi Zitadel efektif dari database store atau environment
 */
export function getZitadelConfig(storeSettings = {}) {
  const sso = storeSettings.sso || {};
  return {
    enabled: typeof sso.enabled !== "undefined" ? Boolean(sso.enabled) : (Boolean(process.env.ZITADEL_CLIENT_ID) || false),
    issuer: (sso.issuer || process.env.ZITADEL_ISSUER || "").trim().replace(/\/+$/, ""),
    clientId: (sso.clientId || process.env.ZITADEL_CLIENT_ID || "").trim(),
    clientSecret: (sso.clientSecret || process.env.ZITADEL_CLIENT_SECRET || "").trim(),
    buttonText: (sso.buttonText || process.env.ZITADEL_BUTTON_TEXT || "Masuk dengan SSO").trim(),
    scopes: sso.scopes || "openid profile email urn:zitadel:iam:user:metadata urn:zitadel:iam:org:project:roles",
    registrationMode: storeSettings.registrationPolicy?.mode || "open", // "open" | "closed"
    closedRegistrationUrl: storeSettings.registrationPolicy?.closedRegistrationUrl || "",
    closedRegistrationMessage: storeSettings.registrationPolicy?.closedRegistrationMessage || "Pendaftaran mandiri dinonaktifkan. Silakan daftar melalui portal resmi berikut:"
  };
}

/**
 * Decode string Base64 / Base64URL secara aman (mendukung padding dan unpadded format Zitadel)
 */
export function decodeBase64Safe(str) {
  if (typeof str !== "string") return str;
  const trimmed = str.trim();
  if (!trimmed) return trimmed;

  // Cek apakah string tampak seperti format Base64 / Base64URL
  if (/^[A-Za-z0-9+/_=-]+$/.test(trimmed)) {
    try {
      let normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
      while (normalized.length % 4 !== 0) {
        normalized += "=";
      }
      const buf = Buffer.from(normalized, "base64");
      const decoded = buf.toString("utf8");
      // Pastikan hasil decode adalah teks valid manusia (tidak mengandung byte korup \ufffd)
      if (decoded && !decoded.includes("\ufffd") && /^[\p{L}\p{N}\s\-.,_/:@()'"#+]+$/u.test(decoded)) {
        return decoded;
      }
    } catch (e) {}
  }
  return trimmed;
}

/**
 * Decode payload JWT secara aman tanpa dependensi eksternal
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return {};
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    let payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payloadBase64.length % 4 !== 0) {
      payloadBase64 += "=";
    }
    const jsonStr = Buffer.from(payloadBase64, "base64").toString("utf8");
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
}

/**
 * Validasi dan ekstraksi profil/metadata pengguna dari Zitadel
 * Strict Rules:
 * - Wajib memiliki metadata peran sebagai 'guru' atau 'tendik' (atau superadmin)
 * - Wajib memiliki NIP valid (minimal 8 digit angka)
 * - Metadata kosong atau tidak memenuhi syarat DITOLAK
 */
export function validateZitadelMetadata(rawMetadata = {}, userClaims = {}) {
  // 1. Normalisasi metadata kunci (case-insensitive / auto decode base64 & base64url)
  const meta = {};
  
  // Gabungkan klaim metadata dari berbagai sumber (rawMetadata dan userClaims)
  const claimMeta = userClaims["urn:zitadel:iam:user:metadata"] || userClaims.metadata || {};
  const combinedRaw = { 
    ...(typeof claimMeta === "object" && claimMeta !== null ? claimMeta : {}), 
    ...(typeof rawMetadata === "object" && rawMetadata !== null ? rawMetadata : {}) 
  };

  for (const [key, value] of Object.entries(combinedRaw)) {
    const cleanKey = String(key).toLowerCase().trim();
    meta[cleanKey] = decodeBase64Safe(value);
  }

  // 2. Kumpulkan seluruh indikator peran/role
  const roleCandidates = [];

  const checkAndPushRole = (val) => {
    if (!val) return;
    if (typeof val === "string") {
      const decodedVal = decodeBase64Safe(val);
      roleCandidates.push(String(decodedVal).toLowerCase().trim());
    } else if (Array.isArray(val)) {
      val.forEach(item => checkAndPushRole(item));
    } else if (typeof val === "object" && val !== null) {
      Object.keys(val).forEach(k => checkAndPushRole(k));
      Object.values(val).forEach(v => checkAndPushRole(v));
    }
  };

  // Periksa seluruh nilai dalam metadata yang telah dinormalisasi
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "string") checkAndPushRole(v);
  }

  // Periksa user claims Zitadel (project roles, group, role langsung)
  if (userClaims["urn:zitadel:iam:org:project:roles"]) {
    checkAndPushRole(userClaims["urn:zitadel:iam:org:project:roles"]);
  }
  if (userClaims.role) checkAndPushRole(userClaims.role);
  if (userClaims.roles) checkAndPushRole(userClaims.roles);
  if (userClaims.groups) checkAndPushRole(userClaims.groups);

  let detectedRole = null;
  if (roleCandidates.some(r => r.includes("guru") || r.includes("pendidik") || r.includes("pengajar"))) {
    detectedRole = "guru";
  } else if (roleCandidates.some(r => r.includes("tendik") || r.includes("kependidikan") || r.includes("tata usaha") || r.includes("tu") || r.includes("administrasi"))) {
    detectedRole = "tendik";
  } else if (roleCandidates.some(r => r === "superadmin" || r === "admin")) {
    detectedRole = "superadmin";
  }

  // 3. Ekstrak NIP (Wajib ada dan valid minimal 8 digit)
  let rawNip = "";
  ["nip", "nomor_induk", "nip_baru", "nip_pegawai", "nip_guru", "nip_tendik"].forEach(k => {
    if (!rawNip && meta[k]) rawNip = String(meta[k]).trim();
  });
  if (!rawNip && userClaims.nip) rawNip = String(userClaims.nip).trim();
  if (!rawNip && userClaims.nomor_induk) rawNip = String(userClaims.nomor_induk).trim();

  // Fallback 1: periksa apakah ada nilai di metadata yang berupa angka NIP (8 - 18 digit)
  if (!rawNip) {
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === "string") {
        const digits = v.replace(/\D/g, "");
        if (digits.length >= 8 && (k.includes("nip") || k.includes("induk") || digits.length === 18)) {
          rawNip = digits;
          break;
        }
      }
    }
  }

  // Fallback 2: periksa jika username / preferred_username adalah NIP (deretan angka >= 8 digit)
  if (!rawNip && userClaims.preferred_username) {
    const prefDigits = String(userClaims.preferred_username).replace(/\D/g, "");
    if (prefDigits.length >= 8 && (prefDigits.length === 18 || prefDigits.startsWith("19") || prefDigits.startsWith("20"))) {
      rawNip = prefDigits;
    }
  }
  if (!rawNip && userClaims.username) {
    const uDigits = String(userClaims.username).replace(/\D/g, "");
    if (uDigits.length >= 8 && (uDigits.length === 18 || uDigits.startsWith("19") || uDigits.startsWith("20"))) {
      rawNip = uDigits;
    }
  }

  const digitsOnlyNip = rawNip.replace(/\D/g, "");
  const hasValidNip = Boolean(digitsOnlyNip && digitsOnlyNip.length >= 8);

  // 4. Validasi Ketat: Hanya user dengan metadata guru / tendik DAN memiliki NIP yang diizinkan
  let allowed = true;
  let reason = "";

  const hasValidRole = detectedRole === "guru" || detectedRole === "tendik" || detectedRole === "superadmin";

  if (!hasValidRole && !hasValidNip) {
    allowed = false;
    reason = "Akses Ditolak: Akun SSO Anda tidak memiliki metadata profil yang dibutuhkan (Wajib memiliki metadata peran Guru/Tendik dan NIP terdaftar). Silakan hubungi Administrator untuk melengkapi metadata profil Anda di portal SSO.";
  } else if (!hasValidRole) {
    allowed = false;
    reason = "Akses Ditolak: Akun SSO Anda tidak memiliki metadata peran resmi sebagai Guru atau Tenaga Kependidikan (Tendik). Hanya akun dengan metadata Guru atau Tendik yang diizinkan mengakses E-Kinerja.";
  } else if (!hasValidNip) {
    allowed = false;
    reason = "Akses Ditolak: Akun SSO Anda belum memiliki NIP (Nomor Induk Pegawai) terdaftar. Hubungi Administrator untuk melengkapi metadata NIP Anda di portal SSO.";
  }

  // Ekstrak NIK jika ada
  const rawNik = String(meta.nik || userClaims.nik || "").trim();
  const digitsOnlyNik = rawNik.replace(/\D/g, "");

  return {
    allowed,
    reason,
    nip: digitsOnlyNip,
    nik: digitsOnlyNik,
    role: detectedRole || "pegawai",
    academicYearId: meta.academic_year_id || userClaims.academic_year_id || "",
    uuid: meta.uuid || userClaims.sub || "",
    source: meta.source || "scholargate_sso",
    jabatan: meta.jabatan || (detectedRole === "guru" ? "Guru Mata Pelajaran" : (detectedRole === "tendik" ? "Tenaga Administrasi Sekolah" : "Pegawai")),
    pangkat: meta.pangkat || ""
  };
}

/**
 * Buat URL otorisasi Zitadel OIDC
 */
export function buildZitadelAuthorizeUrl(config, redirectUri) {
  if (!config.issuer || !config.clientId) {
    throw new Error("Konfigurasi SSO (Issuer atau Client ID) belum diatur di server.");
  }

  // Normalisasi issuer agar selalu memiliki protokol https://
  let cleanIssuer = (config.issuer || "").trim().replace(/\/+$/, "");
  if (!cleanIssuer.startsWith("http://") && !cleanIssuer.startsWith("https://")) {
    cleanIssuer = `https://${cleanIssuer}`;
  }

  const state = crypto.randomBytes(24).toString("hex");
  const nonce = crypto.randomBytes(24).toString("hex");

  pendingAuthStates.set(state, {
    nonce,
    redirectUri,
    createdAt: Date.now()
  });

  const authUrl = new URL(`${cleanIssuer}/oauth/v2/authorize`);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes || "openid profile email urn:zitadel:iam:user:metadata urn:zitadel:iam:org:project:roles");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  return { url: authUrl.toString(), state };
}

/**
 * Tukar kode otorisasi Zitadel dengan token & ambil UserInfo + Metadata
 */
export async function exchangeZitadelCode(code, state, config, redirectUri) {
  const pending = pendingAuthStates.get(state);
  if (!pending) {
    throw new Error("State OIDC tidak valid atau sesi login telah kedaluwarsa. Silakan coba kembali.");
  }
  pendingAuthStates.delete(state);

  const tokenEndpoint = `${config.issuer}/oauth/v2/token`;

  const bodyParams = new URLSearchParams();
  bodyParams.set("grant_type", "authorization_code");
  bodyParams.set("code", code);
  bodyParams.set("redirect_uri", redirectUri);
  bodyParams.set("client_id", config.clientId);
  if (config.clientSecret) {
    bodyParams.set("client_secret", config.clientSecret);
  }

  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: bodyParams.toString()
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`❌ [Zitadel Token Error] HTTP ${tokenRes.status} ${tokenRes.statusText}:`, errText);
    throw new Error(`Gagal otentikasi token SSO: ${tokenRes.statusText} (${errText})`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  console.log("🎟️ [Zitadel Token Exchange] Token berhasil diperoleh. TokenType:", tokenData.token_type, "ExpiresIn:", tokenData.expires_in);

  // Ambil data UserInfo & Metadata dari Zitadel
  const userInfoEndpoint = `${config.issuer}/oidc/v1/userinfo`;
  console.log(`📡 [Zitadel UserInfo] Memanggil endpoint UserInfo: ${userInfoEndpoint}`);
  const userRes = await fetch(userInfoEndpoint, {
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  });

  if (!userRes.ok) {
    const userErrText = await userRes.text();
    console.error(`❌ [Zitadel UserInfo Error] HTTP ${userRes.status} ${userRes.statusText}:`, userErrText);
    throw new Error(`Gagal mengambil profil akun dari SSO: ${userRes.statusText}`);
  }

  const userInfo = await userRes.json();
  console.log("📋 [Zitadel Raw UserInfo]:", JSON.stringify(userInfo));

  // Ambil claims tambahan dari ID Token jika tersedia
  let idTokenClaims = {};
  if (tokenData.id_token) {
    idTokenClaims = decodeJwtPayload(tokenData.id_token);
    console.log("📋 [Zitadel ID Token Claims]:", JSON.stringify(idTokenClaims));
  }

  const mergedClaims = { ...idTokenClaims, ...userInfo };

  // Ekstrak metadata khusus (Zitadel menyimpan metadata di claim 'urn:zitadel:iam:user:metadata' atau langsung)
  let rawMetadata = mergedClaims["urn:zitadel:iam:user:metadata"] || mergedClaims.metadata || {};
  
  // Jika metadata berbentuk object berpasangan base64 / plain, lakukan decode otomatis
  const metadataObj = {};
  if (typeof rawMetadata === "object" && rawMetadata !== null) {
    for (const [k, v] of Object.entries(rawMetadata)) {
      metadataObj[k] = decodeBase64Safe(v);
    }
  }

  // Jika ada custom claim langsung di payload userInfo / idToken
  ["role", "nip", "nik", "academic_year_id", "uuid", "source", "ptk_id", "dapodik_id"].forEach(key => {
    if (mergedClaims[key] && !metadataObj[key]) {
      metadataObj[key] = decodeBase64Safe(mergedClaims[key]);
    }
  });

  return {
    userInfo: mergedClaims,
    metadata: metadataObj
  };
}
