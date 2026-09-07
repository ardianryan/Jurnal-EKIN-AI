import React, { useState, useRef, useEffect } from "react";
import Sheet from "./ui/Sheet";
import { 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Search, 
  Copy, 
  Ticket, 
  Key, 
  Sparkles, 
  Clock, 
  Calendar, 
  Hash, 
  RefreshCw,
  Sliders,
  ChevronRight
} from "lucide-react";
import { 
  getAccounts, 
  saveAccount, 
  deleteAccount, 
  downloadExcelTemplate, 
  importAccountsFromExcel,
  setCurrentUser,
  setAllAccountsEnvPermission,
  exportCurrentAccountsAsSeederCode,
  fetchRegistrationCodes,
  generateRegistrationCode,
  removeRegistrationCode,
  getSchoolName
} from "../services/accountService";

export default function PegawaiSection({ 
  currentUser, 
  onUserChanged,
  schoolName = "SMAN Garuda",
  onNavigate
}) {
  const [accounts, setAccounts] = useState(() => getAccounts());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("list"); // "list" | "codes"
  const [isUserFormSheetOpen, setIsUserFormSheetOpen] = useState(false);

  // State Form Akun Baru / Edit
  const [formData, setFormData] = useState({
    id: "",
    username: "",
    password: "",
    role: "pegawai",
    nama: "",
    nip: "",
    pangkat: "Pengatur Muda / II/a",
    jabatan: "PENGADMINISTRASI PERKANTORAN",
    unitKerja: schoolName || "SMAN Garuda",
    allowEnvKey: true
  });

  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importRole, setImportRole] = useState("pegawai");

  // State Modal Reset Password
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetSuccessInfo, setResetSuccessInfo] = useState(null);

  // State Manajemen Kode Registrasi / Undangan
  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [codeForm, setCodeForm] = useState({
    code: "",
    note: "",
    maxUsesOption: "1",
    customMaxUses: "10",
    expiryOption: "7d",
    role: "pegawai",
    allowEnvKey: true
  });
  const [codeSubmitError, setCodeSubmitError] = useState("");
  const [codeSubmitSuccess, setCodeSubmitSuccess] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const fileInputRef = useRef(null);

  const reloadAccounts = () => {
    setAccounts(getAccounts());
  };

  const reloadRegistrationCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const list = await fetchRegistrationCodes();
      setRegistrationCodes(list);
    } catch (e) {
      console.warn("Gagal memuat kode registrasi:", e.message);
    } finally {
      setIsLoadingCodes(false);
    }
  };

  useEffect(() => {
    reloadRegistrationCodes();
  }, []);

  const handleOpenAddForm = () => {
    setFormData({
      id: "",
      username: "",
      password: "",
      role: "pegawai",
      nama: "",
      nip: "",
      pangkat: "Pengatur Muda / II/a",
      jabatan: "PENGADMINISTRASI PERKANTORAN",
      unitKerja: schoolName || getSchoolName() || "SMAN Garuda",
      allowEnvKey: true
    });
    setFormError("");
    setIsUserFormSheetOpen(true);
  };

  const handleEditAccount = (acc) => {
    setFormData({
      id: acc.id,
      username: acc.username || "",
      password: acc.password || "",
      role: acc.role || "pegawai",
      nama: acc.nama || "",
      nip: acc.nip || "",
      pangkat: acc.pangkat || "Pengatur Muda / II/a",
      jabatan: acc.jabatan || "PENGADMINISTRASI PERKANTORAN",
      unitKerja: acc.unitKerja || schoolName || "SMAN Garuda",
      allowEnvKey: acc.allowEnvKey !== false
    });
    setFormError("");
    setIsUserFormSheetOpen(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.username.trim()) {
      setFormError("Username wajib diisi.");
      return;
    }
    if (!formData.password.trim()) {
      setFormError("Password wajib diisi.");
      return;
    }
    if (!formData.nama.trim()) {
      setFormError("Nama lengkap pegawai wajib diisi.");
      return;
    }

    try {
      const updated = saveAccount(formData);
      setAccounts(updated);
      setIsUserFormSheetOpen(false);
      setNotification({
        type: "success",
        text: `Akun pegawai "${formData.nama}" (${formData.username}) berhasil disimpan!`
      });

      if (currentUser?.id === formData.id) {
        const updatedCurrent = updated.find(a => a.id === formData.id);
        if (updatedCurrent) {
          setCurrentUser(updatedCurrent);
          if (onUserChanged) onUserChanged(updatedCurrent);
        }
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteAccount = (acc) => {
    if (acc.id === currentUser?.id) {
      alert("Anda sedang login menggunakan akun ini! Tidak dapat menghapus akun yang sedang aktif.");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus akun pegawai "${acc.nama}" (${acc.username})? Data jurnal pegawai ini di perangkat ini akan tetap tersimpan.`)) {
      const updated = deleteAccount(acc.id);
      setAccounts(updated);
      setNotification({
        type: "success",
        text: `Akun "${acc.nama}" berhasil dihapus.`
      });
    }
  };

  const handleOpenResetPassword = (acc) => {
    setResetPasswordTarget(acc);
    setNewPasswordInput("");
    setResetSuccessInfo(null);
  };

  const handleConfirmResetPassword = () => {
    if (!resetPasswordTarget) return;
    const pass = newPasswordInput.trim();
    if (!pass || pass.length < 4) {
      alert("Password baru minimal harus 4 karakter.");
      return;
    }

    const updated = saveAccount({
      ...resetPasswordTarget,
      password: pass,
      updatedAt: new Date().toISOString()
    });

    setAccounts(updated);
    setResetSuccessInfo({
      username: resetPasswordTarget.username,
      password: pass
    });

    setNotification({
      type: "success",
      text: `Password untuk akun "${resetPasswordTarget.nama}" berhasil diperbarui!`
    });
  };

  const handleToggleUserEnvKey = (acc) => {
    try {
      const currentAllowed = acc.allowEnvKey !== false;
      const nextAllowed = !currentAllowed;
      const updated = saveAccount({
        ...acc,
        allowEnvKey: nextAllowed
      });
      setAccounts(updated);
      if (currentUser?.id === acc.id) {
        const updatedCurrent = updated.find(a => a.id === acc.id);
        if (updatedCurrent) {
          setCurrentUser(updatedCurrent);
          if (onUserChanged) onUserChanged(updatedCurrent);
        }
      }
      setNotification({
        type: "success",
        text: `Izin AI .env untuk "${acc.nama}" diubah: ${nextAllowed ? "DIIZINKAN" : "DIBATASI (Key Pribadi)"}`
      });
    } catch (err) {
      alert("Gagal mengubah izin AI: " + err.message);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate();
      setNotification({
        type: "success",
        text: "Template Excel resmi berhasil diunduh!"
      });
    } catch (err) {
      alert("Gagal mengunduh template: " + err.message);
    }
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await importAccountsFromExcel(file, importRole);
      reloadAccounts();
      setNotification({
        type: "success",
        text: `Berhasil mengimpor akun Excel! Ditambahkan: ${res.importedCount}, Diperbarui: ${res.updatedCount}.`
      });
      if (res.errors.length > 0) {
        alert("Catatan Impor:\n" + res.errors.join("\n"));
      }
    } catch (err) {
      alert("Gagal memproses file Excel: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleCopySeederCode = () => {
    try {
      const code = exportCurrentAccountsAsSeederCode();
      navigator.clipboard.writeText(code);
      setNotification({
        type: "success",
        text: "Kode Seeder Akun berhasil disalin ke clipboard!"
      });
    } catch (e) {
      alert("Gagal menyalin seeder: " + e.message);
    }
  };

  // Kode Registrasi Handlers
  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCodeSubmitError("");
    setCodeSubmitSuccess("");
    setIsSubmittingCode(true);

    try {
      let maxUses = null;
      if (codeForm.maxUsesOption === "unlimited") {
        maxUses = null;
      } else if (codeForm.maxUsesOption === "custom") {
        const val = parseInt(codeForm.customMaxUses, 10);
        maxUses = isNaN(val) || val <= 0 ? 1 : val;
      } else {
        maxUses = parseInt(codeForm.maxUsesOption, 10) || 1;
      }

      const now = Date.now();
      let expiresAt = null;
      switch (codeForm.expiryOption) {
        case "1h": expiresAt = new Date(now + 1 * 3600 * 1000).toISOString(); break;
        case "24h": expiresAt = new Date(now + 24 * 3600 * 1000).toISOString(); break;
        case "3d": expiresAt = new Date(now + 3 * 24 * 3600 * 1000).toISOString(); break;
        case "7d": expiresAt = new Date(now + 7 * 24 * 3600 * 1000).toISOString(); break;
        case "30d": expiresAt = new Date(now + 30 * 24 * 3600 * 1000).toISOString(); break;
        case "never": default: expiresAt = null; break;
      }

      const created = await generateRegistrationCode({
        code: codeForm.code.trim().toUpperCase(),
        note: codeForm.note.trim(),
        maxUses,
        expiresAt,
        role: codeForm.role || "pegawai",
        allowEnvKey: codeForm.allowEnvKey !== false,
        createdBy: currentUser?.username || "superadmin"
      });

      setCodeSubmitSuccess(`Kode registrasi "${created.code}" berhasil diterbitkan!`);
      setCodeForm({
        code: "",
        note: "",
        maxUsesOption: "1",
        customMaxUses: "10",
        expiryOption: "7d",
        role: "pegawai",
        allowEnvKey: true
      });
      await reloadRegistrationCodes();
    } catch (err) {
      setCodeSubmitError(err.message || "Gagal menerbitkan kode.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleDeleteCode = async (codeItem) => {
    if (!window.confirm(`Hapus kode registrasi "${codeItem.code}"?`)) return;
    try {
      await removeRegistrationCode(codeItem.id || codeItem.code);
      await reloadRegistrationCodes();
      setNotification({
        type: "success",
        text: `Kode "${codeItem.code}" berhasil dihapus.`
      });
    } catch (err) {
      alert("Gagal menghapus kode: " + err.message);
    }
  };

  const handleCopyCode = (codeItem) => {
    try {
      navigator.clipboard.writeText(codeItem.code);
      setCopiedCodeId(codeItem.id || codeItem.code);
      setTimeout(() => setCopiedCodeId(null), 2500);
    } catch (e) {}
  };

  const handleCopyInviteLink = (codeItem) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#/register?code=${encodeURIComponent(codeItem.code)}`;
      navigator.clipboard.writeText(url);
      setCopiedCodeId(`link-${codeItem.id || codeItem.code}`);
      setTimeout(() => setCopiedCodeId(null), 2500);
    } catch (e) {}
  };

  // Filter pencarian
  const filteredAccounts = accounts.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      a.nama?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q) ||
      a.nip?.toLowerCase().includes(q) ||
      a.jabatan?.toLowerCase().includes(q) ||
      a.unitKerja?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-page-container" style={{ maxWidth: "1180px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header Halaman Data Pegawai */}
      <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="badge badge-utama" style={{ fontSize: "0.72rem" }}>Manajemen Personalia</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{schoolName}</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            Data Pegawai &amp; Guru
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.3rem", maxWidth: "70ch" }}>
            Kelola basis data pegawai, kredensial akun login, hak akses AI Gemini, dan kode registrasi pendaftaran mandiri.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate("pengaturan")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}
          >
            <Sliders size={14} />
            <span>Buka Pengaturan Instansi</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Notifikasi Banner */}
      {notification && (
        <div style={{
          background: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
          border: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          color: notification.type === "success" ? "#065f46" : "#991b1b",
          padding: "0.6rem 1.25rem",
          borderRadius: "8px",
          fontSize: "0.84rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: "600",
          marginBottom: "1.25rem"
        }}>
          <span>{notification.text}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1.1rem" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Surface Card */}
      <div className="admin-main-card" style={{
        background: "var(--bg-surface)",
        borderRadius: "14px",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden"
      }}>
        {/* Toolbar Subtab & Aksi */}
        <div style={{
          padding: "0.85rem 1.5rem",
          background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem"
        }}>
          {/* Subtab Switcher */}
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "list" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("list")}
              style={{ fontWeight: "600" }}
            >
              <Users size={14} />
              <span>Daftar Pegawai ({accounts.length})</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "codes" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setActiveSubTab("codes");
                reloadRegistrationCodes();
              }}
              style={{ fontWeight: "600" }}
            >
              <Ticket size={14} />
              <span>Kode Registrasi ({registrationCodes.length})</span>
            </button>
          </div>

          {/* Action buttons (only in list view) */}
          {activeSubTab === "list" && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddForm}
                style={{ fontWeight: "700" }}
              >
                <UserPlus size={14} />
                <span>Buat Akun Baru</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTemplate}
                title="Unduh format tabel Excel resmi"
              >
                <Download size={14} />
                <span>Template Excel</span>
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadExcel} 
                accept=".xlsx,.xls,.csv" 
                style={{ display: "none" }} 
              />

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Unggah berkas Excel untuk mendaftarkan akun secara massal"
                style={{ color: "var(--accent-primary)", borderColor: "var(--border-strong)" }}
              >
                <Upload size={14} />
                <span>{isUploading ? "Memproses..." : "Impor Excel"}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopySeederCode}
                title="Salin data akun sebagai kode seeder"
              >
                <Copy size={13} />
                <span>Salin Seeder</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* SubTab 1: Daftar Pegawai */}
          {activeSubTab === "list" && (
            <div>
              {/* Filter Search */}
              <div style={{ marginBottom: "1rem", position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="input-field"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama pegawai, NIP, username, jabatan, atau unit kerja..."
                  style={{ paddingLeft: "2.2rem", fontSize: "0.85rem", width: "100%" }}
                />
              </div>

              {/* Tabel Akun */}
              <div className="table-scroll-hint">
                <span>👈 Geser tabel pegawai ke samping untuk melihat kolom lengkap 👉</span>
              </div>
              <div className="table-responsive">
                <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "0.6rem 0.8rem", width: "4%" }}>No</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "20%" }}>Pegawai &amp; NIP</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "13%" }}>Username &amp; Pass</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "11%" }}>Role Akses</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "15%" }}>Izin AI (.env)</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "21%" }}>Jabatan &amp; Unit Kerja</th>
                      <th style={{ padding: "0.6rem 0.8rem", width: "16%", textAlign: "center" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Tidak ada data pegawai yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((acc, index) => {
                        const isCurrent = acc.id === currentUser?.id;
                        const isSuper = acc.role === "superadmin";

                        return (
                          <tr 
                            key={acc.id || index}
                            style={{ 
                              borderBottom: "1px solid var(--border-subtle)",
                              background: isCurrent ? "rgba(37, 99, 235, 0.05)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "center", color: "var(--text-muted)" }}>
                              {index + 1}
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                                {acc.nama}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                NIP: {acc.nip || "-"}
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <code style={{ fontSize: "0.78rem", background: "var(--bg-tertiary)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                {acc.username}
                              </code>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                Pass: ••••••••
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <span 
                                className={`badge ${isSuper ? "badge-utama" : "badge-aspek"}`}
                                style={{ fontSize: "0.72rem" }}
                              >
                                {isSuper ? "Superadmin" : "Pegawai"}
                              </span>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleUserEnvKey(acc)}
                                title="Klik untuk mengubah izin penggunaan API Key AI Sistem"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.2rem 0.4rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  color: acc.allowEnvKey !== false ? "#059669" : "#dc2626",
                                  backgroundColor: acc.allowEnvKey !== false ? "#ecfdf5" : "#fef2f2"
                                }}
                              >
                                <Sparkles size={12} />
                                <span>{acc.allowEnvKey !== false ? "Diizinkan (.env)" : "Key Pribadi"}</span>
                              </button>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem" }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-primary)" }}>
                                {acc.jabatan || "-"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {acc.unitKerja || schoolName}
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon btn-sm"
                                  onClick={() => handleEditAccount(acc)}
                                  title="Edit Profil & Izin Akun"
                                  style={{ padding: "0.25rem" }}
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-icon btn-sm"
                                  onClick={() => handleOpenResetPassword(acc)}
                                  title="Reset Kata Sandi"
                                  style={{ padding: "0.25rem", color: "#f59e0b" }}
                                >
                                  <Key size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-danger btn-icon btn-sm"
                                  onClick={() => handleDeleteAccount(acc)}
                                  title="Hapus Akun"
                                  disabled={isCurrent}
                                  style={{ padding: "0.25rem" }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Kode Registrasi */}
          {activeSubTab === "codes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Form Terbitkan Kode */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem"
              }}>
                <h4 style={{ margin: "0 0 0.85rem 0", fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Ticket size={16} />
                  <span>Terbitkan Kode Registrasi Baru</span>
                </h4>

                {codeSubmitError && (
                  <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <AlertCircle size={14} />
                    <span>{codeSubmitError}</span>
                  </div>
                )}
                {codeSubmitSuccess && (
                  <div style={{ color: "#10b981", fontSize: "0.8rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Check size={14} />
                    <span>{codeSubmitSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateCode} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Kode Kustom (Opsional)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={codeForm.code}
                        onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                        placeholder="Contoh: GURU-2026 (Kosongkan utk acak)"
                        style={{ fontSize: "0.82rem", fontFamily: "monospace" }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Catatan / Nama Penerima</label>
                      <input
                        type="text"
                        className="input-field"
                        value={codeForm.note}
                        onChange={(e) => setCodeForm({ ...codeForm, note: e.target.value })}
                        placeholder="Contoh: Buat Guru Mapel Matematika"
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Batas Kuota Pemakaian</label>
                      <select
                        className="input-field"
                        value={codeForm.maxUsesOption}
                        onChange={(e) => setCodeForm({ ...codeForm, maxUsesOption: e.target.value })}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <option value="1">1 Pengguna (Sekali Pakai)</option>
                        <option value="5">5 Pengguna</option>
                        <option value="10">10 Pengguna</option>
                        <option value="25">25 Pengguna</option>
                        <option value="50">50 Pengguna</option>
                        <option value="unlimited">Tak Terbatas</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Masa Kedaluwarsa</label>
                      <select
                        className="input-field"
                        value={codeForm.expiryOption}
                        onChange={(e) => setCodeForm({ ...codeForm, expiryOption: e.target.value })}
                        style={{ fontSize: "0.82rem" }}
                      >
                        <option value="24h">24 Jam</option>
                        <option value="3d">3 Hari</option>
                        <option value="7d">7 Hari (1 Minggu)</option>
                        <option value="30d">30 Hari (1 Bulan)</option>
                        <option value="never">Selamanya (Tidak Kedaluwarsa)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isSubmittingCode}
                      style={{ fontWeight: "700" }}
                    >
                      <Check size={14} />
                      <span>{isSubmittingCode ? "Menerbitkan..." : "Terbitkan Kode Registrasi"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Kode Aktif */}
              <div className="table-scroll-hint">
                <span>👈 Geser tabel kode registrasi ke samping 👉</span>
              </div>
              <div className="table-responsive">
                <table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Kode</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Catatan</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Pemakaian</th>
                      <th style={{ padding: "0.6rem 0.8rem" }}>Kedaluwarsa</th>
                      <th style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrationCodes.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Belum ada kode registrasi yang diterbitkan.
                        </td>
                      </tr>
                    ) : (
                      registrationCodes.map((codeItem) => (
                        <tr key={codeItem.id || codeItem.code} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem 0.8rem" }}>
                            <code style={{ fontSize: "0.88rem", fontWeight: "700", background: "var(--bg-tertiary)", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "var(--accent-primary)" }}>
                              {codeItem.code}
                            </code>
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem" }}>
                            {codeItem.note || "-"}
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem" }}>
                            {codeItem.usedCount || 0} / {codeItem.maxUses ? codeItem.maxUses : "∞"}
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem", color: "var(--text-muted)" }}>
                            {codeItem.expiresAt ? new Date(codeItem.expiresAt).toLocaleDateString("id-ID") : "Selamanya"}
                          </td>
                          <td style={{ padding: "0.6rem 0.8rem", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                onClick={() => handleCopyCode(codeItem)}
                                title="Salin Kode"
                              >
                                {copiedCodeId === (codeItem.id || codeItem.code) ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleCopyInviteLink(codeItem)}
                                title="Salin Link Registrasi Langsung"
                                style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}
                              >
                                {copiedCodeId === `link-${codeItem.id || codeItem.code}` ? "Tersalin!" : "Salin Link"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-icon btn-sm"
                                onClick={() => handleDeleteCode(codeItem)}
                                title="Hapus Kode"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog: Reset Password Pengguna oleh Superadmin */}
      {resetPasswordTarget && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetPasswordTarget(null);
          }}
        >
          <div style={{
            background: "var(--bg-surface, #ffffff)",
            borderRadius: "14px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            width: "100%",
            maxWidth: "440px",
            overflow: "hidden",
            border: "1px solid var(--border-subtle)"
          }}>
            <div style={{
              padding: "1.1rem 1.25rem",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", fontSize: "0.95rem" }}>
                <Key size={17} style={{ color: "#f59e0b" }} />
                <span>Reset Password Pegawai</span>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "1.25rem" }}>
              {resetSuccessInfo ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem"
                  }}>
                    <Check size={24} />
                  </div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "#065f46" }}>Password Berhasil Diubah!</h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Berikan kredensial berikut kepada pegawai yang bersangkutan:
                  </p>

                  <div style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    textAlign: "left",
                    marginBottom: "1.25rem"
                  }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Username:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                      {resetSuccessInfo.username}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Password Baru:</div>
                    <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--accent-primary)", fontFamily: "monospace" }}>
                      {resetSuccessInfo.password}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => {
                        navigator.clipboard.writeText(`Akun E-Kinerja ASN:\nUsername: ${resetSuccessInfo.username}\nPassword: ${resetSuccessInfo.password}`);
                        alert("Kredensial login berhasil disalin ke papan klip!");
                      }}
                    >
                      <Copy size={14} />
                      <span>Salin Kredensial</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setResetPasswordTarget(null)}
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    marginBottom: "1.25rem"
                  }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pegawai:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "var(--text-primary)" }}>
                      {resetPasswordTarget.nama}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Username: <code>{resetPasswordTarget.username}</code> &bull; NIP: {resetPasswordTarget.nip || "-"}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", marginBottom: "0.4rem" }}>
                      Masukkan Password Baru:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Masukkan kata sandi baru"
                      style={{ width: "100%", fontFamily: "monospace", fontSize: "0.9rem" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Minimal 4 karakter
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "abcdefghjkmnpqrstuvwxyz23456789";
                          let rnd = "";
                          for (let i = 0; i < 8; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
                          setNewPasswordInput(rnd);
                        }}
                        style={{ background: "none", border: "none", color: "var(--accent-primary)", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                      >
                        <RefreshCw size={11} />
                        <span>Buat Acak</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setResetPasswordTarget(null)}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmResetPassword}
                      disabled={!newPasswordInput.trim() || newPasswordInput.trim().length < 4}
                    >
                      <Key size={14} />
                      <span>Simpan Password Baru</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sheet Form Tambah / Edit Pegawai */}
      <Sheet
        isOpen={isUserFormSheetOpen}
        onClose={() => setIsUserFormSheetOpen(false)}
        title={formData.id ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
        description={formData.id ? `Perbarui data akun, NIP, jabatan, atau izin AI untuk ${formData.nama || formData.username}` : "Buat kredensial akun dan profil ASN baru"}
        size="md"
      >
        <div style={{ padding: "0.5rem 0" }}>
          <form onSubmit={handleSaveForm} style={{ maxWidth: "680px", margin: "0 auto" }}>
            {formError && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.25rem"
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Username Akun <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="misal: brian.pratama"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Password <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Kata sandi akun"
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Nama Lengkap &amp; Gelar <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="misal: Brian Pratama, S.Pd"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nomor Induk Pegawai (NIP)</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="18 digit angka NIP ASN"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Role Akses Akun</label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="pegawai">Pegawai / Guru Biasa</option>
                  <option value="superadmin">Super Administrator (Akses Penuh)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Pangkat / Golongan Ruang</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.pangkat}
                  onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
                  placeholder="misal: Penata Muda / III/a"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Jabatan Dinas ASN</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  placeholder="misal: GURU AHLI PERTAMA"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit Kerja / Sekolah</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.unitKerja}
                  onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
                  placeholder="misal: SMAN Garuda"
                />
              </div>
            </div>

            {/* Izin AI Gemini Sistem */}
            <div 
              onClick={() => setFormData({ ...formData, allowEnvKey: formData.allowEnvKey === false })}
              style={{
                marginBottom: "1.5rem",
                padding: "0.85rem 1.1rem",
                background: "var(--bg-tertiary)",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
                gap: "1rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Sparkles size={18} style={{ color: formData.allowEnvKey !== false ? "#10b981" : "var(--text-muted)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "0.86rem", color: "var(--text-primary)" }}>
                    Izinkan API Key AI Gemini Sistem (.env)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {formData.allowEnvKey !== false
                      ? "Pegawai ini dapat langsung memakai AI Gemini dari .env sistem tanpa wajib mengisi key pribadi."
                      : "Pegawai ini dibatasi dan diwajibkan memasukkan API Key Gemini pribadi akun."}
                  </div>
                </div>
              </div>

              <div style={{
                width: "44px",
                height: "24px",
                borderRadius: "9999px",
                background: formData.allowEnvKey !== false ? "#10b981" : "var(--border-strong)",
                padding: "2px",
                transition: "background 0.2s ease",
                flexShrink: 0
              }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transform: formData.allowEnvKey !== false ? "translateX(20px)" : "translateX(0px)",
                  transition: "transform 0.2s ease"
                }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsUserFormSheetOpen(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontWeight: "700" }}
              >
                <Check size={16} />
                <span>{formData.id ? "Simpan Perubahan" : "Buat Akun Pegawai"}</span>
              </button>
            </div>
          </form>
        </div>
      </Sheet>
    </div>
  );
}
