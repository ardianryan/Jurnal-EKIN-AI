import React, { useState } from "react";
import { 
  PlusCircle, 
  FileText, 
  ArrowRight, 
  Send, 
  CheckCircle2, 
  Calendar, 
  Paperclip, 
  Link2,
  Clock,
  Camera,
  FolderCheck,
  Award,
  Users,
  Sliders,
  ExternalLink,
  X
} from "lucide-react";

/**
 * HomeSection - Anti-Slop Editorial Design for SMA Negeri 1 Gedeg
 * Strictly conforms to Leonxlnx/taste-skill:
 * - Zero gradient blobs or tacky floating circles
 * - Honest left-aligned editorial hierarchy
 * - Single-line CTAs with clear contrast
 * - Unified Sage Green palette (#34634b)
 * - Restrained typography and micro-interactions
 */
export default function HomeSection({ 
  pegawai, 
  journals = [], 
  onNavigate,
  currentUser,
  botConfig = { enabled: false, username: "" },
  schoolName = "SMA Negeri 1 Gedeg"
}) {
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Filter ketat HANYA untuk pengguna yang sedang aktif login
  const currentUserId = currentUser?.id || (currentUser?.username ? `usr-${currentUser.username}` : "");
  const currentUsername = (currentUser?.username || "").toLowerCase();

  const userJournals = journals.filter(j => {
    if (!currentUser) return false;
    if (j.userId && (j.userId === currentUserId || j.userId === currentUser.id)) return true;
    if (j.username && j.username.toLowerCase() === currentUsername) return true;
    if (!j.userId && !j.username && (currentUsername === "farras" || currentUserId === "usr-farras")) return true;
    return false;
  });

  const totalJournals = userJournals.length;
  const totalPhotos = userJournals.filter(j => j.fotoUrl || (Array.isArray(j.attachments) && j.attachments.some(a => a.type === "image"))).length;
  const totalLinks = userJournals.filter(j => j.linkUrl || j.driveLink).length;

  const sortedJournals = [...userJournals].sort((a, b) => {
    const diffDate = String(b.tanggal || "").localeCompare(String(a.tanggal || ""));
    if (diffDate !== 0) return diffDate;
    return String(b.createdAt || b.id || "").localeCompare(String(a.createdAt || a.id || ""));
  });

  // Ambil 5 jurnal terbaru, lalu susun dari terlama ke terbaru
  const recentJournals = sortedJournals.slice(0, 5).sort((a, b) => {
    const diffDate = String(a.tanggal || "").localeCompare(String(b.tanggal || ""));
    if (diffDate !== 0) return diffDate;
    return String(a.createdAt || a.id || "").localeCompare(String(b.createdAt || b.id || ""));
  });

  const userDisplayName = pegawai?.nama || currentUser?.nama || currentUser?.username || "Pegawai";
  const userNip = pegawai?.nip || currentUser?.nip || "ASN / Pegawai";
  const userJabatan = pegawai?.jabatan || currentUser?.jabatan || "Tenaga Pendidik / Kependidikan";

  return (
    <div className="home-dashboard-container">
      {/* 1. Header Editorial (Zero AI Slop: No gradient blobs, no floating circles) */}
      <header className="home-editorial-header">
        <div className="home-editorial-pretitle">
          <span className="home-institution-pill">{schoolName}</span>
          <span className="home-period-tag">Tahun Anggaran 2026</span>
        </div>

        <h1 className="home-editorial-title">
          Selamat Datang, {userDisplayName.split(",")[0]}.
        </h1>

        <p className="home-editorial-subtext">
          Portal pencatatan kinerja harian dan penyusunan laporan kedinasan resmi ASN {schoolName}. Catat aktivitas kerja ringkas, rapikan dengan redaksi baku, dan hasilkan laporan bulanan siap cetak.
        </p>

        {/* Primary and Secondary CTAs (Single line, strict contrast, no wrapping) */}
        <div className="home-editorial-actions">
          <button
            type="button"
            className="btn btn-primary btn-cta-main"
            onClick={() => onNavigate("jurnal")}
          >
            <PlusCircle size={16} />
            <span>Tulis Jurnal Baru</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-cta-sub"
            onClick={() => onNavigate("laporan")}
          >
            <FileText size={16} />
            <span>Laporan Bulanan (PDF)</span>
          </button>

          {currentUser?.role === "superadmin" && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-cta-admin"
                onClick={() => onNavigate("pegawai")}
                title="Kelola data pegawai, akun guru, dan kode registrasi"
              >
                <Users size={15} />
                <span>Data Pegawai</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-cta-admin"
                onClick={() => onNavigate("pengaturan")}
                title="Atur identitas instansi sekolah dan kebijakan AI"
              >
                <Sliders size={15} />
                <span>Pengaturan Instansi</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Unified Metric Strip (Crisp Architectural Grid ala taste-skill) */}
      <section className="home-metrics-bar" aria-label="Statistik Kinerja Ringkas">
        <div className="home-metric-item">
          <div className="home-metric-label">Total Aktivitas</div>
          <div className="home-metric-value">{totalJournals}</div>
          <div className="home-metric-meta">Jurnal kerja tercatat</div>
        </div>

        <div className="home-metric-item">
          <div className="home-metric-label">Berkas &amp; Foto Eviden</div>
          <div className="home-metric-value">{totalPhotos}</div>
          <div className="home-metric-meta">Dokumentasi kegiatan</div>
        </div>

        <div className="home-metric-item">
          <div className="home-metric-label">Tautan Google Drive</div>
          <div className="home-metric-value">{totalLinks}</div>
          <div className="home-metric-meta">Folder bukti dukung</div>
        </div>

        <div className="home-metric-item">
          <div className="home-metric-label">Jabatan ASN</div>
          <div className="home-metric-text-val" title={userJabatan}>
            {userJabatan}
          </div>
          <div className="home-metric-meta">NIP: {userNip}</div>
        </div>
      </section>

      {/* 3. Dual Action Surface (Clean layout, no cards-inside-cards) */}
      <section className="home-portal-split" aria-label="Akses Cepat Modul">
        <article 
          className="home-portal-card"
          onClick={() => onNavigate("jurnal")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate("jurnal"); }}
        >
          <div className="home-portal-top">
            <div className="home-portal-icon-wrap">
              <PlusCircle size={20} />
            </div>
            <span className="home-portal-chip">Pencatatan Harian</span>
          </div>

          <h2 className="home-portal-title">Jurnal &amp; Bukti Foto Harian</h2>
          <p className="home-portal-description">
            Tulis catatan tugas harian dengan bahasa ringkas apa adanya. Gunakan tombol poles redaksi untuk merapikannya ke bahasa baku dinas secara otomatis.
          </p>

          <div className="home-portal-footer">
            <span className="home-portal-action-link">
              Buka Lembar Jurnal <ArrowRight size={14} />
            </span>
          </div>
        </article>

        <article 
          className="home-portal-card"
          onClick={() => onNavigate("laporan")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate("laporan"); }}
        >
          <div className="home-portal-top">
            <div className="home-portal-icon-wrap">
              <FileText size={20} />
            </div>
            <span className="home-portal-chip">Format Standar A4</span>
          </div>

          <h2 className="home-portal-title">Generator Laporan Bulanan (PDF)</h2>
          <p className="home-portal-description">
            Kompilasi seluruh catatan bulan berjalan ke dalam format tabel resmi instansi: Data Pegawai, Aktivitas Tugas, Output, Foto Bukti, dan tautan Google Drive.
          </p>

          <div className="home-portal-footer">
            <span className="home-portal-action-link">
              Lihat &amp; Unduh Laporan <ArrowRight size={14} />
            </span>
          </div>
        </article>
      </section>

      {/* 4. Telegram Integration (Honest, clean info strip when enabled) */}
      {botConfig?.enabled && (
        <section className="home-telegram-strip">
          <div className="home-telegram-info">
            <div className="home-telegram-icon">
              <Send size={18} />
            </div>
            <div>
              <div className="home-telegram-heading">
                <strong>Asisten Telegram Terhubung</strong>
                {botConfig.username && <span className="home-telegram-handle">@{botConfig.username}</span>}
              </div>
              <p className="home-telegram-text">
                Kirim catatan kerja kasaran atau foto kegiatan langsung lewat obrolan Telegram untuk otomatis disinkronkan ke akun Anda.
              </p>
            </div>
          </div>

          <a
            href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <span>Buka Chat Telegram</span>
            <ArrowRight size={13} />
          </a>
        </section>
      )}

      {/* 5. Minimalist 3-Step Workflow Guide (taste-skill Section 9.F: No multi-colored numbered badges) */}
      <section className="home-workflow-guide" aria-label="Petunjuk Alur Kerja">
        <h2 className="home-workflow-title">Alur Kerja Cepat</h2>
        
        <div className="home-workflow-steps">
          <div className="home-workflow-step">
            <div className="home-step-number">01</div>
            <div className="home-step-content">
              <h3 className="home-step-heading">Ketik Kasaran</h3>
              <p className="home-step-desc">
                Tuliskan inti pekerjaan Anda di menu Jurnal dengan kalimat ringkas sehari-hari.
              </p>
            </div>
          </div>

          <div className="home-workflow-step">
            <div className="home-step-number">02</div>
            <div className="home-step-content">
              <h3 className="home-step-heading">Poles Redaksi Formal</h3>
              <p className="home-step-desc">
                Pilih opsi poles untuk menyusun catatan menjadi kalimat baku kedinasan ASN yang rapi.
              </p>
            </div>
          </div>

          <div className="home-workflow-step">
            <div className="home-step-number">03</div>
            <div className="home-step-content">
              <h3 className="home-step-heading">Cetak Laporan PDF</h3>
              <p className="home-step-desc">
                Buka menu Laporan Bulanan, pilih periode, dan unduh berkas cetak resmi A4 atau paket ZIP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Recent Journal Activities (Clean list, honest typography) */}
      <section className="home-recent-section" aria-label="Aktivitas Terkini">
        <div className="home-recent-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div>
              <h2 className="home-recent-title">Aktivitas Terkini</h2>
              <span className="home-recent-subtitle">5 Catatan Terakhir Pegawai</span>
            </div>
            {recentJournals.length > 0 && (
              <span style={{
                fontSize: "0.72rem",
                background: "rgba(52, 99, 75, 0.1)",
                color: "var(--accent-primary, #244937)",
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
                fontWeight: "700"
              }}>
                Terlama → Terbaru
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate("jurnal")}
          >
            <span>Lihat Semua Jurnal ({totalJournals})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentJournals.length > 0 ? (
          <div className="home-recent-list">
            {recentJournals.map((j, index) => {
              const atts = Array.isArray(j.attachments) ? j.attachments : [];
              const photoItem = atts.find(a => a.type === "image" || /\.(jpe?g|png|gif|webp)$/i.test(a.fileName || "")) || (j.fotoUrl ? { fotoUrl: j.fotoUrl } : null);
              const docItem = atts.find(a => a.type !== "image" && !/\.(jpe?g|png|gif|webp)$/i.test(a.fileName || "") && (a.fileUrl || a.fileName)) || ((j.fileUrl || j.fileName) && !photoItem ? { fileUrl: j.fileUrl, fileName: j.fileName } : null);
              const isRealDrive = Boolean(j.linkUrl && typeof j.linkUrl === "string" && !j.linkUrl.includes("/uploads/") && (j.linkUrl.startsWith("http://") || j.linkUrl.startsWith("https://")));

              return (
                <div key={j.id || index} className="home-recent-row">
                  <div className="home-recent-left">
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "var(--bg-tertiary, #f1f5f9)",
                      color: "var(--text-muted, #64748b)",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </span>
                    <span className="home-recent-date-badge">{j.tanggal}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="home-recent-activity">{j.aktivitas}</div>
                      <div className="home-recent-meta">
                        <span>Hasil: {j.outputJumlah || "1 Kegiatan"}</span>
                        {j.jam && <span>&bull; Waktu: {j.jam}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="home-recent-badges" style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    {photoItem && (
                      <button
                        type="button"
                        onClick={() => setActivePhotoModal({
                          aktivitas: j.aktivitas,
                          tanggal: j.tanggal,
                          outputJumlah: j.outputJumlah,
                          fotoUrl: photoItem.fotoUrl || photoItem.fileUrl
                        })}
                        style={{
                          fontSize: "0.72rem",
                          color: "#059669",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "6px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer"
                        }}
                        title="Klik untuk memperbesar foto bukti"
                      >
                        <Camera size={11} />
                        <span>Lihat Foto</span>
                      </button>
                    )}

                    {docItem && (
                      <a
                        href={docItem.fileUrl || (j.linkUrl?.includes("/uploads/") ? j.linkUrl : "#")}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.72rem",
                          color: "#334155",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "6px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "none",
                          cursor: "pointer"
                        }}
                        title="Klik untuk membuka dokumen berkas"
                      >
                        <FileText size={11} />
                        <span>{docItem.fileName || "Dokumen"}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}

                    {isRealDrive && (
                      <a
                        href={j.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.72rem",
                          color: "#2563eb",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "6px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "none",
                          cursor: "pointer"
                        }}
                        title="Buka tautan link"
                      >
                        <Link2 size={11} />
                        <span>Link</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "2rem 1rem",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            background: "var(--bg-tertiary, #f8fafc)",
            borderRadius: "8px",
            border: "1px dashed var(--border-subtle, #cbd5e1)",
            marginTop: "0.5rem"
          }}>
            <p style={{ margin: "0 0 0.4rem 0", fontWeight: "600" }}>
              Belum ada jurnal tercatat untuk akun <b>{userDisplayName}</b>.
            </p>
            <p style={{ margin: 0, fontSize: "0.78rem" }}>
              Silakan tambahkan jurnal harian Anda melalui menu Jurnal atau bot Telegram.
            </p>
          </div>
        )}
      </section>

      {/* Modal Zoom Foto di Beranda */}
      {activePhotoModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setActivePhotoModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem"
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "680px", 
              width: "100%",
              padding: "1.25rem", 
              background: "var(--bg-secondary, #ffffff)",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                📷 Bukti Foto Kegiatan
              </h4>
              <button 
                type="button"
                className="btn btn-secondary btn-icon btn-sm" 
                onClick={() => setActivePhotoModal(null)}
                style={{ cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ textAlign: "center", background: "#0f172a", borderRadius: "8px", overflow: "hidden", padding: "0.5rem" }}>
              <img 
                src={activePhotoModal.fotoUrl} 
                alt={activePhotoModal.aktivitas} 
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "4px" }}
              />
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: "600" }}>
              {activePhotoModal.aktivitas}
            </div>
            <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>📅 Tanggal: {activePhotoModal.tanggal}</span>
              <span>📊 Output: {activePhotoModal.outputJumlah}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
