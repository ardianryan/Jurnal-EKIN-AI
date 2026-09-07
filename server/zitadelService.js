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
    scopes: sso.scopes || "openid profile email urn:zitadel:iam:user:metadata",
    registrationMode: storeSettings.registrationPolicy?.mode || "open", // "open" | "closed"
    closedRegistrationUrl: storeSettings.registrationPolicy?.closedRegistrationUrl || "",
    closedRegistrationMessage: storeSettings.registrationPolicy?.closedRegistrationMessage || "Pendaftaran mandiri dinonaktifkan. Silakan daftar melalui portal resmi berikut:"
  };
}

/**
 * Validasi dan ekstraksi profil/metadata pengguna dari Zitadel
 * Otomatis menerima pengguna terautentikasi dan mengekstrak data identitas (NIP, NIK, Nama, Role)
 */
export function validateZitadelMetadata(rawMetadata = {}, userClaims = {}) {
  // Normalisasi metadata kunci (case-insensitive / format base64)
  const meta = {};
  if (typeof rawMetadata === "object" && rawMetadata !== null) {
    for (const [key, value] of Object.entries(rawMetadata)) {
      const cleanKey = String(key).toLowerCase().trim();
      let cleanVal = value;
      if (typeof value === "string") {
        try {
          const decoded = Buffer.from(value, "base64").toString("utf8");
          if (decoded && /^[\x20-\x7E]+$/.test(decoded)) {
            cleanVal = decoded;
          }
        } catch (e) {}
      }
      meta[cleanKey] = cleanVal;
    }
  }

  // Ekstrak Role jika ada (fallback ke pegawai jika tidak spesifik)
  let role = String(meta.role || userClaims["urn:zitadel:iam:org:project:roles"] || userClaims.role || "pegawai").toLowerCase().trim();
  if (role.includes("guru")) role = "guru";
  else if (role.includes("tendik")) role = "tendik";
  else if (role.includes("admin")) role = "superadmin";
  else role = "pegawai";

  // Ekstrak NIP jika ada
  const rawNip = String(meta.nip || meta.nomor_induk || userClaims.nip || "").trim();
  const digitsOnlyNip = rawNip.replace(/\D/g, "");

  // Ekstrak NIK jika ada
  const rawNik = String(meta.nik || userClaims.nik || "").trim();
  const digitsOnlyNik = rawNik.replace(/\D/g, "");

  return {
    allowed: true,
    nip: digitsOnlyNip,
    nik: digitsOnlyNik,
    role,
    academicYearId: meta.academic_year_id || userClaims.academic_year_id || "",
    uuid: meta.uuid || userClaims.sub || "",
    source: meta.source || "scholargate_sso"
  };
}

/**
 * Buat URL otorisasi Zitadel OIDC
 */
export function buildZitadelAuthorizeUrl(config, redirectUri) {
  if (!config.issuer || !config.clientId) {
    throw new Error("Konfigurasi Zitadel (Issuer atau Client ID) belum diatur di server.");
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
  authUrl.searchParams.set("scope", config.scopes || "openid profile email urn:zitadel:iam:user:metadata");
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
    throw new Error(`Gagal otentikasi token Zitadel: ${tokenRes.statusText} (${errText})`);
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
    throw new Error(`Gagal mengambil UserInfo dari Zitadel: ${userRes.statusText}`);
  }

  const userInfo = await userRes.json();
  console.log("📋 [Zitadel Raw UserInfo]:", JSON.stringify(userInfo));

  // Ekstrak metadata khusus (Zitadel menyimpan metadata di claim 'urn:zitadel:iam:user:metadata' atau langsung)
  let rawMetadata = userInfo["urn:zitadel:iam:user:metadata"] || userInfo.metadata || {};
  
  // Jika metadata berbentuk object berpasangan base64 / plain
  const metadataObj = {};
  if (typeof rawMetadata === "object" && rawMetadata !== null) {
    for (const [k, v] of Object.entries(rawMetadata)) {
      metadataObj[k] = v;
    }
  }

  // Jika ada custom claim langsung di payload userInfo
  ["role", "nip", "nik", "academic_year_id", "uuid", "source"].forEach(key => {
    if (userInfo[key] && !metadataObj[key]) {
      metadataObj[key] = userInfo[key];
    }
  });

  return {
    userInfo,
    metadata: metadataObj
  };
}
