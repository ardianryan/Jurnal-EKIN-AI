import React from "react";
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
  Sliders
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
  const totalJournals = journals.length;
  const totalPhotos = journals.filter(j => j.fotoUrl || (Array.isArray(j.attachments) && j.attachments.some(a => a.type === "image"))).length;
  const totalLinks = journals.filter(j => j.linkUrl || j.driveLink).length;
  const recentJournals = [...journals].slice(-4).reverse();

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
      {recentJournals.length > 0 && (
        <section className="home-recent-section" aria-label="Aktivitas Terkini">
          <div className="home-recent-header">
            <div>
              <h2 className="home-recent-title">Aktivitas Terkini</h2>
              <span className="home-recent-subtitle">Catatan terbaru yang berhasil dihimpun</span>
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

          <div className="home-recent-list">
            {recentJournals.map((j, index) => {
              const hasPhoto = j.fotoUrl || (Array.isArray(j.attachments) && j.attachments.some(a => a.type === "image"));
              const hasLink = Boolean(j.linkUrl || j.driveLink);

              return (
                <div key={j.id || index} className="home-recent-row">
                  <div className="home-recent-left">
                    <span className="home-recent-date-badge">{j.tanggal}</span>
                    <div>
                      <div className="home-recent-activity">{j.aktivitas}</div>
                      <div className="home-recent-meta">
                        <span>Hasil: {j.outputJumlah || "1 Kegiatan"}</span>
                        {j.jam && <span>&bull; Waktu: {j.jam}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="home-recent-badges">
                    {hasPhoto && (
                      <span className="home-micro-tag">
                        <Camera size={12} /> Foto
                      </span>
                    )}
                    {hasLink && (
                      <span className="home-micro-tag">
                        <Link2 size={12} /> Drive
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
