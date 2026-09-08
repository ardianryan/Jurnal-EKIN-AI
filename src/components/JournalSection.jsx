import Sheet from "./ui/Sheet";
import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, Plus, PlusCircle, Camera, Trash2, Sparkles, 
  Calendar, Clock, CheckCircle2, FileText, ExternalLink, 
  X, ZoomIn, Paperclip, FileSpreadsheet, Link2, Briefcase, Edit3,
  RefreshCw, ChevronDown, Search, Check, Filter
} from "lucide-react";
import confetti from "canvas-confetti";
import { processEvidenceFile } from "../utils/fileUtils";
import { polishJournalWithAi } from "../services/aiService";
import { getCasualExamplesForUser } from "../services/jabatanService";
import { getAccounts } from "../services/accountService";

export default function JournalSection({
  journals,
  setJournals,
  rhkList,
  onSyncJournalToRhk,
  onOpenMonthlyReport,
  pegawai,
  geminiApiKey,
  apiKeyInfo = { key: "", source: "none" },
  currentUser,
  isSyncing = false,
  onRefreshSync = null,
  lastSyncTime = null,
  onOpenGeminiModal = null,
  searchQuery = ""
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isPolished, setIsPolished] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const formContainerRef = useRef(null);
  const [originalKasaran, setOriginalKasaran] = useState("");
  const [selectedJabatanOverride, setSelectedJabatanOverride] = useState("");
  const [isProfesiOpen, setIsProfesiOpen] = useState(false);
  const [profesiSearch, setProfesiSearch] = useState("");
  const profesiRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profesiRef.current && !profesiRef.current.contains(event.target)) {
        setIsProfesiOpen(false);
      }
    }
    if (isProfesiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfesiOpen]);

  const currentJabatan = pegawai?.jabatan || currentUser?.jabatan || "";
  const activeJabatanForExamples = selectedJabatanOverride || currentJabatan;
  const accounts = getAccounts();
  const casualData = getCasualExamplesForUser(activeJabatanForExamples, journals, accounts);

  const filteredJabatanList = (casualData.allJabatanList || []).filter((j) => {
    if (!profesiSearch.trim()) return true;
    const q = profesiSearch.toLowerCase();
    return (
      (j.nama && j.nama.toLowerCase().includes(q)) ||
      (j.kategori && j.kategori.toLowerCase().includes(q))
    );
  });

  // Filter jurnal khusus pengguna yang sedang login
  const currentUserId = currentUser?.id || (currentUser?.username ? `usr-${currentUser.username}` : "");
  const currentUsername = (currentUser?.username || "").toLowerCase();
  const isSuperadmin = currentUser?.role === "superadmin";

  const displayedJournals = isSuperadmin 
    ? journals 
    : journals.filter(j => {
        if (!currentUser) return false;
        if (j.userId && (j.userId === currentUserId || j.userId === currentUser.id)) return true;
        if (j.username && j.username.toLowerCase() === currentUsername) return true;
        if (!j.userId && !j.username && (currentUsername === "farras" || currentUserId === "usr-farras")) return true;
        return false;
      });

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: "08:00 - 12:00",
    aktivitas: "",
    outputJumlah: "1 Dokumen / Kegiatan",
    rhkId: rhkList[0]?.id || "",
    catatan: "",
    attachments: [],
    evidenceType: "none", // "image" | "document" | "none"
    docCategory: "pdf",
    fileName: "",
    fileSize: "",
    fotoUrl: "",
    linkUrl: ""
  });

  const [isUploading, setIsUploading] = useState(false);
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [notification, setNotification] = useState("");
  const fileInputRef = useRef(null);

  // Handle File Upload (Foto, PDF, Word, Excel, dll. - Mendukung Multi-File)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const newAttachments = [];

      for (const file of files) {
        const processed = await processEvidenceFile(file);

        // Unggah Berkas: Prioritaskan Cloudflare R2 / S3 via Presigned URL (Direct Upload Ringan)
        let serverFileUrl = "";
        let serverStoredName = "";
        let finalFileName = processed.name;
        let isDirectR2Uploaded = false;

        // 1. Coba Presigned Token Upload ke R2
        try {
          const uploadBlob = processed.blob || file;
          const uploadContentType = processed.category === "image" ? "image/jpeg" : (file.type || "application/octet-stream");

          const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: processed.name || file.name,
              fileType: uploadContentType,
              tanggal: formData.tanggal || new Date().toISOString().slice(0, 10)
            })
          });

          if (presignRes.ok) {
            const presignData = await presignRes.json();
            if (presignData.success && presignData.presignedUrl) {
              // Upload langsung dari browser ke R2 via PUT (Streaming biner hasil kompresi browser, sangat hemat kuota & RAM)
              const putRes = await fetch(presignData.presignedUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": uploadContentType
                },
                body: uploadBlob
              });

              if (putRes.ok) {
                serverFileUrl = presignData.publicUrl;
                serverStoredName = presignData.storedName;
                finalFileName = presignData.fileName || processed.name;
                isDirectR2Uploaded = true;
              }
            }
          }
        } catch (r2Err) {
          console.warn("Direct R2 presign upload tertunda/gagal, beralih ke upload server:", r2Err.message);
        }

        // 2. Fallback: Jika R2 belum aktif atau direct upload gagal, gunakan server upload lokal /api/upload
        if (!isDirectR2Uploaded) {
          try {
            const uploadRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: processed.name,
                fileData: processed.dataUrl,
                tanggal: formData.tanggal || new Date().toISOString().slice(0, 10)
              })
            });
            if (uploadRes.ok) {
              const upJson = await uploadRes.json();
              if (upJson?.fileUrl) {
                serverFileUrl = upJson.fileUrl;
              }
              if (upJson?.storedName) {
                serverStoredName = upJson.storedName;
              }
              if (upJson?.fileName) {
                finalFileName = upJson.fileName;
              }
            }
          } catch (netErr) {
            // Mode offline/standalone, gunakan dataUrl lokal
          }
        }

        const isImg = processed.category === "image";
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: isImg ? "image" : "document",
          docCategory: isImg ? "image" : processed.type,
          fileName: finalFileName,
          storedName: serverStoredName,
          fileSize: processed.size,
          originalSize: processed.originalSize || "",
          fotoUrl: processed.dataUrl,
          fileUrl: serverFileUrl
        });
      }

      setFormData(prev => {
        const combined = [...(prev.attachments || []), ...newAttachments];
        const first = combined[0];
        return {
          ...prev,
          attachments: combined,
          evidenceType: first ? first.type : "none",
          docCategory: first ? first.docCategory : "pdf",
          fileName: first ? first.fileName : "",
          storedName: first ? first.storedName : "",
          fileSize: first ? first.fileSize : "",
          originalSize: first ? first.originalSize : "",
          fotoUrl: first ? first.fotoUrl : "",
          fileUrl: first ? first.fileUrl : "",
          linkUrl: prev.linkUrl || ""
        };
      });
    } catch (err) {
      alert("Gagal memproses file: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (attId) => {
    setFormData(prev => {
      const targetAtt = (prev.attachments || []).find(a => a.id === attId);
      if (targetAtt && (targetAtt.fileUrl || targetAtt.filePath || targetAtt.storedName)) {
        fetch("/api/uploads/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: targetAtt.fileUrl,
            filePath: targetAtt.filePath,
            fileName: targetAtt.fileName,
            storedName: targetAtt.storedName
          })
        }).catch(() => {});
      }

      const remaining = (prev.attachments || []).filter(a => a.id !== attId);
      const first = remaining[0];
      return {
        ...prev,
        attachments: remaining,
        evidenceType: first ? first.type : "none",
        docCategory: first ? first.docCategory : "pdf",
        fileName: first ? first.fileName : "",
        storedName: first ? first.storedName : "",
        fileSize: first ? first.fileSize : "",
        fotoUrl: first ? first.fotoUrl : "",
        fileUrl: first ? first.fileUrl : ""
      };
    });
  };

  const handleRemoveFile = () => {
    // Bersihkan file server dari seluruh attachments draft yang dibatalkan
    if (Array.isArray(formData.attachments)) {
      for (const att of formData.attachments) {
        if (att && (att.fileUrl || att.filePath || att.storedName)) {
          fetch("/api/uploads/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileUrl: att.fileUrl,
              filePath: att.filePath,
              fileName: att.fileName,
              storedName: att.storedName
            })
          }).catch(() => {});
        }
      }
    }
    setFormData(prev => ({
      ...prev,
      attachments: [],
      evidenceType: "none",
      docCategory: "pdf",
      fileName: "",
      storedName: "",
      fileSize: "",
      fotoUrl: "",
      fileUrl: ""
    }));
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      jam: "08:00 - 12:00",
      aktivitas: "",
      outputJumlah: "1 Dokumen / Kegiatan",
      rhkId: rhkList[0]?.id || "",
      catatan: "",
      attachments: [],
      evidenceType: "none",
      docCategory: "pdf",
      fileName: "",
      storedName: "",
      fileSize: "",
      fotoUrl: "",
      fileUrl: "",
      linkUrl: ""
    });
    setOriginalKasaran("");
    setEditingId(null);
    setIsPolished(false);
  };

  const handleCloseForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const handleStartNewJournal = () => {
    resetForm();
    setIsFormOpen(true);
    setNotification("Formulir siap untuk menambah jurnal baru.");
    setTimeout(() => setNotification(""), 3000);
    setTimeout(() => {
      if (formContainerRef.current) {
        formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleEditJournal = (j) => {
    setEditingId(j.id);
    const existingAttachments = Array.isArray(j.attachments) && j.attachments.length > 0
      ? j.attachments
      : (j.fotoUrl || j.fileName ? [{
          id: `att-${Date.now()}`,
          type: j.evidenceType || (j.fotoUrl ? "image" : "document"),
          docCategory: j.docCategory || (j.fotoUrl ? "image" : "pdf"),
          fileName: j.fileName || (j.fotoUrl ? "Foto Bukti" : "Dokumen Bukti"),
          storedName: j.storedName || "",
          fileSize: j.fileSize || "",
          fotoUrl: j.fotoUrl || "",
          fileUrl: j.fileUrl || ""
        }] : []);

    const firstAtt = existingAttachments[0];

    setFormData({
      tanggal: j.tanggal || new Date().toISOString().slice(0, 10),
      jam: j.jam || "08:00 - 12:00",
      aktivitas: j.aktivitas || "",
      outputJumlah: j.outputJumlah || "1 Dokumen / Kegiatan",
      rhkId: j.rhkId || (rhkList[0]?.id || ""),
      catatan: j.catatan || "",
      attachments: existingAttachments,
      evidenceType: firstAtt ? firstAtt.type : (j.evidenceType || "none"),
      docCategory: firstAtt ? firstAtt.docCategory : (j.docCategory || "pdf"),
      fileName: firstAtt ? firstAtt.fileName : (j.fileName || ""),
      storedName: firstAtt ? firstAtt.storedName : (j.storedName || ""),
      fileSize: firstAtt ? firstAtt.fileSize : (j.fileSize || ""),
      fotoUrl: firstAtt ? firstAtt.fotoUrl : (j.fotoUrl || ""),
      fileUrl: firstAtt ? firstAtt.fileUrl : (j.fileUrl || ""),
      linkUrl: j.linkUrl || ""
    });

    setOriginalKasaran(j.aktivitasKasaran || j.aktivitas || "");
    setIsPolished(true);
    setIsFormOpen(true);

    setTimeout(() => {
      if (formContainerRef.current) {
        formContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleSaveJournal = (e) => {
    e.preventDefault();
    if (!formData.aktivitas.trim()) {
      alert("Harap masukkan uraian aktivitas kerja!");
      return;
    }

    if (editingId) {
      setJournals(prev => prev.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            ...formData,
            aktivitasKasaran: originalKasaran || formData.aktivitas,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      }));
      resetForm();
      setIsFormOpen(false);
      setNotification("Catatan aktivitas berhasil diperbarui!");
      setTimeout(() => setNotification(""), 3500);
      return;
    }

    const activeUserId = currentUser?.id || (currentUser?.username ? `usr-${currentUser.username}` : "usr-farras");
    const activeUsername = currentUser?.username || "farras";

    const newEntry = {
      ...formData,
      id: `jrn-${Date.now()}`,
      userId: activeUserId,
      username: activeUsername,
      aktivitasKasaran: originalKasaran || formData.aktivitas
    };

    setJournals([newEntry, ...journals]);
    resetForm();
    setIsFormOpen(false);

    setNotification("Catatan aktivitas & bukti hasil kerja berhasil disimpan ke logbook!");
    setTimeout(() => setNotification(""), 3500);
  };

  // Memoles catatan kasaran / santai menjadi bahasa resmi kedinasan ASN
  const handlePolishActivity = async () => {
    if (!formData.aktivitas.trim()) {
      alert("Tuliskan dulu catatan aktivitas kasaran / santai Anda di kotak uraian! Contoh: 'benerin wifi guru yg mati trs cek mikrotik lab'");
      return;
    }

    try {
      setIsPolishing(true);
      if (!originalKasaran) {
        setOriginalKasaran(formData.aktivitas);
      }
      const textToPolish = originalKasaran || formData.aktivitas;
      const result = await polishJournalWithAi({
        rawText: textToPolish,
        rhkList,
        apiKey: geminiApiKey,
        jabatan: pegawai?.jabatan,
        unitKerja: pegawai?.unitKerja,
        provider: apiKeyInfo?.provider,
        baseUrl: apiKeyInfo?.baseUrl,
        model: apiKeyInfo?.model
      });

      setFormData(prev => ({
        ...prev,
        aktivitas: result.aktivitas,
        outputJumlah: result.outputJumlah || prev.outputJumlah,
        rhkId: result.rhkId || prev.rhkId,
        catatan: result.catatan || prev.catatan
      }));

      setIsPolished(true);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
      const is9router = apiKeyInfo?.provider === "openai" || (result.source && result.source.includes("openai"));
      const isOnlineAI = Boolean(
        result.isOnline ||
        (result.source && result.source !== "offline" && result.source !== "offline_429" && result.source !== "fallback-offline")
      );

      let notifMsg = `Berhasil! Catatan kasaran telah dipoles ke bahasa baku formal kedinasan ASN.`;
      if (result.source === "offline_429") {
        notifMsg = "Kuota AI habis (Error 429). Sistem otomatis beralih memoles dengan Mode Cerdas Offline bawaan!";
      } else if (isOnlineAI) {
        const providerTitle = is9router ? "OpenAI/9router" : "Gemini AI";
        const modelTag = (result.source && result.source.includes("("))
          ? ` (${result.source.split("(")[1].replace(")", "")})`
          : ` (${providerTitle})`;
        notifMsg = `Berhasil! Catatan kasaran telah dipoles menggunakan ${providerTitle} Online${modelTag}.`;
      } else {
        notifMsg = "Berhasil! Catatan kasaran telah dipoles menggunakan Mode Cerdas Offline bawaan.";
      }
      setNotification(notifMsg);
      setTimeout(() => setNotification(""), 5000);
    } catch (err) {
      alert("Gagal memoles catatan: " + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleDeleteJournal = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus catatan aktivitas ini?\n\nSemua file bukti fisik (foto/dokumen) yang tersimpan di server untuk aktivitas ini juga akan ikut dihapus permanen agar tidak meninggalkan file sampah.")) {
      try {
        await fetch("/api/journals/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
      } catch (err) {
        console.warn("Peringatan saat menghapus jurnal di backend:", err.message);
      }
      setJournals(prev => prev.filter(j => j.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setNotification("Catatan aktivitas dan seluruh berkas fisik lampiran terkait berhasil dihapus bersih.");
      setTimeout(() => setNotification(""), 3500);
    }
  };

  const renderFileIcon = (category, type) => {
    if (category === "image" || type === "image") {
      return <Camera size={16} className="text-blue-500" />;
    }
    if (type === "excel") {
      return <FileSpreadsheet size={16} className="text-emerald-500" />;
    }
    return <FileText size={16} className="text-amber-500" />;
  };

  return (
    <div className="glass-card mb-6" style={{ padding: "1.5rem" }}>
      {/* Header Bar Jurnal */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        gap: "1rem" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            width: "42px", 
            height: "42px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, #264b38, #3e7357)", 
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 10px rgba(38, 75, 56, 0.25)"
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Catat Aktivitas &amp; Poles Laporan</span>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>
                ({journals.length} Aktivitas)
              </span>
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Catatan harian ringkas &bull; Redaksi baku formal kedinasan &bull; Siap cetak laporan bulanan
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {onRefreshSync && (
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.35rem",
                cursor: isSyncing ? "wait" : "pointer"
              }}
              onClick={async () => {
                await onRefreshSync();
                setNotification("Data logbook berhasil disinkronkan dengan Telegram & Database!");
                setTimeout(() => setNotification(""), 3500);
              }}
              disabled={isSyncing}
              title="Sinkronkan data terkini dari Telegram Bot & Database Server"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Data"}</span>
            </button>
          )}

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenMonthlyReport}
            title="Buka dokumen laporan bulanan yang siap dicetak ke PDF"
          >
            <FileText size={14} />
            <span>Lihat Laporan Bulanan (PDF)</span>
          </button>

          <button 
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleStartNewJournal}
            title="Buka lembar formulir untuk menambah catatan kegiatan baru"
            style={{ fontWeight: "700" }}
          >
            <PlusCircle size={14} />
            <span>Tulis Jurnal Baru</span>
          </button>
        </div>
      </div>

      {notification && (
        <div style={{ 
          marginBottom: "1.25rem", 
          padding: "0.75rem 1rem", 
          background: "var(--accent-emerald-subtle)", 
          border: "1px solid var(--accent-emerald)",
          borderRadius: "var(--radius-md)",
          color: "var(--accent-emerald)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem"
        }}>
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Sheet Form Input Catatan Kasar & AI Polisher (Slide dari kanan di desktop, bawah di mobile) */}
      <Sheet
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={editingId ? "Edit Catatan Aktivitas Kerja" : "Tulis Catatan Kerja & Poles AI"}
        description={editingId ? "Perbarui uraian kegiatan, waktu, hasil output, atau bukti lampiran" : "Ketik catatan santai apa adanya, poles dengan AI menjadi bahasa formal kedinasan"}
        size="lg"
      >
        <form 
          ref={formContainerRef}
          onSubmit={handleSaveJournal}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}
        >
          {/* Status Mode Indicator: Edit vs Tambah */}
          {editingId && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-primary)" }}>
                Mengedit aktivitas: <strong style={{ color: "var(--accent-primary)" }}>{formData.tanggal} ({formData.jam})</strong>
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleStartNewJournal}
              >
                <PlusCircle size={13} />
                <span>Batal &amp; Tulis Baru</span>
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: editingId ? "var(--accent-primary)" : "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {editingId ? <Edit3 size={16} style={{ color: "var(--accent-primary)" }} /> : <Sparkles size={16} style={{ color: "var(--accent-primary)" }} />}
              <span>{editingId ? "Edit Catatan Aktivitas Kerja" : "Tulis Catatan Kerja Kasaran & Poles dengan AI"}</span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {editingId ? "Perbarui isi uraian, tanggal, lampiran, atau link lalu simpan perubahan" : "Ketik bahasa santai → Klik tombol poles → Simpan ke laporan"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Calendar size={13} /> Tanggal Kegiatan
              </label>
              <input 
                type="date" 
                className="input-field"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Clock size={13} /> Waktu / Durasi
              </label>
              <input 
                type="text" 
                className="input-field"
                value={formData.jam}
                onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                placeholder="09:00 - 11:30"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hasil / Output Kegiatan</label>
              <input 
                type="text" 
                className="input-field"
                value={formData.outputJumlah}
                onChange={(e) => setFormData({ ...formData, outputJumlah: e.target.value })}
                placeholder="Contoh: 1 Laporan, 1 Berkas, 1 Unit Terpasang..."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0, fontWeight: "700" }}>
                Uraian Catatan Kerja (Ketik Kasaran / Santai Apa Adanya):
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => onOpenGeminiModal && onOpenGeminiModal()}
                  style={{
                    fontSize: "0.72rem",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: "600",
                    border: "1px solid var(--border-subtle)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: onOpenGeminiModal ? "pointer" : "default"
                  }}
                  title="Klik untuk memilih mode AI: .env Sistem, Key Pribadi, atau Mode Offline Bawaan"
                >
                  <span style={{ 
                    width: "6px", 
                    height: "6px", 
                    borderRadius: "50%", 
                    background: apiKeyInfo?.source === "env" || apiKeyInfo?.source === "personal"
                      ? "var(--accent-primary)" 
                      : "#94a3b8" 
                  }}></span>
                  <span>
                    {apiKeyInfo?.source === "env" 
                      ? (apiKeyInfo?.provider === "openai" ? "AI Server (9router)" : "AI Server (.env)")
                      : apiKeyInfo?.source === "personal" 
                      ? (apiKeyInfo?.provider === "openai" ? "AI 9router Pribadi" : "AI Key Pribadi") 
                      : "AI Baku Offline"}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: "linear-gradient(135deg, #264b38, #3a6b52)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    padding: "0.45rem 1.1rem",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(38, 75, 56, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer"
                  }}
                  onClick={handlePolishActivity}
                  disabled={isPolishing}
                  title="Klik untuk menyusun bahasa kasaran menjadi narasi formal kedinasan ASN yang rapi"
                >
                  <Sparkles size={14} className={isPolishing ? "animate-spin" : ""} />
                  <span>{isPolishing ? "Memproses Narasi..." : "Poles Bahasa Formal ASN"}</span>
                </button>
              </div>
            </div>

            {/* Quick Inspiration Chips Berdasarkan Jabatan Rekan Kerja */}
            <div style={{ marginBottom: "0.6rem" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                flexWrap: "wrap", 
                gap: "0.4rem", 
                marginBottom: "0.35rem" 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: "700", 
                    color: "var(--accent-primary)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "5px" 
                  }}>
                    <Briefcase size={13} />
                    <span>Contoh kasaran rekan satu jabatan:</span>
                    <span style={{ 
                      background: "rgba(52, 99, 75, 0.12)", 
                      padding: "2px 8px", 
                      borderRadius: "6px", 
                      color: "var(--accent-primary)",
                      border: "1px solid rgba(52, 99, 75, 0.25)",
                      fontWeight: "700"
                    }}>
                      {casualData.matchedJabatan?.nama || currentJabatan || "Umum Kedinasan"}
                    </span>
                  </span>
                </div>

                {/* Opsi ganti profesi contoh jika multi-tasking */}
                {casualData.allJabatanList && casualData.allJabatanList.length > 0 && (
                  <div ref={profesiRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                    <span 
                      style={{ 
                        fontSize: "0.72rem", 
                        fontWeight: "600",
                        color: "var(--text-muted)", 
                        margin: 0,
                        whiteSpace: "nowrap"
                      }}
                    >
                      Lihat profesi lain:
                    </span>

                    {/* Custom Popover Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfesiOpen(!isProfesiOpen);
                        setProfesiSearch("");
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.74rem",
                        fontWeight: "600",
                        padding: "0.24rem 0.65rem",
                        borderRadius: "8px",
                        border: selectedJabatanOverride 
                          ? "1.5px solid var(--accent-primary, #3b82f6)" 
                          : "1px solid var(--border-color, #cbd5e1)",
                        background: selectedJabatanOverride 
                          ? "rgba(59, 130, 246, 0.08)" 
                          : "var(--bg-secondary, #f8fafc)",
                        color: selectedJabatanOverride 
                          ? "var(--accent-primary, #2563eb)" 
                          : "var(--text-primary, #1e293b)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isProfesiOpen 
                          ? "0 0 0 2px rgba(59, 130, 246, 0.2)" 
                          : "none"
                      }}
                      title="Klik untuk memilih profesi/jabatan lain"
                    >
                      <Briefcase size={12} style={{ opacity: 0.8 }} />
                      <span style={{ 
                        maxWidth: "180px", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap" 
                      }}>
                        {selectedJabatanOverride || casualData.matchedJabatan?.nama || "Pilih Profesi"}
                      </span>
                      <ChevronDown 
                        size={12} 
                        style={{ 
                          transition: "transform 0.2s ease",
                          transform: isProfesiOpen ? "rotate(180deg)" : "none",
                          opacity: 0.7
                        }} 
                      />
                    </button>

                    {selectedJabatanOverride && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJabatanOverride("");
                          setIsProfesiOpen(false);
                        }}
                        style={{
                          background: "#fee2e2",
                          border: "1px solid #fca5a5",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          color: "#dc2626",
                          cursor: "pointer",
                          padding: "0.18rem 0.45rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                        title="Kembali ke jabatan default saya"
                      >
                        <X size={11} />
                        <span>Reset</span>
                      </button>
                    )}

                    {/* Custom Popover Dropdown Menu */}
                    {isProfesiOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          width: "300px",
                          maxHeight: "340px",
                          background: "var(--bg-primary, #ffffff)",
                          border: "1px solid var(--border-color, #e2e8f0)",
                          borderRadius: "10px",
                          boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.08)",
                          zIndex: 1050,
                          padding: "0.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem"
                        }}
                      >
                        {/* Search Input */}
                        <div style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center"
                        }}>
                          <Search size={13} style={{ position: "absolute", left: "9px", color: "var(--text-muted, #94a3b8)", pointerEvents: "none" }} />
                          <input
                            type="text"
                            value={profesiSearch}
                            onChange={(e) => setProfesiSearch(e.target.value)}
                            placeholder="Cari profesi / jabatan..."
                            autoFocus
                            style={{
                              width: "100%",
                              padding: "0.35rem 1.6rem 0.35rem 1.8rem",
                              fontSize: "0.75rem",
                              borderRadius: "6px",
                              border: "1px solid var(--border-color, #cbd5e1)",
                              background: "var(--bg-secondary, #f8fafc)",
                              color: "var(--text-primary, #0f172a)",
                              outline: "none"
                            }}
                          />
                          {profesiSearch && (
                            <button
                              type="button"
                              onClick={() => setProfesiSearch("")}
                              style={{
                                position: "absolute",
                                right: "6px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px",
                                color: "var(--text-muted, #94a3b8)"
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* List Items */}
                        <div style={{
                          overflowY: "auto",
                          maxHeight: "240px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px"
                        }}>
                          {filteredJabatanList.length === 0 ? (
                            <div style={{
                              padding: "1rem",
                              textAlign: "center",
                              fontSize: "0.74rem",
                              color: "var(--text-muted, #94a3b8)"
                            }}>
                              Tidak ditemukan profesi yang cocok
                            </div>
                          ) : (
                            filteredJabatanList.map((j) => {
                              const isSelected = (selectedJabatanOverride || casualData.matchedJabatan?.nama) === j.nama;
                              return (
                                <button
                                  key={j.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedJabatanOverride(j.nama);
                                    setIsProfesiOpen(false);
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "6px 9px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: isSelected 
                                      ? "rgba(59, 130, 246, 0.09)" 
                                      : "transparent",
                                    color: isSelected 
                                      ? "var(--accent-primary, #2563eb)" 
                                      : "var(--text-primary, #1e293b)",
                                    cursor: "pointer",
                                    transition: "background 0.12s ease"
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "var(--bg-secondary, #f1f5f9)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                  }}
                                >
                                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", overflow: "hidden" }}>
                                    <span style={{ 
                                      fontSize: "0.75rem", 
                                      fontWeight: isSelected ? "700" : "600",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {j.nama}
                                    </span>
                                    {j.kategori && (
                                      <span style={{ 
                                        fontSize: "0.66rem", 
                                        color: "var(--text-muted, #64748b)",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap"
                                      }}>
                                        {j.kategori}
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Check size={14} style={{ color: "var(--accent-primary, #2563eb)", flexShrink: 0, marginLeft: "6px" }} />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Daftar Chips Contoh Kalimat Kasaran */}
              <div className="casual-examples-scroll">
                {casualData.examples.slice(0, 6).map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, aktivitas: sample });
                      setOriginalKasaran(sample);
                      setIsPolished(false);
                    }}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 8px",
                      fontSize: "0.73rem",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-primary)";
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "var(--accent-primary-light)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    }}
                    title="Isi contoh ini ke uraian kerja"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              className="textarea-field"
              rows={3}
              value={formData.aktivitas}
              onChange={(e) => {
                setFormData({ ...formData, aktivitas: e.target.value });
                setIsPolished(false);
              }}
              placeholder="Contoh ketik kasaran: 'tadi benerin wifi guru yg mati terus cek router mikrotik lab' -> lalu klik tombol [ AI Poles Jadi Bahasa Formal ASN ] di atas!"
              required
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Ketik santai apa adanya, AI akan menyusunnya menjadi kalimat kedinasan yang baku dan akuntabel.</span>
              {isPolished && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--accent-emerald)", fontWeight: "700" }}>
                  <CheckCircle2 size={13} /> Sudah Dipoles Formal ASN
                </span>
              )}
            </div>
          </div>

          {/* Catatan / Keterangan Tambahan */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: "600" }}>
              <FileText size={13} /> Catatan / Keterangan Tambahan (Opsional):
            </label>
            <input 
              type="text" 
              className="input-field"
              value={formData.catatan || ""}
              onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
              placeholder="Contoh: Disertai foto dokumentasi fisik lapangan, atau catatan kualitatif hasil kegiatan..."
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px", display: "block" }}>
              Catatan ini akan dicantumkan di bawah uraian kegiatan pada laporan bulanan & PDF (otomatis terisi saat dipoles AI).
            </span>
          </div>

          {/* Grid Dua Kolom: Unggah Berkas & Tautan Online */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            {/* Kolom 1: Upload File Bukti (Foto atau Dokumen PDF/Word/Excel) */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Paperclip size={14} /> Berkas Bukti Fisik (Foto / PDF / Word / Excel)
              </label>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                style={{ display: "none" }}
              />

              {(!formData.attachments || formData.attachments.length === 0) ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--bg-secondary)",
                    transition: "background var(--transition-fast)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                    <Camera size={22} />
                    <FileText size={22} />
                    <FileSpreadsheet size={22} />
                  </div>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                    {isUploading ? "Memproses Berkas..." : "Klik untuk Unggah Berkas (Bisa Pilih Banyak)"}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Foto (.jpg, .png) otomatis dikompresi ringan & tajam ala WhatsApp atau Berkas (.pdf, .docx, .xlsx, dll.)
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {formData.attachments.map((att, attIdx) => (
                    <div key={att.id || attIdx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      background: "var(--bg-secondary)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)"
                    }}>
                      {att.fotoUrl && att.type === "image" ? (
                        <img 
                          src={att.fotoUrl} 
                          alt="Bukti Kerja" 
                          style={{ width: "45px", height: "38px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-strong)" }}
                        />
                      ) : (
                        <div style={{ 
                          width: "40px", 
                          height: "38px", 
                          borderRadius: "6px", 
                          background: "var(--bg-tertiary)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}>
                          {renderFileIcon(att.type, att.docCategory)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: "700", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>
                          {att.fileName}
                        </p>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {att.fileSize}
                          {att.type === "image" && att.originalSize && att.originalSize !== att.fileSize && (
                            <span style={{ color: "#10b981", fontWeight: "600", marginLeft: "4px" }}>
                              (Hemat dari {att.originalSize})
                            </span>
                          )}
                          {" • "}
                          {att.type === "image" ? "Foto Terkompresi Cerdas" : "Dokumen Berkas"}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRemoveAttachment(att.id)}
                        style={{ color: "var(--accent-rose)", padding: "0.2rem 0.4rem" }}
                        title="Hapus berkas ini"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ alignSelf: "flex-start", marginTop: "0.25rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Paperclip size={12} /> Tambah Berkas Lainnya
                  </button>
                </div>
              )}
            </div>

            {/* Kolom 2: Tautan / URL Online (Google Drive / Cloud Folder) */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Link2 size={14} /> Tautan / Link Online (Google Drive / Cloud / Web)
              </label>
              <input 
                type="url" 
                className="input-field"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Sangat disarankan menaruh tautan folder bukti di Google Drive instansi agar pimpinan mudah memeriksa bukti dukung.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
            <div>
              {editingId ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                  onClick={handleStartNewJournal}
                >
                  <PlusCircle size={14} />
                  <span>Batal Edit & Buat Jurnal Baru</span>
                </button>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(false);
                }}
              >
                {editingId ? "Batal & Tutup" : "Batal"}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                style={{
                  background: "linear-gradient(135deg, #264b38, #3a6b52)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 2px 8px rgba(38, 75, 56, 0.25)"
                }}
              >
                {editingId ? <CheckCircle2 size={14} /> : <PlusCircle size={14} />}
                <span>{editingId ? "Simpan Perubahan" : "Simpan Sebagai Jurnal"}</span>
              </button>
            </div>
          </div>
        </form>
      </Sheet>

      {/* Daftar Jurnal & Galeri Berkas / Foto */}
      {displayedJournals.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "2.5rem 1rem", 
          background: "var(--bg-tertiary)", 
          borderRadius: "var(--radius-lg)",
          color: "var(--text-muted)"
        }}>
          <Paperclip size={36} style={{ margin: "0 auto 0.75rem auto", opacity: 0.5 }} />
          <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.3rem" }}>
            Belum Ada Catatan Aktivitas atau Bukti Foto
          </h4>
          <p style={{ fontSize: "0.82rem", maxWidth: "450px", margin: "0 auto 1rem auto" }}>
            Tulis catatan kerja harian Anda pada formulir di atas secara ringkas, lalu klik <strong>"Poles Bahasa Formal ASN"</strong> untuk menyusunnya ke narasi resmi!
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
            <button className="btn btn-primary btn-sm" onClick={handleStartNewJournal}>
              <PlusCircle size={14} /> Tambah Jurnal Pertama
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* Header Riwayat Logbook */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.6rem 0.25rem",
            marginBottom: "0.25rem",
            borderBottom: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                Daftar Riwayat Jurnal Kerja
              </h3>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}>
                {displayedJournals.length} Kegiatan
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleStartNewJournal}
              title="Tambah catatan kegiatan baru"
            >
              <PlusCircle size={14} />
              <span>Tulis Jurnal Baru</span>
            </button>
          </div>

          <div className="table-scroll-hint">
            <span>👈 Geser baris aktivitas ke samping untuk melihat rincian &amp; tombol aksi 👉</span>
          </div>

          <div className="journal-list-scroll-wrapper">
          {displayedJournals
            .filter((j) => {
              if (!searchQuery || !searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              return (
                (j.aktivitas && j.aktivitas.toLowerCase().includes(q)) ||
                (j.aktivitasKasaran && j.aktivitasKasaran.toLowerCase().includes(q)) ||
                (j.tanggal && j.tanggal.toLowerCase().includes(q)) ||
                (j.outputJumlah && j.outputJumlah.toLowerCase().includes(q)) ||
                (j.catatan && j.catatan.toLowerCase().includes(q))
              );
            })
            .map((j, index) => {
            const attList = Array.isArray(j.attachments) && j.attachments.length > 0
              ? j.attachments
              : (j.fotoUrl || j.fileName || j.fileUrl ? [{ 
                  type: j.evidenceType || ((j.fotoUrl || (j.fileName && /\.(jpe?g|png|gif|webp)$/i.test(j.fileName)) || (j.fileUrl && /\.(jpe?g|png|gif|webp)$/i.test(j.fileUrl))) ? "image" : "document"), 
                  fotoUrl: j.fotoUrl || (j.evidenceType === "image" ? j.fileUrl : ""), 
                  fileUrl: j.fileUrl || j.fotoUrl, 
                  fileName: j.fileName, 
                  fileSize: j.fileSize, 
                  docCategory: j.docCategory 
                }] : []);
            const photoAtt = attList.find(a => 
              a.type === "image" || 
              a.fotoUrl || 
              (a.fileUrl && /\.(jpe?g|png|gif|webp)$/i.test(a.fileUrl)) ||
              (a.fileName && /\.(jpe?g|png|gif|webp)$/i.test(a.fileName))
            ) || (j.fotoUrl ? { fotoUrl: j.fotoUrl, fileUrl: j.fotoUrl } : null);
            const isPhoto = Boolean(
              photoAtt || 
              j.fotoUrl || 
              j.evidenceType === "image" || 
              (j.fileUrl && /\.(jpe?g|png|gif|webp)$/i.test(j.fileUrl)) ||
              (j.fileName && /\.(jpe?g|png|gif|webp)$/i.test(j.fileName))
            );
            const photoUrl = photoAtt?.fotoUrl || photoAtt?.fileUrl || j.fotoUrl || 
              ((j.evidenceType === "image" || (j.fileUrl && /\.(jpe?g|png|gif|webp)$/i.test(j.fileUrl))) ? j.fileUrl : "");
            const docAtt = attList.find(a => a.type !== "image" && (a.fileUrl || a.fileName));
            const hasDocument = Boolean(docAtt || (j.fileName && !isPhoto));
            const hasLink = Boolean(j.linkUrl && typeof j.linkUrl === "string" && !j.linkUrl.includes("/uploads/") && (j.linkUrl.startsWith("http://") || j.linkUrl.startsWith("https://")));
            const totalAtts = attList.length;

            return (
              <div 
                key={j.id || index}
                className="journal-entry-card"
                style={{
                  background: editingId === j.id ? "var(--accent-emerald-subtle)" : "var(--bg-secondary)",
                  border: editingId === j.id ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "background var(--transition-fast), border-color var(--transition-fast)"
                }}
              >
                {/* Nomor Urut */}
                <div style={{ 
                  fontSize: "0.82rem", 
                  fontWeight: "700", 
                  color: "var(--text-muted)", 
                  width: "24px", 
                  textAlign: "center",
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                {/* Thumbnail Foto / Ikon Berkas */}
                <div style={{ flexShrink: 0 }}>
                  {isPhoto && photoUrl ? (
                    <div 
                      onClick={() => setActivePhotoModal({ ...j, fotoUrl: photoUrl })}
                      title="Klik untuk memperbesar foto"
                      style={{ 
                        width: "60px", 
                        height: "46px", 
                        borderRadius: "6px", 
                        overflow: "hidden", 
                        cursor: "pointer",
                        border: "1px solid var(--border-strong, #cbd5e1)",
                        position: "relative",
                        background: "#0f172a",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <img 
                        src={photoUrl} 
                        alt={j.aktivitas} 
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "none";
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.style.background = "#f1f5f9";
                            e.currentTarget.parentElement.innerHTML = '<span style="font-size:1.1rem" title="Foto lampiran">📷</span>';
                          }
                        }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        borderRadius: "3px",
                        padding: "1px 3px",
                        display: "flex",
                        alignItems: "center",
                        pointerEvents: "none"
                      }}>
                        <ZoomIn size={10} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      width: "46px", 
                      height: "46px", 
                      borderRadius: "6px", 
                      background: "var(--bg-tertiary)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      border: "1px solid var(--border-subtle)"
                    }}>
                      {renderFileIcon(attList[0]?.type || j.evidenceType, attList[0]?.docCategory || j.docCategory)}
                    </div>
                  )}
                </div>

                {/* Kolom Tanggal & Waktu */}
                <div style={{ width: "125px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    <Calendar size={13} className="text-blue-500" />
                    <span>{j.tanggal}</span>
                  </div>
                  {j.jam && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      <Clock size={11} />
                      <span>{j.jam}</span>
                    </div>
                  )}
                  {editingId === j.id && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{
                        background: "var(--accent-primary)",
                        color: "#ffffff",
                        fontSize: "0.65rem",
                        fontWeight: "800",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        letterSpacing: "0.5px"
                      }}>
                        SEDANG DIEDIT
                      </span>
                    </div>
                  )}
                </div>

                {/* Uraian Aktivitas & Hasil Kegiatan */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    fontSize: "0.88rem", 
                    fontWeight: "600", 
                    color: "var(--text-primary)", 
                    lineHeight: "1.45",
                    margin: 0
                  }}>
                    {j.aktivitas}
                  </p>
                  {j.catatan && (
                    <p style={{
                      fontSize: "0.78rem",
                      fontStyle: "italic",
                      color: "var(--text-secondary)",
                      margin: "3px 0 0 0",
                      lineHeight: "1.35"
                    }}>
                      Catatan: {j.catatan}
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "4px" }}>
                    {j.outputJumlah && (
                      <span className="badge badge-aspek" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>
                        Hasil: {j.outputJumlah}
                      </span>
                    )}

                    {totalAtts > 1 ? (
                      <span className="badge" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", background: "var(--bg-tertiary)", color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Paperclip size={11} /> {totalAtts} Berkas Lampiran
                      </span>
                    ) : (
                      <>
                        {isPhoto && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Camera size={11} /> Foto Terlampir
                          </span>
                        )}
                        {hasDocument && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <FileText size={11} /> {attList[0]?.fileName || j.fileName || "Dokumen"}
                          </span>
                        )}
                      </>
                    )}

                    {/* Tombol Lihat Foto Langsung */}
                    {isPhoto && photoUrl && (
                      <button
                        type="button"
                        onClick={() => setActivePhotoModal({
                          ...j,
                          fotoUrl: photoUrl
                        })}
                        style={{
                          fontSize: "0.72rem",
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          borderRadius: "4px",
                          padding: "1px 7px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontWeight: "600"
                        }}
                        title="Lihat foto bukti kegiatan"
                      >
                        <ZoomIn size={11} /> Lihat Foto
                      </button>
                    )}

                    {/* Tombol Buka Dokumen */}
                    {hasDocument && (docAtt?.fileUrl || j.fileUrl) && (
                      <a
                        href={docAtt?.fileUrl || j.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.72rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          padding: "1px 7px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontWeight: "600",
                          textDecoration: "none"
                        }}
                        title="Buka atau unduh dokumen lampiran"
                      >
                        <FileText size={11} /> Buka Dokumen
                      </a>
                    )}

                    {/* Tombol Tautan Online */}
                    {hasLink && (
                      <a 
                        href={j.linkUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          fontSize: "0.72rem", 
                          color: "var(--accent-primary)", 
                          background: "var(--accent-emerald-subtle)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "1px 7px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          textDecoration: "none"
                        }}
                        title="Buka tautan link"
                      >
                        <Link2 size={11} /> Link <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                  {isPhoto && photoUrl && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => setActivePhotoModal({ ...j, fotoUrl: photoUrl })}
                      title="Perbesar Foto"
                      style={{ width: "30px", height: "30px", padding: 0 }}
                    >
                      <ZoomIn size={14} />
                    </button>
                  )}

                  <button 
                    type="button"
                    className="btn btn-outline btn-icon btn-sm"
                    onClick={() => {
                      if (editingId === j.id) {
                        handleStartNewJournal();
                      } else {
                        handleEditJournal(j);
                      }
                    }}
                    style={{ 
                      color: editingId === j.id ? "#ffffff" : "var(--accent-primary)", 
                      borderColor: editingId === j.id ? "var(--accent-primary)" : "var(--border-subtle)",
                      background: editingId === j.id ? "var(--accent-primary)" : "transparent",
                      width: "30px", 
                      height: "30px", 
                      padding: 0 
                    }}
                    title={editingId === j.id ? "Sedang diedit (Klik untuk batal & buat baru)" : "Edit catatan aktivitas ini"}
                  >
                    <Edit3 size={14} />
                  </button>

                  <button 
                    type="button"
                    className="btn btn-outline btn-icon btn-sm"
                    onClick={() => handleDeleteJournal(j.id)}
                    style={{ color: "var(--accent-rose)", width: "30px", height: "30px", padding: 0 }}
                    title="Hapus aktivitas ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Modal Zoom Foto */}
      {activePhotoModal && (
        <div className="modal-overlay" onClick={() => setActivePhotoModal(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: "700px", padding: "1.25rem", background: "var(--bg-secondary)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700" }}>{activePhotoModal.aktivitas}</h4>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setActivePhotoModal(null)}>
                <X size={16} />
              </button>
            </div>
            <img 
              src={activePhotoModal.fotoUrl} 
              alt={activePhotoModal.aktivitas} 
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius-md)" }}
            />
            <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Tanggal: {activePhotoModal.tanggal}</span>
              <span>Output: {activePhotoModal.outputJumlah}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
