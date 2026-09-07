import React, { useState, useEffect } from "react";
import Sheet from "./ui/Sheet";
import { 
  LogIn, 
  Key, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  Ticket, 
  Eye, 
  EyeOff,
  LogOut,
  Hash,
  Award,
  Briefcase,
  Building2,
  Save,
  Sparkles,
  ArrowRight,
  UserCheck
} from "lucide-react";
import confetti from "canvas-confetti";
import { 
  authenticate, 
  registerAccount, 
  saveAccount, 
  getSchoolName, 
  getCachedSsoConfig, 
  fetchSsoConfig 
} from "../services/accountService";
import { getMasterJabatan } from "../services/jabatanService";

const GOLONGAN_OPTIONS = [
  "Pengatur Muda / II/a",
  "Pengatur Muda Tk. I / II/b",
  "Pengatur / II/c",
  "Pengatur Tk. I / II/d",
  "Penata Muda / III/a",
  "Penata Muda Tk. I / III/b",
  "Penata / III/c",
  "Penata Tk. I / III/d",
  "Pembina / IV/a",
  "Pembina Tk. I / IV/b",
  "Pembina Utama Muda / IV/c",
  "Pembina Utama Madya / IV/d",
  "Pembina Utama / IV/e",
  "PPPK / Non-PNS"
];

export default function LoginModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onLoginSuccess,
  onLogout 
}) {
  // Mode Tab: "profile" | "login" | "register"
  const [activeTab, setActiveTab] = useState(currentUser ? "profile" : "login");
  const [ssoConfig, setSsoConfig] = useState(() => getCachedSsoConfig());

  // State Profile Editor
  const [profileNama, setProfileNama] = useState("");
  const [profileNip, setProfileNip] = useState("");
  const [profilePangkat, setProfilePangkat] = useState("Penata Muda / III/a");
  const [profileJabatan, setProfileJabatan] = useState("");
  const [profileUnitKerja, setProfileUnitKerja] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);

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

  // Muat status SSO saat sheet dibuka
  useEffect(() => {
    if (isOpen) {
      fetchSsoConfig().then(cfg => {
        if (cfg) setSsoConfig(cfg);
      });
    }
  }, [isOpen]);

  // Sinkronisasi data saat modal dibuka atau currentUser berubah
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      if (currentUser) {
        setActiveTab("profile");
        setProfileNama(currentUser.nama || "");
        setProfileNip(currentUser.nip && currentUser.nip !== "-" ? currentUser.nip : "");
        setProfilePangkat(currentUser.pangkat && currentUser.pangkat !== "-" ? currentUser.pangkat : "Penata Muda / III/a");
        setProfileJabatan(currentUser.jabatan && currentUser.jabatan !== "-" ? currentUser.jabatan : "");
        setProfileUnitKerja(currentUser.unitKerja && currentUser.unitKerja !== "-" ? currentUser.unitKerja : (getSchoolName() || ""));
        setProfileNewPassword("");
      } else {
        setActiveTab("login");
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // --- HANDLER SIMPAN PERUBAHAN PROFIL ---
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanNama = profileNama.trim();
    const cleanNip = profileNip.trim();
    const cleanJabatan = profileJabatan.trim();
    const cleanUnitKerja = profileUnitKerja.trim();

    if (!cleanNama) {
      setErrorMsg("Nama Lengkap & Gelar wajib diisi!");
      return;
    }
    if (!cleanNip) {
      setErrorMsg("NIP Pegawai wajib diisi (atau ketik '-' jika non-PNS)!");
      return;
    }
    if (!cleanJabatan) {
      setErrorMsg("Jabatan kedinasan wajib diisi atau dipilih dari Master!");
      return;
    }
    if (!cleanUnitKerja) {
      setErrorMsg("Unit Kerja / Satker wajib diisi!");
      return;
    }
    if (profileNewPassword && profileNewPassword.length < 4) {
      setErrorMsg("Password baru minimal 4 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = {
        ...currentUser,
        nama: cleanNama,
        nip: cleanNip,
        pangkat: profilePangkat || "Penata Muda / III/a",
        jabatan: cleanJabatan,
        unitKerja: cleanUnitKerja
      };

      if (profileNewPassword.trim()) {
        updatedUser.password = profileNewPassword.trim();
      }

      saveAccount(updatedUser);
      setIsLoading(false);
      setSuccessMsg("Perubahan profil berhasil disimpan!");

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onLoginSuccess) {
        onLoginSuccess(updatedUser);
      }
      setProfileNewPassword("");
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || "Gagal memperbarui profil pengguna.");
    }
  };

  // --- HANDLER LOGIN MANUAL ---
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

  // --- HANDLER REGISTER AKUN ---
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

  // Judul & deskripsi dinamis
  const getSheetTitle = () => {
    if (currentUser) {
      if (activeTab === "profile") return "Profil Pengguna & Akun";
      if (activeTab === "register") return "Daftar Akun Baru";
      return "Ganti / Masuk Akun Lain";
    }
    if (activeTab === "register") return "Daftar Akun Baru";
    return "Masuk ke Sistem E-Kinerja";
  };

  const getSheetDescription = () => {
    if (currentUser && activeTab === "profile") {
      return "Perbarui nama, NIP, pangkat, jabatan, dan satuan kerja laporan kinerja Anda";
    }
    if (activeTab === "register") {
      return "Wajib menggunakan kode undangan resmi dari Admin";
    }
    return "Gunakan akun yang telah terdaftar di sistem E-Kinerja";
  };

  const isSuperadmin = currentUser?.role === "superadmin";
  const isFromSso = Boolean(currentUser?.ssoSource || currentUser?.ssoRole);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={getSheetTitle()}
      description={getSheetDescription()}
      size={activeTab === "profile" || activeTab === "register" ? "lg" : "md"}
    >
      {/* Tab Navigation */}
      <div style={{
        padding: "0.75rem 1.5rem 0.25rem 1.5rem",
        display: "flex",
        gap: "0.5rem",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        {currentUser ? (
          <>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "profile" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setActiveTab("profile");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <User size={14} />
              <span>Profil Saya</span>
            </button>

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
              <span>Ganti Akun</span>
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div style={{ padding: "1.5rem", overflowY: "auto" }}>
        {/* Pesan Error */}
        {errorMsg && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "0.65rem 0.85rem",
            borderRadius: "8px",
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

        {/* Pesan Sukses */}
        {successMsg && (
          <div style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "0.65rem 0.85rem",
            borderRadius: "8px",
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

        {/* ========================================================= */}
        {/* TAB 1: PROFIL PENGGUNA (EDIT IDENTITAS PEGAWAI)           */}
        {/* ========================================================= */}
        {currentUser && activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Kartu Ringkasan Akun */}
            <div style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: isSuperadmin ? "linear-gradient(135deg, #d97706, #b45309)" : "linear-gradient(135deg, #244937, #3d795b)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                fontWeight: "800",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                flexShrink: 0
              }}>
                {(currentUser.nama || currentUser.username || "P").charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: "0.95rem", 
                  fontWeight: "800", 
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {currentUser.nama || "Pegawai E-Kinerja"}
                </div>
                <div style={{ 
                  fontSize: "0.76rem", 
                  color: "var(--text-muted)", 
                  marginTop: "2px",
                  display: "flex", 
                  alignItems: "center", 
                  flexWrap: "wrap",
                  gap: "0.4rem" 
                }}>
                  <span>Username: <strong>{currentUser.username}</strong></span>
                  <span>&bull;</span>
                  <span style={{
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    fontWeight: "700",
                    background: isSuperadmin ? "rgba(217, 119, 6, 0.15)" : "rgba(36, 73, 55, 0.12)",
                    color: isSuperadmin ? "#b45309" : "var(--accent-primary)"
                  }}>
                    {isSuperadmin ? "Superadministrator" : "Pegawai / GTK"}
                  </span>

                  {isFromSso && (
                    <span style={{
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      background: "rgba(37, 99, 235, 0.12)",
                      color: "#1d4ed8",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px"
                    }}>
                      <ShieldCheck size={11} />
                      SSO
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Form Edit Identitas Pegawai */}
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {/* Nama Lengkap & Gelar */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <User size={15} style={{ color: "var(--accent-primary)" }} />
                  Nama Lengkap &amp; Gelar <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={profileNama}
                  onChange={(e) => setProfileNama(e.target.value)}
                  placeholder="Contoh: Drs. BAMBANG S., M.Pd"
                  style={{ fontSize: "0.85rem" }}
                  required
                />
              </div>

              {/* Grid: NIP & Pangkat */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Hash size={15} style={{ color: "var(--accent-primary)" }} />
                    NIP Pegawai <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileNip}
                    onChange={(e) => setProfileNip(e.target.value)}
                    placeholder="18 digit NIP atau -"
                    style={{ fontSize: "0.85rem" }}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Award size={15} style={{ color: "var(--accent-primary)" }} />
                    Pangkat / Golongan
                  </label>
                  <select
                    className="form-select"
                    value={profilePangkat}
                    onChange={(e) => setProfilePangkat(e.target.value)}
                    style={{ fontSize: "0.82rem" }}
                  >
                    {GOLONGAN_OPTIONS.map((gol) => (
                      <option key={gol} value={gol}>
                        {gol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Jabatan & Unit Kerja */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Briefcase size={15} style={{ color: "var(--accent-primary)" }} />
                    Jabatan Kedinasan <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    list="profile-jabatan-datalist"
                    value={profileJabatan}
                    onChange={(e) => setProfileJabatan(e.target.value)}
                    placeholder="misal: Guru Ahli Pertama"
                    style={{ fontSize: "0.82rem" }}
                    required
                  />
                  <datalist id="profile-jabatan-datalist">
                    {getMasterJabatan().map((j) => (
                      <option key={j.id} value={j.nama} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Building2 size={15} style={{ color: "var(--accent-primary)" }} />
                    Unit Kerja / Satker <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileUnitKerja}
                    onChange={(e) => setProfileUnitKerja(e.target.value)}
                    placeholder="misal: SMAN 1 GEDEG"
                    style={{ fontSize: "0.82rem" }}
                    required
                  />
                </div>
              </div>

              {/* Ganti Password Baru (Opsional) */}
              <div style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "0.75rem 0.85rem",
                marginTop: "0.25rem"
              }}>
                <label className="form-label" style={{ fontWeight: "600", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.35rem" }}>
                  <Key size={13} style={{ color: "var(--text-muted)" }} />
                  <span>Ubah Password Akun (Opsional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showProfilePassword ? "text" : "password"}
                    className="input-field"
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    placeholder="Masukkan password baru (kosongkan jika tidak diubah)..."
                    style={{ fontSize: "0.82rem", paddingRight: "2.2rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePassword(!showProfilePassword)}
                    style={{
                      position: "absolute",
                      right: "6px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: "4px"
                    }}
                    title={showProfilePassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showProfilePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Hanya diisi jika Anda ingin mengganti password login manual akun ini.
                </div>
              </div>

              {/* Tombol Simpan Profil */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full rounded-full px-5 py-2.5 text-xs font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-between shadow-md mt-1"
                style={{
                  background: "linear-gradient(135deg, #1f3d2e 0%, #34634b 100%)"
                }}
              >
                <span className="pl-1">
                  {isLoading ? "Menyimpan Perubahan..." : "Simpan Perubahan Profil"}
                </span>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Save size={13} className="text-white" />
                </div>
              </button>
            </form>

            {/* Sesi & Logout */}
            <div style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "1.25rem",
              marginTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              <div style={{ fontSize: "0.76rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Sesi &amp; Keamanan Akun
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                  style={{
                    background: "#fef2f2",
                    border: "1.5px solid #fecaca",
                    color: "#dc2626",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fee2e2";
                    e.currentTarget.style.borderColor = "#f87171";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fef2f2";
                    e.currentTarget.style.borderColor = "#fecaca";
                  }}
                >
                  <LogOut size={14} />
                  <span>Keluar Akun (Logout)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MASUK / GANTI AKUN LAIN                            */}
        {/* ========================================================= */}
        {activeTab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* SSO OIDC Button Option - DIPOSISIKAN DI ATAS */}
            {ssoConfig?.enabled && (
              <div>
                <a
                  href="/api/auth/sso/zitadel/login"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 1rem",
                    borderRadius: "9999px",
                    border: "1.5px solid var(--accent-primary, #244937)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    textDecoration: "none",
                    boxSizing: "border-box",
                    boxShadow: "0 2px 4px rgba(36, 73, 55, 0.08)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ShieldCheck size={17} style={{ color: "var(--accent-primary)" }} />
                    <span>{ssoConfig.buttonText || "Masuk dengan SSO"}</span>
                  </div>
                  <LogIn size={14} style={{ color: "var(--accent-primary)" }} />
                </a>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  margin: "0.85rem 0 0.25rem",
                  color: "var(--text-muted)",
                  fontSize: "0.72rem"
                }}>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                  <span>atau login akun manual</span>
                  <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
                </div>
              </div>
            )}

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
            </form>

            {/* Link ke pendaftaran jika sedang login */}
            {currentUser && (
              <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("register");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-primary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontWeight: "600"
                  }}
                >
                  Belum punya akun lain? Daftar Akun Baru
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DAFTAR AKUN BARU                                   */}
        {/* ========================================================= */}
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
                placeholder="Unit Kerja (contoh: SMAN 1 GEDEG)"
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
            <span>Sistem Terotentikasi &amp; Terproteksi E-Kinerja</span>
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Hubungi Superadmin instansi jika memerlukan kode pendaftaran atau pemutakhiran data akun.
          </div>
        </div>
      </div>
    </Sheet>
  );
}

