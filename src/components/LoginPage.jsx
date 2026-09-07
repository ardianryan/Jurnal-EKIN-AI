import React, { useState, useEffect } from "react";
import { 
  LogIn, 
  Key, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff,
  Ticket,
  UserPlus,
  Briefcase,
  Building,
  CheckCircle2,
  ArrowRight,
  School,
  Lock,
  FileCheck2,
  Cpu,
  BadgeCheck
} from "lucide-react";
import { authenticate, registerAccount, getSchoolName, getSchoolLogo, fetchSsoConfig, getCachedSsoConfig, fetchPublicSchoolSettings } from "../services/accountService";

// Helper membaca posisi tab dari URL hash atau localStorage
const getInitialAuthTab = () => {
  const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
  if (hash.startsWith("sso-callback")) return "login";
  if (hash.startsWith("register") || hash.startsWith("daftar")) return "register";
  if (hash.startsWith("login") || hash.startsWith("masuk")) return "login";
  try {
    const saved = localStorage.getItem("ekinerja_auth_tab");
    if (saved === "register") return "register";
  } catch (e) {}
  return "login";
};

export default function LoginPage({ 
  onLoginSuccess,
  schoolName: propSchoolName,
  schoolLogo: propSchoolLogo
}) {
  const [activeTab, setActiveTabState] = useState(getInitialAuthTab);
  const [ssoConfig, setSsoConfig] = useState(() => getCachedSsoConfig());
  const [schoolName, setSchoolName] = useState(() => propSchoolName || getSchoolName());
  const [schoolLogo, setSchoolLogo] = useState(() => propSchoolLogo || getSchoolLogo());

  useEffect(() => {
    if (propSchoolName) {
      setSchoolName(propSchoolName);
    }
  }, [propSchoolName]);

  useEffect(() => {
    if (propSchoolLogo !== undefined) {
      setSchoolLogo(propSchoolLogo);
    }
  }, [propSchoolLogo]);

  const switchTab = (tab) => {
    setActiveTabState(tab);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      localStorage.setItem("ekinerja_auth_tab", tab);
    } catch (e) {}
    window.location.hash = `#${tab}`;
  };

  // Muat konfigurasi SSO & cek pesan error dari URL callback / redirect
  useEffect(() => {
    fetchSsoConfig().then(cfg => {
      if (cfg) {
        setSsoConfig(cfg);
        if (cfg.schoolName) setSchoolName(cfg.schoolName);
        if (cfg.schoolLogo !== undefined) setSchoolLogo(cfg.schoolLogo);
      }
    });

    fetchPublicSchoolSettings().then(data => {
      if (data?.schoolName) setSchoolName(data.schoolName);
      if (data?.schoolLogo !== undefined) setSchoolLogo(data.schoolLogo);
    });

    const handleSchoolChange = (e) => {
      if (e.detail?.schoolName) setSchoolName(e.detail.schoolName);
      if (e.detail?.schoolLogo !== undefined) setSchoolLogo(e.detail.schoolLogo);
    };

    const handleLogoChange = (e) => {
      if (e.detail?.logo !== undefined) setSchoolLogo(e.detail.logo);
    };

    window.addEventListener("ekinerja_school_changed", handleSchoolChange);
    window.addEventListener("ekinerja_logo_changed", handleLogoChange);

    const checkUrlError = () => {
      // Periksa query params baik di search maupun hash (misal #/login?error=...)
      const fullUrl = window.location.href;
      let error = null;
      if (window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.has("error")) error = params.get("error");
      }
      if (!error && fullUrl.includes("?")) {
        const queryPart = fullUrl.substring(fullUrl.indexOf("?"));
        const params = new URLSearchParams(queryPart);
        if (params.has("error")) error = params.get("error");
      }

      if (error) {
        setErrorMsg(decodeURIComponent(error));
        // Bersihkan query string dari URL agar tidak muncul terus saat refresh
        try {
          const cleanUrl = window.location.origin + window.location.pathname + "#/login";
          window.history.replaceState(null, "", cleanUrl);
        } catch (e) {}
      }
    };

    checkUrlError();

    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
      if (hash.startsWith("register") || hash.startsWith("daftar")) {
        setActiveTabState("register");
        try { localStorage.setItem("ekinerja_auth_tab", "register"); } catch (e) {}
      } else if (hash.startsWith("login") || hash.startsWith("masuk")) {
        setActiveTabState("login");
        try { localStorage.setItem("ekinerja_auth_tab", "login"); } catch (e) {}
      }
    };

    window.addEventListener("hashchange", syncFromHash);

    const currentHash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
    if (
      currentHash !== "login" && 
      currentHash !== "register" && 
      currentHash !== "daftar" &&
      !currentHash.startsWith("sso-callback")
    ) {
      const initial = getInitialAuthTab();
      window.location.hash = `#${initial}`;
    }

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("ekinerja_school_changed", handleSchoolChange);
      window.removeEventListener("ekinerja_logo_changed", handleLogoChange);
    };
  }, []);

  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // State Registrasi
  const [regCode, setRegCode] = useState("");
  const [regNama, setRegNama] = useState("");
  const [regNip, setRegNip] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPangkat, setRegPangkat] = useState("");
  const [regJabatan, setRegJabatan] = useState("");
  const [regUnitKerja, setRegUnitKerja] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Harap masukkan username dan password!");
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticate(username.trim(), password.trim());
      setIsLoading(false);

      if (!user) {
        setErrorMsg("Username atau password salah. Silakan periksa kembali kredensial Anda.");
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Gagal masuk ke sistem. Silakan coba kembali.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regCode.trim()) {
      setErrorMsg("Kode Registrasi wajib diisi. Hubungi Administrator untuk mendapatkan kode resmi.");
      return;
    }
    if (!regNama.trim()) {
      setErrorMsg("Nama Lengkap wajib diisi.");
      return;
    }
    if (!regNip.trim()) {
      setErrorMsg("NIP Pegawai wajib diisi (atau ketik '-' jika non-ASN).");
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setErrorMsg("Username minimal 3 karakter.");
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(regUsername.trim())) {
      setErrorMsg("Username hanya boleh memuat huruf, angka, titik, underscore, atau tanda hubung.");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg("Password minimal 4 karakter.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok dengan password yang dibuat.");
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await registerAccount({
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        nama: regNama.trim(),
        nip: regNip.trim(),
        pangkat: regPangkat.trim(),
        jabatan: regJabatan.trim(),
        unitKerja: regUnitKerja.trim(),
        registrationCode: regCode.trim().toUpperCase()
      });

      setIsLoading(false);
      setSuccessMsg(`Pendaftaran berhasil. Selamat datang, ${newUser.nama}. Mengalihkan ke aplikasi...`);

      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Pendaftaran gagal. Pastikan kode registrasi valid dan username belum digunakan.");
    }
  };

  return (
    <div className="auth-page-root select-none">
      {/* Main Structural Frame */}
      <div className="auth-double-bezel-outer">
        {/* Inner Core: Asymmetric Split Grid */}
        <div className="auth-double-bezel-inner">
          {/* Left Hero Column: Institutional Trust & Brand Showcase */}
          <div className="auth-hero-pane">
            {/* Top Identity Block */}
            <div>
              <div className="auth-eyebrow-tag">
                <ShieldCheck size={13} className="text-emerald-300" />
                <span>Portal Resmi Kepegawaian</span>
              </div>

              <div className="auth-hero-brand">
                <div 
                  className="auth-hero-logo"
                  style={{
                    overflow: "hidden",
                    background: schoolLogo ? "rgba(255, 255, 255, 0.08)" : undefined,
                    border: schoolLogo ? "1px solid rgba(255, 255, 255, 0.2)" : undefined
                  }}
                >
                  {schoolLogo ? (
                    <img 
                      src={schoolLogo} 
                      alt="Logo Instansi" 
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} 
                    />
                  ) : (
                    <School size={24} />
                  )}
                </div>
                <div>
                  <div className="auth-hero-subtitle">
                    Sistem Terintegrasi
                  </div>
                  <h1 className="auth-hero-title">
                    {schoolName}
                  </h1>
                </div>
              </div>

              <p className="auth-hero-lead">
                Platform pencatatan logbook kinerja harian, poles narasi SKP dengan kecerdasan buatan, dan generator laporan bulanan otomatis bagi Tenaga Pendidik &amp; Kependidikan.
              </p>

              {/* Value Highlight Items */}
              <div className="auth-feature-list">
                <div className="auth-feature-card">
                  <div className="auth-feature-icon-box">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-title">Format e-Kinerja BKN</div>
                    <div className="auth-feature-text">
                      Sesuai standar PermenPAN-RB No. 6 Tahun 2022.
                    </div>
                  </div>
                </div>

                <div className="auth-feature-card">
                  <div className="auth-feature-icon-box">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-title">Poles Bahasa Baku</div>
                    <div className="auth-feature-text">
                      Transformasi catatan harian menjadi kalimat formal kedinasan.
                    </div>
                  </div>
                </div>

                <div className="auth-feature-card">
                  <div className="auth-feature-icon-box">
                    <BadgeCheck size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-title">Autentikasi Terproteksi</div>
                    <div className="auth-feature-text">
                      Pendaftaran khusus internal instansi via Kode Undangan.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Seal / Footnote */}
            <div className="auth-hero-footnote">
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Lock size={12} />
                <span>Enkripsi Sesi 24 Jam</span>
              </div>
              <div>Edisi 2026</div>
            </div>
          </div>

          {/* Right Form Column: Elevated Double-Bezel Card Inner Core */}
          <div className="auth-form-pane">
            <div>
              {/* Header Tab Switcher (Segmented Control) */}
              <div className="auth-header-row">
                <div>
                  <h2 className="auth-form-title">
                    {activeTab === "login" ? "Selamat Datang" : "Registrasi Pegawai"}
                  </h2>
                  <div className="auth-form-desc">
                    {activeTab === "login" 
                      ? "Silakan masukkan username dan password Anda untuk masuk." 
                      : "Daftarkan akun baru menggunakan kode undangan dari administrator."}
                  </div>
                </div>

                {/* Segmented Control Buttons */}
                <div className="auth-segment-switch">
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className={`auth-segment-btn ${activeTab === "login" ? "active" : ""}`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("register")}
                    className={`auth-segment-btn ${activeTab === "register" ? "active" : ""}`}
                  >
                    Daftar
                  </button>
                </div>
              </div>

              {/* Alert Feedback Messages */}
              {errorMsg && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  fontSize: "0.82rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  lineHeight: "1.4"
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>{errorMsg}</div>
                </div>
              )}

              {successMsg && (
                <div style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  fontSize: "0.82rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  lineHeight: "1.4"
                }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>{successMsg}</div>
                </div>
              )}

              {/* TAB 1: FORM LOGIN */}
              {activeTab === "login" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* SSO OIDC Login Option (Zitadel) - DIPOSISIKAN DI ATAS */}
                  {ssoConfig?.enabled && (
                    <div>
                      <a
                        href="/api/auth/sso/zitadel/login"
                        className="auth-sso-button"
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          borderRadius: "10px",
                          background: "#ffffff",
                          border: "1.5px solid #244937",
                          color: "#1e293b",
                          fontSize: "0.88rem",
                          fontWeight: "700",
                          textDecoration: "none",
                          boxSizing: "border-box",
                          boxShadow: "0 2px 4px rgba(36, 73, 55, 0.08)",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <ShieldCheck size={19} style={{ color: "#244937" }} />
                          <span style={{ color: "#244937" }}>{ssoConfig.buttonText || "Masuk dengan SMAGE ID"}</span>
                        </div>
                        <div style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "6px",
                          background: "#f1f5f3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#244937"
                        }}>
                          <ArrowRight size={15} />
                        </div>
                      </a>

                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        margin: "1.1rem 0 0.4rem 0",
                        color: "var(--text-muted, #94a3b8)",
                        fontSize: "0.74rem"
                      }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--border-subtle, #e2e8f0)" }} />
                        <span style={{ fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>atau login akun lokal</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--border-subtle, #e2e8f0)" }} />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="auth-form">
                    {/* Field: Username */}
                    <div className="auth-form-group">
                      <label className="auth-label">
                        Username Pegawai / Admin
                      </label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Masukkan username Anda..."
                          className="auth-input"
                          autoFocus={!ssoConfig?.enabled}
                          required
                        />
                      </div>
                    </div>

                    {/* Field: Password */}
                    <div className="auth-form-group">
                      <div className="auth-label-row">
                        <label className="auth-label">
                          Kata Sandi
                        </label>
                        <span className="auth-label-sub">
                          Min. 4 Karakter
                        </span>
                      </div>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <Key size={16} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Masukkan password Anda..."
                          className="auth-input"
                          style={{ paddingRight: "2.6rem" }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="auth-eye-btn"
                          title={showPassword ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me Toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.25rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{ accentColor: "#34634b", width: "15px", height: "15px" }}
                        />
                        <span>Ingat sesi akun ini (24 jam)</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => switchTab("register")}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#34634b", fontWeight: "700" }}
                      >
                        Belum punya akun?
                      </button>
                    </div>

                    {/* Submit Button with Island Icon Pattern */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="auth-cta-button"
                    >
                      <span>{isLoading ? "Memverifikasi Kredensial..." : "Masuk ke Sistem Kinerja"}</span>
                      <div className="auth-button-island-icon">
                        <ArrowRight size={15} />
                      </div>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: FORM REGISTRASI ATAU PEMBERITAHUAN REGISTRASI TERTUTUP */}
              {activeTab === "register" && ssoConfig?.registrationMode === "closed" ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  padding: "0.5rem 0"
                }}>
                  <div style={{
                    padding: "1.25rem",
                    borderRadius: "12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", fontSize: "0.92rem", marginBottom: "0.4rem" }}>
                      <AlertCircle size={18} style={{ color: "#dc2626" }} />
                      <span>Registrasi Mandiri Ditutup</span>
                    </div>
                    <p style={{ fontSize: "0.84rem", lineHeight: "1.5", margin: 0, color: "#7f1d1d" }}>
                      {ssoConfig.closedRegistrationMessage || "Pendaftaran akun baru saat ini ditutup untuk umum. Pegawai & GTK dipersilakan melakukan pendaftaran atau pemutakhiran data melalui portal registrasi resmi instansi berikut:"}
                    </p>
                  </div>

                  {ssoConfig.closedRegistrationUrl ? (
                    <a
                      href={ssoConfig.closedRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="auth-cta-button"
                      style={{
                        textDecoration: "none",
                        background: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <span>Menuju Portal Registrasi Resmi</span>
                      <div className="auth-button-island-icon">
                        <ArrowRight size={15} />
                      </div>
                    </a>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                      Silakan hubungi Administrator Kepegawaian instansi untuk informasi pendaftaran akun.
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => switchTab("login")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#34634b",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      &larr; Kembali ke Formulir Masuk
                    </button>
                  </div>
                </div>
              ) : activeTab === "register" && (
                <form onSubmit={handleRegisterSubmit} className="auth-form">
                  {/* Field: Kode Registrasi (Wajib) */}
                  <div className="auth-form-group">
                    <div className="auth-label-row">
                      <label className="auth-label" style={{ color: "#1e3a8a" }}>
                        Kode Undangan Registrasi <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <span style={{ fontSize: "0.7rem", color: "#1e40af", fontWeight: "700", background: "#dbeafe", padding: "0.15rem 0.45rem", borderRadius: "6px" }}>
                        Wajib dari Superadmin
                      </span>
                    </div>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <Ticket size={16} style={{ color: "#2563eb" }} />
                      </div>
                      <input
                        type="text"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                        placeholder="Contoh: EKIN-AB12CD"
                        className="auth-input auth-input-code"
                        required
                      />
                    </div>
                  </div>

                  {/* Grid 2 Kolom: Nama Lengkap & NIP */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
                    <div className="auth-form-group">
                      <label className="auth-label">
                        Nama Lengkap <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={regNama}
                        onChange={(e) => setRegNama(e.target.value)}
                        placeholder="Dr. Ir. Budi Santoso"
                        className="auth-input"
                        style={{ paddingLeft: "1rem" }}
                        required
                      />
                    </div>
                    <div className="auth-form-group">
                      <label className="auth-label">
                        NIP Pegawai <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={regNip}
                        onChange={(e) => setRegNip(e.target.value)}
                        placeholder="198507... atau -"
                        className="auth-input"
                        style={{ paddingLeft: "1rem" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Field: Username */}
                  <div className="auth-form-group">
                    <label className="auth-label">
                      Username Baru <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="budi_santoso"
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  {/* Grid 2 Kolom: Password & Konfirmasi */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="auth-form-group">
                      <label className="auth-label">
                        Password <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <div className="auth-input-wrapper">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 4 karakter"
                          className="auth-input"
                          style={{ paddingLeft: "1rem", paddingRight: "2.2rem" }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="auth-eye-btn"
                        >
                          {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="auth-form-group">
                      <label className="auth-label">
                        Konfirmasi <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <input
                        type={showRegPassword ? "text" : "password"}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Ulangi password"
                        className="auth-input"
                        style={{ paddingLeft: "1rem" }}
                        required
                      />
                    </div>
                  </div>

                  {/* Data Kedinasan Tambahan (Collapsible/Soft Container) */}
                  <div style={{
                    padding: "0.75rem",
                    borderRadius: "12px",
                    background: "var(--bg-tertiary, #f8fafc)",
                    border: "1px solid var(--border-subtle, #e2e8f0)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Informasi Kedinasan (Opsional):
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={regPangkat}
                        onChange={(e) => setRegPangkat(e.target.value)}
                        placeholder="Pangkat / Golongan"
                        className="auth-input"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.78rem" }}
                      />
                      <input
                        type="text"
                        value={regJabatan}
                        onChange={(e) => setRegJabatan(e.target.value)}
                        placeholder="Jabatan Kedinasan"
                        className="auth-input"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.78rem" }}
                      />
                    </div>
                    <input
                      type="text"
                      value={regUnitKerja}
                      onChange={(e) => setRegUnitKerja(e.target.value)}
                      placeholder={`Unit Kerja (misal: ${schoolName})`}
                      className="auth-input"
                      style={{ padding: "0.5rem 0.75rem", fontSize: "0.78rem" }}
                    />
                  </div>

                  {/* Submit Button with Island Icon Pattern */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-cta-button"
                  >
                    <span>{isLoading ? "Mendaftarkan Akun..." : "Daftar & Masuk Sekarang"}</span>
                    <div className="auth-button-island-icon">
                      <UserPlus size={15} />
                    </div>
                  </button>
                </form>
              )}
            </div>

            {/* Micro Footnote / Help */}
            <div style={{
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-subtle, #f1f5f9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.72rem",
              color: "var(--text-muted, #94a3b8)"
            }}>
              <span>Keamanan Kredensial Terenkripsi</span>
              <span>{schoolName} &bull; v2.4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
