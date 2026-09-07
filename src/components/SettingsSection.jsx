import React, { useState, useEffect } from "react";
import { 
  Building, 
  School, 
  Save, 
  Sparkles, 
  Sliders, 
  Check, 
  AlertCircle, 
  Briefcase, 
  Plus, 
  Search, 
  RotateCcw, 
  Tag, 
  Edit3, 
  Trash2, 
  Database, 
  Copy, 
  Users, 
  ChevronRight,
  ShieldCheck,
  CheckCheck,
  UploadCloud,
  Image as ImageIcon,
  Cloud,
  Calendar,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { 
  getAccounts, 
  getSchoolName, 
  setSchoolName, 
  getSchoolLogo,
  getSchoolFavicon,
  setSchoolLogo,
  removeSchoolLogo,
  processAndOptimizeLogo,
  getDatabaseConfig, 
  fetchLiveDatabaseStatus, 
  fetchStorageStatus,
  scanStorageFilesByYear,
  executeStorageCleanupByYear,
  setAllAccountsEnvPermission,
  exportCurrentAccountsAsSeederCode,
  getCachedSsoConfig,
  fetchSsoConfig,
  saveSsoConfig
} from "../services/accountService";
import { 
  getMasterJabatan, 
  addJabatan, 
  updateJabatan, 
  deleteJabatan, 
  addContohKasaran, 
  deleteContohKasaran, 
  resetToDefaultJabatan 
} from "../services/jabatanService";

export default function SettingsSection({
  currentUser,
  schoolName = "SMAN Garuda",
  onUpdateSchoolName,
  schoolLogo = null,
  onUpdateSchoolLogo,
  allowEnvKey = true,
  onToggleAllowEnvKey,
  hasEnvKey = false,
  onOpenGeminiSettings,
  onNavigate
}) {
  const dbConfig = getDatabaseConfig();
  const [liveDbStatus, setLiveDbStatus] = useState(null);
  const [storageStatus, setStorageStatus] = useState(null);

  useEffect(() => {
    fetchLiveDatabaseStatus().then(status => {
      if (status) setLiveDbStatus(status);
    });
    fetchStorageStatus().then(status => {
      if (status) setStorageStatus(status);
    });
  }, []);

  const [activeSubTab, setActiveSubTab] = useState("instansi"); // "instansi" | "sso" | "jabatan" | "database"
  const [accounts, setAccounts] = useState(() => getAccounts());
  const [localSchoolName, setLocalSchoolName] = useState(() => schoolName || getSchoolName());
  const [isSavedSchoolName, setIsSavedSchoolName] = useState(false);
  const [notification, setNotification] = useState(null);

  // State Pembersihan Berkas Storage R2 Berdasarkan Tahun
  const currentYear = new Date().getFullYear();
  const [cleanupYear, setCleanupYear] = useState(currentYear - 1);
  const [cleanupMode, setCleanupMode] = useState("before_or_equal"); // "exact" | "before_or_equal"
  const [isScanningCleanup, setIsScanningCleanup] = useState(false);
  const [isExecutingCleanup, setIsExecutingCleanup] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cleanupSuccessResult, setCleanupSuccessResult] = useState(null);

  // Daftar opsi tahun dinamis (dari tahun berjalan mundur 6 tahun)
  const availableYearOptions = Array.from({ length: 8 }, (_, idx) => currentYear - idx);

  const handleScanCleanup = async () => {
    setIsScanningCleanup(true);
    setScanResult(null);
    setCleanupSuccessResult(null);
    try {
      const res = await scanStorageFilesByYear({
        targetYear: cleanupYear,
        mode: cleanupMode
      });
      if (res && res.success) {
        setScanResult(res);
      } else {
        setNotification({
          type: "error",
          text: res?.error || "Gagal memindai berkas storage."
        });
      }
    } catch (e) {
      setNotification({
        type: "error",
        text: e.message || "Terjadi kesalahan saat memindai berkas."
      });
    } finally {
      setIsScanningCleanup(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (!scanResult || scanResult.matchedCount === 0) return;

    const labelCakupan = cleanupMode === "exact"
      ? `hanya tahun ${cleanupYear}`
      : `tahun ${cleanupYear} dan seluruh tahun sebelumnya`;

    const confirmMsg = `PERINGATAN PEMBERSIHAN PERMANEN:\n\nApakah Anda yakin ingin menghapus ${scanResult.matchedCount} berkas eviden (${scanResult.matchedSizeFormatted || "0 KB"}) untuk ${labelCakupan} dari Cloudflare R2 / S3?\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`;

    if (!window.confirm(confirmMsg)) return;

    setIsExecutingCleanup(true);
    try {
      const res = await executeStorageCleanupByYear({
        targetYear: cleanupYear,
        mode: cleanupMode
      });
      if (res && res.success) {
        setCleanupSuccessResult(res);
        setScanResult(null);
        setNotification({
          type: "success",
          text: `Pembersihan berhasil! Sebanyak ${res.deletedCount} berkas (${res.deletedSizeFormatted || "0 KB"}) telah dihapus secara permanen dari storage.`
        });
      } else {
        setNotification({
          type: "error",
          text: res?.error || "Gagal mengeksekusi pembersihan storage."
        });
      }
    } catch (e) {
      setNotification({
        type: "error",
        text: e.message || "Gagal membersihkan berkas."
      });
    } finally {
      setIsExecutingCleanup(false);
    }
  };

  // State SSO Zitadel & Kebijakan Registrasi
  const [ssoForm, setSsoForm] = useState(() => getCachedSsoConfig());
  const [isSavingSso, setIsSavingSso] = useState(false);

  useEffect(() => {
    fetchSsoConfig().then(cfg => {
      if (cfg) setSsoForm(cfg);
    });
  }, []);

  const handleSaveSsoSettings = async (e) => {
    e.preventDefault();
    setIsSavingSso(true);
    try {
      await saveSsoConfig({
        sso: {
          enabled: ssoForm.enabled,
          buttonText: ssoForm.buttonText,
          issuer: ssoForm.issuer
        },
        registrationPolicy: {
          mode: ssoForm.registrationMode,
          closedRegistrationUrl: ssoForm.closedRegistrationUrl,
          closedRegistrationMessage: ssoForm.closedRegistrationMessage
        }
      });
      setNotification({
        type: "success",
        text: "Pengaturan SSO Zitadel dan Kebijakan Registrasi berhasil diperbarui!"
      });
    } catch (err) {
      setNotification({
        type: "error",
        text: err.message || "Gagal menyimpan konfigurasi SSO."
      });
    } finally {
      setIsSavingSso(false);
    }
  };

  useEffect(() => {
    if (schoolName) setLocalSchoolName(schoolName);
  }, [schoolName]);

  // State Logo & Favicon
  const [currentLogo, setCurrentLogo] = useState(() => schoolLogo || getSchoolLogo());
  const [currentFavicon, setCurrentFavicon] = useState(() => getSchoolFavicon());
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoStats, setLogoStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (schoolLogo !== undefined) {
      setCurrentLogo(schoolLogo);
    }
  }, [schoolLogo]);

  useEffect(() => {
    const handleLogoChange = (e) => {
      setCurrentLogo(e.detail?.logo || null);
      setCurrentFavicon(e.detail?.favicon || null);
    };
    window.addEventListener("ekinerja_logo_changed", handleLogoChange);
    return () => window.removeEventListener("ekinerja_logo_changed", handleLogoChange);
  }, []);

  const handleProcessFile = async (file) => {
    if (!file) return;
    setIsProcessingLogo(true);
    try {
      const result = await processAndOptimizeLogo(file);
      setSchoolLogo(result.logoUrl, result.faviconUrl);
      setCurrentLogo(result.logoUrl);
      setCurrentFavicon(result.faviconUrl);
      setLogoStats({
        originalSize: result.originalSize,
        logoSize: result.logoSize,
        faviconSize: result.faviconSize,
        width: result.width,
        height: result.height,
        savedPercent: Math.max(0, Math.round(((result.originalSize - result.logoSize) / result.originalSize) * 100))
      });
      if (onUpdateSchoolLogo) onUpdateSchoolLogo(result.logoUrl);
      setNotification({
        type: "success",
        text: `Logo instansi berhasil diunggah! Logo otomatis dioptimasi (${(result.logoSize / 1024).toFixed(1)} KB) & favicon browser telah aktif (${(result.faviconSize / 1024).toFixed(1)} KB).`
      });
    } catch (err) {
      setNotification({
        type: "error",
        text: err.message || "Gagal memproses berkas logo."
      });
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleRemoveLogo = () => {
    if (window.confirm("Kembalikan logo instansi ke ikon bawaan sistem? Favicon juga akan direset.")) {
      removeSchoolLogo();
      setCurrentLogo(null);
      setCurrentFavicon(null);
      setLogoStats(null);
      if (onUpdateSchoolLogo) onUpdateSchoolLogo(null);
      setNotification({
        type: "success",
        text: "Logo kustom berhasil dihapus. Sistem dan tab browser kembali ke ikon bawaan."
      });
    }
  };

  const handleSaveSchoolName = (e) => {
    e.preventDefault();
    if (!localSchoolName.trim()) return;
    const saved = setSchoolName(localSchoolName.trim());
    if (onUpdateSchoolName) onUpdateSchoolName(saved);
    setIsSavedSchoolName(true);
    setNotification({ type: "success", text: `Nama instansi berhasil diubah menjadi "${saved}" di seluruh dokumen dan sistem!` });
    setTimeout(() => setIsSavedSchoolName(false), 3000);
  };

  const handleBatchAllowAll = () => {
    const updated = setAllAccountsEnvPermission(true);
    setAccounts(updated);
    if (onToggleAllowEnvKey) onToggleAllowEnvKey(true);
    setNotification({
      type: "success",
      text: "Seluruh akun pegawai berhasil DIIZINKAN memakai API Key .env sistem!"
    });
  };

  const handleBatchDisallowAll = () => {
    const updated = setAllAccountsEnvPermission(false);
    setAccounts(updated);
    if (onToggleAllowEnvKey) onToggleAllowEnvKey(false);
    setNotification({
      type: "success",
      text: "Seluruh akun pegawai berhasil DIBATASI (wajib memasukkan Key Pribadi akun)!"
    });
  };

  // State Master Jabatan & Contoh Kasaran
  const [masterJabatanList, setMasterJabatanList] = useState(() => getMasterJabatan());
  const [searchJabatanQuery, setSearchJabatanQuery] = useState("");
  const [isAddingJabatan, setIsAddingJabatan] = useState(false);
  const [editingJabatanId, setEditingJabatanId] = useState(null);
  const [jabatanFormData, setJabatanFormData] = useState({
    id: "",
    nama: "",
    kategori: "Administrasi & Tata Usaha",
    keywords: "",
    contohKasaranText: ""
  });
  const [inlineContohInputs, setInlineContohInputs] = useState({});

  const reloadJabatan = () => {
    const list = getMasterJabatan();
    setMasterJabatanList(list);
  };

  const handleStartAddJabatan = () => {
    setJabatanFormData({
      id: "",
      nama: "",
      kategori: "Administrasi & Tata Usaha",
      keywords: "",
      contohKasaranText: ""
    });
    setEditingJabatanId(null);
    setIsAddingJabatan(true);
  };

  const handleStartEditJabatan = (j) => {
    setJabatanFormData({
      id: j.id,
      nama: j.nama,
      kategori: j.kategori || "Umum",
      keywords: Array.isArray(j.keywords) ? j.keywords.join(", ") : (j.keywords || ""),
      contohKasaranText: ""
    });
    setIsAddingJabatan(false);
    setEditingJabatanId(j.id);
  };

  const handleSaveJabatan = (e) => {
    e.preventDefault();
    if (!jabatanFormData.nama.trim()) {
      alert("Nama jabatan kedinasan wajib diisi!");
      return;
    }

    try {
      if (editingJabatanId) {
        updateJabatan(editingJabatanId, {
          nama: jabatanFormData.nama,
          kategori: jabatanFormData.kategori,
          keywords: jabatanFormData.keywords
        });
        setNotification({ type: "success", text: `Jabatan "${jabatanFormData.nama}" berhasil diperbarui!` });
      } else {
        const initialExamples = jabatanFormData.contohKasaranText
          ? jabatanFormData.contohKasaranText.split("\n").map(s => s.trim()).filter(Boolean)
          : [];
        addJabatan({
          nama: jabatanFormData.nama,
          kategori: jabatanFormData.kategori,
          keywords: jabatanFormData.keywords,
          contohKasaran: initialExamples
        });
        setNotification({ type: "success", text: `Jabatan "${jabatanFormData.nama}" berhasil ditambahkan ke Master!` });
      }
      reloadJabatan();
      setIsAddingJabatan(false);
      setEditingJabatanId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJabatan = (j) => {
    if (masterJabatanList.length <= 1) {
      alert("Tidak dapat menghapus. Harus menyisakan minimal satu master jabatan!");
      return;
    }

    if (window.confirm(`Hapus jabatan "${j.nama}" beserta seluruh contoh kasarannya? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        deleteJabatan(j.id);
        reloadJabatan();
        setNotification({ type: "success", text: `Jabatan "${j.nama}" berhasil dihapus.` });
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleAddInlineContoh = (jabatanId) => {
    const text = (inlineContohInputs[jabatanId] || "").trim();
    if (!text) return;

    try {
      addContohKasaran(jabatanId, text);
      setInlineContohInputs(prev => ({ ...prev, [jabatanId]: "" }));
      reloadJabatan();
      setNotification({ type: "success", text: "Contoh kalimat kasaran berhasil ditambahkan!" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteContoh = (jabatanId, idx) => {
    try {
      deleteContohKasaran(jabatanId, idx);
      reloadJabatan();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetSeederJabatan = () => {
    if (window.confirm("Muat ulang seluruh contoh kasaran & master jabatan bawaan (seeder)? Data perubahan kustom akan di-reset ke standar kedinasan.")) {
      resetToDefaultJabatan();
      reloadJabatan();
      setNotification({ type: "success", text: "Master jabatan dan bank contoh kasaran berhasil di-reset ke seeder bawaan!" });
    }
  };

  const handleCopySeederCode = () => {
    try {
      const code = exportCurrentAccountsAsSeederCode();
      navigator.clipboard.writeText(code);
      setNotification({
        type: "success",
        text: "Kode Seeder Akun berhasil disalin ke papan klip!"
      });
    } catch (e) {
      alert("Gagal menyalin seeder: " + e.message);
    }
  };

  // Filter pencarian jabatan
  const filteredJabatan = masterJabatanList.filter(j => {
    const q = searchJabatanQuery.toLowerCase();
    const namaMatch = j.nama?.toLowerCase().includes(q);
    const katMatch = j.kategori?.toLowerCase().includes(q);
    const kwMatch = Array.isArray(j.keywords) 
      ? j.keywords.some(k => k.toLowerCase().includes(q))
      : j.keywords?.toLowerCase().includes(q);
    return namaMatch || katMatch || kwMatch;
  });

  return (
    <div className="admin-page-container" style={{ maxWidth: "1180px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header Halaman Pengaturan */}
      <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="badge badge-utama" style={{ fontSize: "0.72rem" }}>Panel Konfigurasi</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{localSchoolName}</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            Pengaturan Instansi &amp; Sistem
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.3rem", maxWidth: "70ch" }}>
            Kelola nama resmi sekolah, kebijakan izin API Key Gemini AI, referensi master jabatan ASN, dan status koneksi database.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate("pegawai")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}
          >
            <Users size={14} />
            <span>Buka Data Pegawai</span>
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
        {/* Toolbar Subtab */}
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
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "instansi" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("instansi")}
              style={{ fontWeight: "600" }}
            >
              <Building size={14} />
              <span>Instansi &amp; AI Gemini</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "sso" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("sso")}
              style={{ fontWeight: "600" }}
            >
              <ShieldCheck size={14} />
              <span>SSO Zitadel &amp; Registrasi</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "jabatan" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("jabatan")}
              style={{ fontWeight: "600" }}
            >
              <Briefcase size={14} />
              <span>Master Jabatan &amp; Kasaran ({masterJabatanList.length})</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeSubTab === "database" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveSubTab("database")}
              style={{ fontWeight: "600" }}
            >
              <Database size={14} />
              <span>Sistem &amp; Database</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "1.5rem" }}>
          {/* SubTab 1: Instansi & AI */}
          {activeSubTab === "instansi" && (
            <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* 1. Pengaturan Identitas Sekolah / Instansi */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "var(--accent-primary-light)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      Identitas Nama Sekolah / Instansi Resmi
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Nama ini tampil di kop surat laporan A4, header aplikasi, dan profil seluruh pegawai.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSchoolName} style={{ marginTop: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label" style={{ fontWeight: "700" }}>
                      Nama Lembaga / Sekolah
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        className="input-field"
                        value={localSchoolName}
                        onChange={(e) => setLocalSchoolName(e.target.value)}
                        placeholder="Contoh: SMAN Garuda / SMAN 1 Garung"
                        style={{ flex: "1 1 300px", fontWeight: "600", fontSize: "0.95rem" }}
                        required
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <Save size={15} />
                        <span>{isSavedSchoolName ? "Tersimpan!" : "Simpan Nama Sekolah"}</span>
                      </button>
                    </div>
                  </div>

                  <div style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <School size={16} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                    <span>
                      Pratinjau saat ini: <strong>{localSchoolName || "SMAN Garuda"}</strong> (Otomatis tersinkronisasi tanpa reload)
                    </span>
                  </div>
                </form>
              </div>

              {/* 2. Pengaturan Logo Resmi Instansi & Auto-Konversi Favicon */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(59, 130, 246, 0.12)",
                      color: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <ImageIcon size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                        Logo Resmi Instansi &amp; Favicon Otomatis
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Auto kompresi logo (maks 256px) &amp; generate favicon tajam (48x48) agar tab browser &amp; aplikasi super ringan.
                      </p>
                    </div>
                  </div>

                  {currentLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--danger, #ef4444)", borderColor: "rgba(239,68,68,0.3)", fontSize: "0.78rem" }}
                      title="Kembalikan ke ikon sistem bawaan"
                    >
                      <Trash2 size={13} />
                      <span>Hapus Logo Kustom</span>
                    </button>
                  )}
                </div>

                {/* Pratinjau Ganda: Logo Aplikasi & Mockup Tab Browser */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.25rem"
                }}>
                  {/* Box 1: Pratinjau Tampilan Logo Aplikasi & Laporan */}
                  <div style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "160px",
                    position: "relative"
                  }}>
                    <div style={{
                      fontSize: "0.74rem",
                      fontWeight: "700",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.75rem",
                      alignSelf: "flex-start"
                    }}>
                      Pratinjau Logo Utama (Aplikasi &amp; Kop)
                    </div>

                    <div style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "14px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-subtle)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      padding: "8px"
                    }}>
                      {currentLogo ? (
                        <img
                          src={currentLogo}
                          alt="Logo Resmi"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-muted)" }}>
                          <School size={28} />
                          <span style={{ fontSize: "0.68rem", marginTop: "4px" }}>Default</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center" }}>
                      {currentLogo ? (
                        <span>Aktif di Sidebar, Halaman Login, &amp; Cetak PDF</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Menggunakan ikon bawaan sistem</span>
                      )}
                    </div>
                  </div>

                  {/* Box 2: Mockup Nyata Tab Browser (Favicon Otomatis) */}
                  <div style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column"
                  }}>
                    <div style={{
                      fontSize: "0.74rem",
                      fontWeight: "700",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.75rem"
                    }}>
                      Pratinjau Favicon Tab Browser
                    </div>

                    {/* Mini Browser Bar Mockup */}
                    <div style={{
                      background: "var(--bg-primary)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle)",
                      overflow: "hidden",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                    }}>
                      {/* Browser Header dots */}
                      <div style={{
                        padding: "6px 10px",
                        background: "var(--bg-secondary)",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                      </div>

                      {/* Mockup Active Tab */}
                      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center" }}>
                        <div style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          maxWidth: "230px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                        }}>
                          {/* Favicon Display (18x18 crisp) */}
                          <div style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "3px",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            {currentFavicon ? (
                              <img
                                src={currentFavicon}
                                alt="Favicon"
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <div style={{ width: "14px", height: "14px", background: "var(--accent-primary)", borderRadius: "2px" }} />
                            )}
                          </div>
                          <span style={{
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}>
                            E-Kinerja | {localSchoolName || "SMAN Garuda"}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "auto", cursor: "default" }}>
                            ✕
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Favicon langsung aktif di tab browser Anda secara otomatis tanpa perlu reload.
                    </div>
                  </div>
                </div>

                {/* Upload Drag & Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    background: isDragging ? "var(--accent-primary-light)" : "var(--bg-tertiary)",
                    borderRadius: "10px",
                    padding: "1.25rem 1rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => document.getElementById("logo-upload-input")?.click()}
                >
                  <input
                    id="logo-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />

                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "var(--bg-primary)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 0.6rem auto",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                  }}>
                    {isProcessingLogo ? (
                      <RotateCcw className="animate-spin" size={20} />
                    ) : (
                      <UploadCloud size={20} />
                    )}
                  </div>

                  <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    {isProcessingLogo ? "Sedang Mengompresi & Membuat Favicon..." : "Klik untuk Pilih Berkas atau Seret Logo ke Sini"}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Mendukung format PNG, JPG, WEBP, atau SVG transparan. Ukuran akan otomatis di-downscale agar ringan.
                  </p>
                </div>

                {/* Status Optimasi / Info Metrik */}
                {logoStats && (
                  <div style={{
                    marginTop: "0.85rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    fontSize: "0.8rem",
                    color: "var(--text-primary)"
                  }}>
                    <CheckCheck size={18} style={{ color: "#10b981", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <strong>Optimasi Berhasil:</strong> Berkas asli ({(logoStats.originalSize / 1024).toFixed(1)} KB) ➔{" "}
                      <span style={{ color: "#10b981", fontWeight: "700" }}>
                        Logo {(logoStats.logoSize / 1024).toFixed(1)} KB ({logoStats.width}x{logoStats.height}px)
                      </span>{" "}
                      &amp; Favicon {(logoStats.faviconSize / 1024).toFixed(1)} KB (48x48px).{" "}
                      {logoStats.savedPercent > 0 && (
                        <span style={{ color: "var(--text-muted)" }}>Hemat ~{logoStats.savedPercent}% bandwidth!</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Tata Kelola Izin API Key Gemini (.env) */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      Kebijakan Akses Google Gemini AI Sistem (.env)
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Atur izin akses model AI server-side untuk seluruh akun pegawai atau kunci agar memakai key pribadi masing-masing.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1.25rem",
                  border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        Status Ringkasan Izin Pegawai:
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {accounts.filter(a => a.allowEnvKey !== false).length} dari {accounts.length} pegawai saat ini <strong>diizinkan</strong> memakai AI Sistem.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleBatchAllowAll}
                        style={{ color: "#059669", fontWeight: "600" }}
                      >
                        <CheckCheck size={14} /> Izinkan Semua Pegawai
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleBatchDisallowAll}
                        style={{ color: "#dc2626", fontWeight: "600" }}
                      >
                        Kunci Semua Pegawai
                      </button>
                    </div>
                  </div>
                </div>

                {onOpenGeminiSettings && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={onOpenGeminiSettings}
                    >
                      <Sliders size={13} /> Buka Konfigurasi API Key Server
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SubTab: SSO Zitadel & Kebijakan Registrasi */}
          {activeSubTab === "sso" && (
            <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <form onSubmit={handleSaveSsoSettings} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* 1. Integrasi Zitadel OIDC Single Sign-On */}
                <div style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                          Integrasi OIDC SSO Zitadel
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          Izinkan login Single Sign-On khusus GTK (Guru &amp; Tenaga Kependidikan) ber-NIP resmi.
                        </p>
                      </div>
                    </div>

                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={ssoForm.enabled}
                        onChange={(e) => setSsoForm({ ...ssoForm, enabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", accentColor: "#059669" }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: "700", color: ssoForm.enabled ? "#059669" : "var(--text-muted)" }}>
                        {ssoForm.enabled ? "SSO Aktif" : "Nonaktif"}
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: "700" }}>
                        Label Teks Tombol SSO (Kustomisasi)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={ssoForm.buttonText}
                        onChange={(e) => setSsoForm({ ...ssoForm, buttonText: e.target.value })}
                        placeholder="Masuk dengan SSO"
                        required
                      />
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Teks ini akan tampil pada tombol masuk SSO di Halaman Login &amp; Modal Masuk. Default: <em>Masuk dengan SSO</em>.
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: "700" }}>
                        Issuer Zitadel (URL Domain OIDC)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={ssoForm.issuer || ""}
                        onChange={(e) => setSsoForm({ ...ssoForm, issuer: e.target.value })}
                        placeholder="Contoh: https://auth.instansi.go.id"
                      />
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Domain authority penyedia OIDC Zitadel instansi.
                      </span>
                    </div>

                    <div style={{
                      background: "var(--bg-tertiary)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem"
                    }}>
                      <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>Aturan Keamanan Metadata Zitadel:</div>
                      <div>&bull; Hanya pengguna ber-role <strong>guru</strong> atau <strong>tendik</strong> yang diizinkan masuk.</div>
                      <div>&bull; Wajib memiliki <strong>NIP ASN tepat 18 digit angka</strong>. Fallback NIK 16 digit akan otomatis ditolak dengan pesan: <em>"Anda tidak memiliki akses ke Website ini"</em>.</div>
                    </div>
                  </div>
                </div>

                {/* 2. Kebijakan Pendaftaran / Registrasi (Terbuka vs Tertutup) */}
                <div style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(37, 99, 235, 0.12)",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                        Kebijakan Registrasi Akun Pegawai
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Tentukan apakah pendaftaran mandiri internal dibuka atau dialihkan ke tautan eksternal.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <label style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        border: `2px solid ${ssoForm.registrationMode === "open" ? "#2563eb" : "var(--border-subtle)"}`,
                        background: ssoForm.registrationMode === "open" ? "rgba(37, 99, 235, 0.04)" : "var(--bg-tertiary)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="radio"
                            name="regMode"
                            value="open"
                            checked={ssoForm.registrationMode === "open"}
                            onChange={() => setSsoForm({ ...ssoForm, registrationMode: "open" })}
                            style={{ accentColor: "#2563eb" }}
                          />
                          <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>Registrasi Terbuka</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.4rem" }}>
                          Pegawai dapat mendaftar mandiri melalui form aplikasi dengan Kode Registrasi resmi.
                        </span>
                      </label>

                      <label style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        border: `2px solid ${ssoForm.registrationMode === "closed" ? "#dc2626" : "var(--border-subtle)"}`,
                        background: ssoForm.registrationMode === "closed" ? "rgba(220, 38, 38, 0.04)" : "var(--bg-tertiary)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="radio"
                            name="regMode"
                            value="closed"
                            checked={ssoForm.registrationMode === "closed"}
                            onChange={() => setSsoForm({ ...ssoForm, registrationMode: "closed" })}
                            style={{ accentColor: "#dc2626" }}
                          />
                          <span style={{ fontWeight: "700", fontSize: "0.9rem", color: ssoForm.registrationMode === "closed" ? "#dc2626" : "inherit" }}>
                            Registrasi Tertutup (Tautan Luar)
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.4rem" }}>
                          Form registrasi lokal ditutup; dialihkan ke tombol tautan portal registrasi resmi.
                        </span>
                      </label>
                    </div>

                    {ssoForm.registrationMode === "closed" && (
                      <div style={{
                        padding: "1rem",
                        borderRadius: "8px",
                        background: "rgba(220, 38, 38, 0.03)",
                        border: "1px dashed rgba(220, 38, 38, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: "700", color: "#991b1b" }}>
                            Tautan URL Registrasi Resmi (Tampil sebagai Tombol) *
                          </label>
                          <input
                            type="url"
                            className="input-field"
                            value={ssoForm.closedRegistrationUrl || ""}
                            onChange={(e) => setSsoForm({ ...ssoForm, closedRegistrationUrl: e.target.value })}
                            placeholder="https://siap-gtk.kemdikbud.go.id atau link portal pendaftaran"
                            required={ssoForm.registrationMode === "closed"}
                          />
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Pegawai yang membuka tab pendaftaran akan diarahkan menuju tautan ini melalui tombol.
                          </span>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: "700" }}>
                            Pesan Pengumuman Registrasi Tertutup
                          </label>
                          <textarea
                            className="input-field"
                            rows={2}
                            value={ssoForm.closedRegistrationMessage || ""}
                            onChange={(e) => setSsoForm({ ...ssoForm, closedRegistrationMessage: e.target.value })}
                            placeholder="Pendaftaran akun mandiri dinonaktifkan oleh administrator..."
                            style={{ resize: "vertical" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={isSavingSso}
                    className="btn btn-primary"
                    style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.4rem" }}
                  >
                    <Save size={15} />
                    <span>{isSavingSso ? "Menyimpan..." : "Simpan Pengaturan SSO & Registrasi"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SubTab 2: Master Jabatan & Kasaran */}
          {activeSubTab === "jabatan" && (
            <div>
              {/* Bar Atas: Pencarian, Tambah Jabatan Baru, Reset Seeder */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "420px" }}>
                  <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input-field"
                    value={searchJabatanQuery}
                    onChange={(e) => setSearchJabatanQuery(e.target.value)}
                    placeholder="Cari nama jabatan, kategori, atau kata kunci..."
                    style={{ paddingLeft: "2.2rem", fontSize: "0.85rem", margin: 0, width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleStartAddJabatan}
                    style={{ fontWeight: "700" }}
                  >
                    <Plus size={14} />
                    <span>Tambah Jabatan Baru</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetSeederJabatan}
                    title="Kembalikan semua contoh kasaran ke data seeder bawaan"
                    style={{ color: "#b45309", borderColor: "rgba(245, 158, 11, 0.4)" }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Seeder Bawaan</span>
                  </button>
                </div>
              </div>

              {/* Form Tambah / Ubah Master Jabatan */}
              {(isAddingJabatan || editingJabatanId) && (
                <form onSubmit={handleSaveJabatan} style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--accent-primary, #3b82f6)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  marginBottom: "1.5rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      {editingJabatanId ? "Edit Jabatan Master" : "Tambah Jabatan Master Baru"}
                    </h4>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setIsAddingJabatan(false);
                        setEditingJabatanId(null);
                      }}
                    >
                      Batal
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nama Jabatan Kedinasan *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={jabatanFormData.nama}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, nama: e.target.value })}
                        placeholder="misal: Arsiparis Ahli Pertama"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Kategori / Rumpun</label>
                      <input
                        type="text"
                        className="input-field"
                        value={jabatanFormData.kategori}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, kategori: e.target.value })}
                        placeholder="misal: Kearsipan & Dokumentasi"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label">Kata Kunci Pencocokan (Pisahkan dengan koma)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={jabatanFormData.keywords}
                      onChange={(e) => setJabatanFormData({ ...jabatanFormData, keywords: e.target.value })}
                      placeholder="misal: arsip, berkas, naskah dinas, dokumen"
                    />
                  </div>

                  {!editingJabatanId && (
                    <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                      <label className="form-label">Contoh Kalimat Kasaran Awal (1 baris per contoh)</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={jabatanFormData.contohKasaranText}
                        onChange={(e) => setJabatanFormData({ ...jabatanFormData, contohKasaranText: e.target.value })}
                        placeholder="menata berkas arsip masuk&#10;memindai dokumen keputusan kepala sekolah"
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: "700" }}>
                      <Check size={14} />
                      <span>{editingJabatanId ? "Simpan Perubahan" : "Tambahkan Jabatan"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Grid Daftar Master Jabatan */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {filteredJabatan.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                    Tidak ada master jabatan yang sesuai dengan kata kunci pencarian.
                  </div>
                ) : (
                  filteredJabatan.map((jab) => (
                    <div 
                      key={jab.id}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "10px",
                        padding: "1rem 1.25rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                              {jab.nama}
                            </span>
                            <span className="badge badge-aspek" style={{ fontSize: "0.7rem" }}>
                              {jab.kategori || "Umum"}
                            </span>
                          </div>
                          {jab.keywords && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
                              <Tag size={11} style={{ display: "inline", marginRight: "3px" }} />
                              Kata Kunci: {Array.isArray(jab.keywords) ? jab.keywords.join(", ") : jab.keywords}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleStartEditJabatan(jab)}
                            title="Edit Jabatan"
                            style={{ padding: "0.25rem" }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => handleDeleteJabatan(jab)}
                            title="Hapus Jabatan"
                            style={{ padding: "0.25rem" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Bank Contoh Kasaran */}
                      <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "0.75rem", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                          Bank Kalimat Kasaran ({jab.contohKasaran?.length || 0} contoh):
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.6rem" }}>
                          {(jab.contohKasaran || []).map((contoh, idx) => (
                            <div 
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.8rem",
                                padding: "0.25rem 0.5rem",
                                background: "var(--bg-surface)",
                                borderRadius: "4px",
                                border: "1px solid var(--border-subtle)"
                              }}
                            >
                              <span>&bull; {contoh}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteContoh(jab.id, idx)}
                                title="Hapus contoh ini"
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0 4px", fontSize: "0.9rem" }}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Tambah Kalimat Kasaran Inline */}
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Tambah contoh kalimat kasaran baru untuk jabatan ini..."
                            value={inlineContohInputs[jab.id] || ""}
                            onChange={(e) => setInlineContohInputs({ ...inlineContohInputs, [jab.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddInlineContoh(jab.id);
                              }
                            }}
                            style={{ margin: 0, fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAddInlineContoh(jab.id)}
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.76rem" }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SubTab 3: Sistem & Database */}
          {activeSubTab === "database" && (
            <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      Status Penyimpanan Basis Data
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Informasi konektivitas basis data server dan pencadangan.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem"
                }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Engine Database Aktif:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", marginTop: "2px" }}>
                      {liveDbStatus?.type || dbConfig?.type || "PostgreSQL / SQLite"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status Konektivitas:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#10b981", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                      <span>{liveDbStatus?.status === "connected" ? "Terhubung (Online)" : "Aktif"}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Host / Target:</div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "2px" }}>
                      {liveDbStatus?.host || "localhost:5432"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopySeederCode}
                    style={{ fontWeight: "600" }}
                  >
                    <Copy size={14} />
                    <span>Salin Kode Seeder Akun Bawaan</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Cloudflare R2 / S3 Object Storage */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Cloud size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      Storage Berkas Eviden (Cloudflare R2 / S3)
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Arsitektur penyimpanan objek berbasis presigned token agar server tetap ringan.
                    </p>
                  </div>
                </div>

                <div style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  padding: "1rem",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1rem"
                }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Metode Penyimpanan:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", marginTop: "2px" }}>
                      {storageStatus?.enabled ? "Cloudflare R2 (Presigned)" : "Penyimpanan Lokal"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status Layanan:</div>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: storageStatus?.enabled ? "#10b981" : "#f59e0b", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: storageStatus?.enabled ? "#10b981" : "#f59e0b", display: "inline-block" }} />
                      <span>{storageStatus?.enabled ? "Presign Aktif (Online)" : "Lokal (/database/uploads)"}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target Bucket:</div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "2px" }}>
                      {storageStatus?.bucket || "-"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Folder Prefix:</div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "2px" }}>
                      /{storageStatus?.folderPath || "ekinsmansage"}
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Public CDN Access URL:</div>
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--accent-primary)", marginTop: "2px", wordBreak: "break-all" }}>
                      {storageStatus?.publicUrl || "-"}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  background: "var(--bg-tertiary)",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  lineHeight: 1.5
                }}>
                  💡 <strong>Keuntungan Arsitektur Presigned URL:</strong> Berkas eviden (foto/PDF) diunggah langsung dari browser pengguna ke Cloudflare R2 menggunakan token sementara. Server aplikasi tidak terbebani konsumsi RAM, bandwidth, atau kapasitas harddisk server. Berkas dibuka melalui domain publik CDN resmi.
                </div>
              </div>

              {/* Card 3: Pembersihan Berkas Eviden Berdasarkan Pilihan Tahun */}
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(220, 38, 38, 0.12)",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                        Pembersihan Berkas Eviden (Pilihan Tahun)
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Pindai dan hapus berkas lampiran eviden usang di Cloudflare R2 / S3 untuk menghemat kapasitas penyimpanan.
                      </p>
                    </div>
                  </div>

                  <span className="badge badge-warning" style={{ fontSize: "0.72rem" }}>
                    Tindakan Administrator
                  </span>
                </div>

                {/* Form Kontrol Filter Tahun */}
                <div style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "1rem"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                    {/* Pilih Tahun */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Calendar size={14} style={{ color: "var(--accent-primary)" }} />
                        <span>Pilih Tahun Berkas:</span>
                      </label>
                      <select
                        className="input-field"
                        value={cleanupYear}
                        onChange={(e) => {
                          setCleanupYear(parseInt(e.target.value, 10));
                          setScanResult(null);
                        }}
                        style={{ fontWeight: "700", fontSize: "0.95rem" }}
                      >
                        {availableYearOptions.map(yr => (
                          <option key={yr} value={yr}>
                            Tahun {yr} {yr === currentYear ? "(Tahun Berjalan)" : yr === currentYear - 1 ? "(Tahun Lalu)" : ""}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>
                        Pilih tahun acuan berkas dokumen &amp; foto yang akan diperiksa.
                      </span>
                    </div>

                    {/* Pilih Cakupan / Mode */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: "700" }}>
                        Cakupan Pembersihan:
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "4px" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                          <input
                            type="radio"
                            name="cleanupMode"
                            value="before_or_equal"
                            checked={cleanupMode === "before_or_equal"}
                            onChange={() => {
                              setCleanupMode("before_or_equal");
                              setScanResult(null);
                            }}
                            style={{ accentColor: "#dc2626" }}
                          />
                          <span>Tahun <strong>{cleanupYear}</strong> dan seluruh tahun sebelumnya (Rekomendasi)</span>
                        </label>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                          <input
                            type="radio"
                            name="cleanupMode"
                            value="exact"
                            checked={cleanupMode === "exact"}
                            onChange={() => {
                              setCleanupMode("exact");
                              setScanResult(null);
                            }}
                            style={{ accentColor: "#dc2626" }}
                          />
                          <span>Hanya berkas tepat tahun <strong>{cleanupYear}</strong> saja</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Pindai */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleScanCleanup}
                      disabled={isScanningCleanup || isExecutingCleanup}
                      style={{ fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <RefreshCw size={14} className={isScanningCleanup ? "animate-spin" : ""} />
                      <span>{isScanningCleanup ? "Memindai R2..." : `Pindai Berkas Tahun ${cleanupYear}`}</span>
                    </button>
                  </div>
                </div>

                {/* Hasil Pratinjau Pemindaian */}
                {scanResult && (
                  <div style={{
                    background: scanResult.matchedCount > 0 ? "rgba(239, 68, 68, 0.04)" : "var(--bg-tertiary)",
                    border: `1px solid ${scanResult.matchedCount > 0 ? "rgba(239, 68, 68, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "8px",
                    padding: "1.25rem",
                    marginBottom: "1rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: scanResult.matchedCount > 0 ? "#991b1b" : "var(--text-primary)" }}>
                          Hasil Pemindaian: {scanResult.matchedCount} Berkas Ditemukan
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                          Total ukuran yang dapat dibebaskan: <strong>{scanResult.matchedSizeFormatted}</strong> (dari total {scanResult.totalScanned} objek dipindai)
                        </div>
                      </div>

                      {scanResult.matchedCount > 0 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleExecuteCleanup}
                          disabled={isExecutingCleanup}
                          style={{
                            fontWeight: "700",
                            background: "#dc2626",
                            borderColor: "#dc2626",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.5rem 1rem"
                          }}
                        >
                          <Trash2 size={14} />
                          <span>{isExecutingCleanup ? "Menghapus..." : `Bersihkan ${scanResult.matchedCount} Berkas Sekarang`}</span>
                        </button>
                      )}
                    </div>

                    {scanResult.matchedCount === 0 ? (
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>
                        ✓ Tidak ada berkas usang yang cocok dengan kriteria tahun yang dipilih. Penyimpanan Anda bersih!
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                          Sampel Berkas yang Akan Dihapus ({scanResult.files.length} berkas):
                        </div>
                        <div style={{
                          maxHeight: "180px",
                          overflowY: "auto",
                          background: "var(--bg-surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          padding: "0.5rem"
                        }}>
                          {scanResult.files.map((f, fIdx) => (
                            <div key={f.key || fIdx} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.78rem",
                              padding: "0.3rem 0.5rem",
                              borderBottom: fIdx === scanResult.files.length - 1 ? "none" : "1px solid var(--border-subtle)"
                            }}>
                              <span style={{ fontFamily: "monospace", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }} title={f.fileName}>
                                {f.fileName}
                              </span>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <span className="badge badge-secondary" style={{ fontSize: "0.68rem" }}>Tahun {f.fileYear || "-"}</span>
                                <span>{f.sizeFormatted}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Berhasil Dibersihkan */}
                {cleanupSuccessResult && (
                  <div style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px",
                    padding: "1rem 1.25rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}>
                    <CheckCheck size={20} style={{ color: "#059669", flexShrink: 0 }} />
                    <div style={{ fontSize: "0.85rem", color: "#065f46" }}>
                      <strong>Pembersihan Berhasil:</strong> Sebanyak <strong>{cleanupSuccessResult.deletedCount} berkas</strong> ({cleanupSuccessResult.deletedSizeFormatted}) pada kriteria tahun {cleanupSuccessResult.targetYear} telah dihapus permanen dari Cloudflare R2.
                    </div>
                  </div>
                )}

                <div style={{
                  fontSize: "0.78rem",
                  color: "#991b1b",
                  background: "rgba(220, 38, 38, 0.04)",
                  border: "1px dashed rgba(220, 38, 38, 0.25)",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem"
                }}>
                  <AlertTriangle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Perhatian Keamanan Data:</strong> Berkas yang dihapus melalui fitur ini akan dihapus secara permanen dari bucket Cloudflare R2 / S3 dan tidak dapat dipulihkan. Pastikan laporan bulanan ASN tahun terkait telah diarsipkan atau dicetak jika diperlukan sebelum melakukan pembersihan.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
