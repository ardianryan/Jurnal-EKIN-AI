import React, { useState } from "react";
import Sheet from "./ui/Sheet";
import { 
  X, 
  LogIn, 
  Key, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  Ticket, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { authenticate, registerAccount, getCachedSsoConfig, fetchSsoConfig } from "../services/accountService";

export default function LoginModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onLoginSuccess,
  onLogout 
}) {
  const [activeTab, setActiveTab] = useState("login"); // "login" | "register"
  const [ssoConfig, setSsoConfig] = useState(() => getCachedSsoConfig());

  // Muat status SSO
  React.useEffect(() => {
    if (isOpen) {
      fetchSsoConfig().then(cfg => {
        if (cfg) setSsoConfig(cfg);
      });
    }
  }, [isOpen]);

  // State Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // State Register
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

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan password wajib diisi!");
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticate(username.trim(), password.trim());
      setIsLoading(false);
      if (!user) {
        setErrorMsg("Username atau password salah! Silakan coba lagi.");
        return;
      }

      if (onLoginSuccess) onLoginSuccess(user);
      onClose();
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Gagal masuk ke sistem. Silakan coba kembali.");
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regCode.trim()) {
      setErrorMsg("Kode registrasi wajib diisi!");
      return;
    }
    if (!regNama.trim()) {
      setErrorMsg("Nama lengkap wajib diisi!");
      return;
    }
    if (!regNip.trim()) {
      setErrorMsg("NIP wajib diisi (atau ketik '-' jika non-PNS)!");
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
      setErrorMsg("Konfirmasi password tidak cocok!");
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
      setSuccessMsg(`Pendaftaran berhasil! Selamat datang, ${newUser.nama}.`);

      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(newUser);
        onClose();
      }, 900);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Pendaftaran gagal. Pastikan kode registrasi valid dan aktif.");
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === "login" ? "Masuk / Ganti Akun" : "Daftar Akun Baru"}
      description={activeTab === "login" ? "Gunakan akun yang telah terdaftar di sistem E-Kinerja" : "Wajib menggunakan kode undangan resmi dari Admin"}
      size={activeTab === "register" ? "lg" : "md"}
    >

        {/* Tab Toggle */}
        <div style={{
          padding: "0.75rem 1.5rem 0.25rem 1.5rem",
          display: "flex",
          gap: "0.5rem",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)"
        }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "login" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <LogIn size={14} />
            <span>Masuk (Login)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "register" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <UserPlus size={14} />
            <span>Daftar Akun</span>
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto" }}>
          {/* Status Akun Aktif (Hanya di tab login) */}
          {activeTab === "login" && currentUser && (
            <div style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    {currentUser.nama}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Username: <strong>{currentUser.username}</strong> &bull; {currentUser.role === "superadmin" ? "Superadmin" : "Pegawai"}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.75rem", color: "#dc2626", padding: "0.2rem 0.5rem" }}
                  title="Keluar dari sesi akun ini"
                >
                  Keluar
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: "#fef2f2",
              color: "#991b1b",
              padding: "0.65rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.45rem",
              lineHeight: "1.4"
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: "#ecfdf5",
              color: "#065f46",
              padding: "0.65rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem"
            }}>
              <CheckCircle2 size={16} style={{ color: "#059669", flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB LOGIN */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                <label className="form-label" style={{ fontWeight: "600", fontSize: "0.82rem" }}>
                  Username
                </label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input-field"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username Anda..."
                    style={{ paddingLeft: "2rem", fontSize: "0.85rem" }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label className="form-label" style={{ fontWeight: "600", fontSize: "0.82rem" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Key size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password akun..."
                    style={{ paddingLeft: "2rem", paddingRight: "2.4rem", fontSize: "0.85rem" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: "4px"
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group w-full rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-between shadow-md"
                style={{
                  background: "linear-gradient(135deg, #1f3d2e 0%, #34634b 100%)"
                }}
              >
                <span className="pl-1">
                  {isLoading ? "Memverifikasi..." : "Masuk ke Akun"}
                </span>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                  <LogIn size={13} className="text-white" />
                </div>
              </button>

              {/* SSO Zitadel Button Option */}
              {ssoConfig?.enabled && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    margin: "0.75rem 0",
                    color: "var(--text-muted)",
                    fontSize: "0.72rem"
                  }}>
                    <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                    <span>atau</span>
                    <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                  </div>

                  <a
                    href="/api/auth/sso/zitadel/login"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.55rem 1rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--border-strong, #cbd5e1)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      textDecoration: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ShieldCheck size={16} style={{ color: "var(--accent-primary)" }} />
                      <span>{ssoConfig.buttonText || "Masuk dengan SSO"}</span>
                    </div>
                    <LogIn size={13} style={{ color: "var(--text-muted)" }} />
                  </a>
                </div>
              )}
            </form>
          )}

          {/* TAB REGISTER ATAU NOTIFIKASI REGISTRASI TERTUTUP */}
          {activeTab === "register" && ssoConfig?.registrationMode === "closed" ? (
            <div style={{ padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                lineHeight: "1.45"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "700", marginBottom: "0.3rem" }}>
                  <AlertCircle size={16} style={{ color: "#dc2626" }} />
                  <span>Registrasi Mandiri Ditutup</span>
                </div>
                <p style={{ margin: 0 }}>
                  {ssoConfig.closedRegistrationMessage || "Pendaftaran akun baru saat ini ditutup untuk umum. Pegawai & GTK dipersilakan melakukan pendaftaran atau pemutakhiran data melalui portal registrasi resmi instansi berikut:"}
                </p>
              </div>

              {ssoConfig.closedRegistrationUrl ? (
                <a
                  href={ssoConfig.closedRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 active:scale-[0.98] flex items-center justify-between shadow-md"
                  style={{
                    background: "#1e3a8a",
                    textDecoration: "none"
                  }}
                >
                  <span className="pl-1">Menuju Portal Registrasi Resmi</span>
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                    <UserPlus size={13} className="text-white" />
                  </div>
                </a>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Silakan hubungi Administrator Kepegawaian instansi untuk informasi pendaftaran akun.
                </div>
              )}
            </div>
          ) : activeTab === "register" && (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", color: "var(--accent-primary)" }}>
                  Kode Registrasi / Undangan <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Ticket size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--accent-primary)" }} />
                  <input
                    type="text"
                    className="input-field"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: EKIN-AB12CD"
                    style={{ 
                      paddingLeft: "2rem", 
                      fontSize: "0.88rem", 
                      fontWeight: "700", 
                      textTransform: "uppercase", 
                      background: "rgba(52, 99, 75, 0.04)", 
                      letterSpacing: "1px"
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                    Nama Lengkap <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                    placeholder="Nama & gelar..."
                    style={{ fontSize: "0.82rem" }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                    NIP Pegawai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    placeholder="NIP atau -"
                    style={{ fontSize: "0.82rem" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                  Username <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Username unik..."
                  style={{ fontSize: "0.82rem" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                    Password <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      className="input-field"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 karakter"
                      style={{ fontSize: "0.82rem", paddingRight: "2rem" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)"
                      }}
                    >
                      {showRegPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: "600", fontSize: "0.8rem" }}>
                    Konfirmasi <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    className="input-field"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi..."
                    style={{ fontSize: "0.82rem" }}
                    required
                  />
                </div>
              </div>

              <div style={{
                background: "var(--bg-tertiary)",
                padding: "0.65rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem"
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)" }}>
                  Data Kedinasan (Opsional):
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  <input
                    type="text"
                    className="input-field"
                    value={regPangkat}
                    onChange={(e) => setRegPangkat(e.target.value)}
                    placeholder="Pangkat/Golongan"
                    style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    value={regJabatan}
                    onChange={(e) => setRegJabatan(e.target.value)}
                    placeholder="Jabatan Kedinasan"
                    style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
                  />
                </div>
                <input
                  type="text"
                  className="input-field"
                  value={regUnitKerja}
                  onChange={(e) => setRegUnitKerja(e.target.value)}
                  placeholder="Unit Kerja (contoh: SMK N 07 SAMARINDA)"
                  style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group w-full rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-between shadow-md mt-2"
                style={{
                  background: "linear-gradient(135deg, #1f3d2e 0%, #34634b 100%)"
                }}
              >
                <span className="pl-1">
                  {isLoading ? "Mendaftarkan..." : "Daftar & Masuk Sekarang"}
                </span>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                  <UserPlus size={13} className="text-white" />
                </div>
              </button>
            </form>
          )}

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.9rem", marginTop: "1.2rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              <ShieldCheck size={13} style={{ color: "#059669" }} />
              <span>Sistem Terotentikasi &amp; Terproteksi Kode Undangan</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Hubungi Superadmin instansi jika memerlukan kode pendaftaran atau reset kata sandi.
            </div>
          </div>
        </div>
    </Sheet>
  );
}
