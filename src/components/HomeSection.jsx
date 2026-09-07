import React, { useState } from "react";
import { 
  Sparkles, 
  Camera, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  UploadCloud, 
  Clock, 
  FolderCheck,
  UserCheck,
  PlusCircle,
  Send,
  Link2,
  ExternalLink,
  X
} from "lucide-react";

export default function HomeSection({ 
  pegawai, 
  journals = [], 
  onNavigate,
  currentUser,
  onOpenAccountManagerModal,
  botConfig = { enabled: false, username: "" }
}) {
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  // Filter ketat HANYA untuk pengguna yang sedang aktif login
  const currentUserId = currentUser?.id || (currentUser?.username ? `usr-${currentUser.username}` : "");
  const currentUsername = (currentUser?.username || "").toLowerCase();

  const userJournals = journals.filter(j => {
    if (!currentUser) return false;
    if (j.userId && (j.userId === currentUserId || j.userId === currentUser.id)) return true;
    if (j.username && j.username.toLowerCase() === currentUsername) return true;
    // Jurnal legacy tanpa userId/username hanya untuk akun default farras
    if (!j.userId && !j.username && (currentUsername === "farras" || currentUserId === "usr-farras")) return true;
    return false;
  });

  const totalJournals = userJournals.length;
  const totalPhotos = userJournals.filter(j => j.fotoUrl || j.fileName || (Array.isArray(j.attachments) && j.attachments.some(a => a.type === "image"))).length;
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

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Welcome Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "2.25rem 2rem",
        color: "#ffffff",
        boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.3)",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle decorative circles */}
        <div style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "200px",
          height: "200px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-60px",
          right: "120px",
          width: "160px",
          height: "160px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "720px" }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "0.4rem", 
            background: "rgba(255, 255, 255, 0.18)", 
            padding: "0.3rem 0.8rem", 
            borderRadius: "20px", 
            fontSize: "0.82rem", 
            fontWeight: "600",
            marginBottom: "0.75rem",
            backdropFilter: "blur(6px)"
          }}>
            <Sparkles size={14} style={{ color: "#fef08a" }} />
            <span>Asisten Pembuat Laporan Kinerja ASN &amp; Pegawai</span>
          </div>

          <h2 style={{ 
            fontSize: "1.75rem", 
            fontWeight: "800", 
            margin: "0 0 0.5rem 0", 
            lineHeight: "1.25",
            letterSpacing: "-0.02em"
          }}>
            Selamat Datang, {pegawai?.nama || "Pegawai"}!
          </h2>

          <p style={{ 
            fontSize: "0.95rem", 
            opacity: 0.92, 
            lineHeight: "1.6", 
            margin: "0 0 1.5rem 0" 
          }}>
            Tulis catatan kerja harian kasaran apa adanya, gunakan kecerdasan buatan (AI) untuk memolesnya ke bahasa formal kedinasan, dan langsung buat Laporan Bulanan siap cetak PDF A4 dengan tautan Google Drive.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={() => onNavigate("jurnal")}
              style={{
                background: "#ffffff",
                color: "#1d4ed8",
                border: "none",
                borderRadius: "8px",
                padding: "0.7rem 1.3rem",
                fontWeight: "700",
                fontSize: "0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                transition: "transform 0.15s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <PlusCircle size={16} />
              <span>Tulis Jurnal Kasaran</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={() => onNavigate("laporan")}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                borderRadius: "8px",
                padding: "0.7rem 1.3rem",
                fontWeight: "600",
                fontSize: "0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
                transition: "background 0.15s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
            >
              <FileText size={16} />
              <span>Buka Laporan Bulanan</span>
            </button>

            {botConfig?.enabled && (
              <a
                href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.7rem 1.3rem",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(0, 136, 204, 0.35)",
                  transition: "transform 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                title={`Chat Asisten Bot Telegram (@${botConfig.username || "Bot"})`}
              >
                <Send size={16} style={{ transform: "rotate(45deg)", marginLeft: "-2px" }} />
                <span>Chat di Telegram</span>
              </a>
            )}

            {currentUser?.role === "superadmin" && (
              <button
                onClick={onOpenAccountManagerModal}
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.7rem 1.3rem",
                  fontWeight: "700",
                  fontSize: "0.9rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
              >
                <span>👑 Kelola Akun &amp; Impor Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Statistik Ringkas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem"
      }}>
        <div style={{
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          borderRadius: "var(--radius-md, 10px)",
          padding: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary, #0f172a)" }}>
              {totalJournals}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
              Kegiatan Dicatat
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          borderRadius: "var(--radius-md, 10px)",
          padding: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: "#ecfdf5",
            color: "#059669",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Camera size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary, #0f172a)" }}>
              {totalPhotos}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
              Foto &amp; Berkas Eviden
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          borderRadius: "var(--radius-md, 10px)",
          padding: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: "#f5f3ff",
            color: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <UploadCloud size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary, #0f172a)" }}>
              {totalLinks}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
              Tautan Google Drive
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--bg-secondary, #ffffff)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          borderRadius: "var(--radius-md, 10px)",
          padding: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px",
            background: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" }}>
              {pegawai?.nama?.split(" ")[0] || "Pegawai"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
              {pegawai?.nip || "NIP Aktif"}
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Utama: 2 Pintu Akses Menu */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Kartu Jurnal */}
        <div 
          onClick={() => onNavigate("jurnal")}
          style={{
            background: "var(--bg-secondary, #ffffff)",
            border: "1px solid var(--border-subtle, #e2e8f0)",
            borderRadius: "var(--radius-md, 12px)",
            padding: "1.75rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.borderColor = "#3b82f6";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(59, 130, 246, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border-subtle, #e2e8f0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Camera size={22} />
              </div>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                background: "#dbeafe",
                color: "#1e40af",
                padding: "0.25rem 0.6rem",
                borderRadius: "12px"
              }}>
                Input &amp; AI
              </span>
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
              Jurnal &amp; Bukti Foto
            </h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 1.25rem 0" }}>
              Tulis catatan tugas harian dengan bahasa kasaran / santai. Klik tombol AI untuk memolesnya langsung ke bahasa baku kedinasan ASN dan menentukan hasil kerja/output.
            </p>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#2563eb",
            fontWeight: "700",
            fontSize: "0.88rem"
          }}>
            <span>Mulai Catat Kegiatan</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Kartu Laporan Bulanan */}
        <div 
          onClick={() => onNavigate("laporan")}
          style={{
            background: "var(--bg-secondary, #ffffff)",
            border: "1px solid var(--border-subtle, #e2e8f0)",
            borderRadius: "var(--radius-md, 12px)",
            padding: "1.75rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.borderColor = "#059669";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(5, 150, 105, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border-subtle, #e2e8f0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <FileText size={22} />
              </div>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                background: "#d1fae5",
                color: "#065f46",
                padding: "0.25rem 0.6rem",
                borderRadius: "12px"
              }}>
                Format Tabel Bersih
              </span>
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
              Laporan Bulanan (PDF &amp; Drive)
            </h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 1.25rem 0" }}>
              Lihat seluruh catatan bulanan yang telah dirangkum dalam tabel terstruktur: Data Pegawai, Aktivitas Tugas, Output, Foto Bukti, serta Tautan Google Drive. Siap Cetak PDF A4.
            </p>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#059669",
            fontWeight: "700",
            fontSize: "0.88rem"
          }}>
            <span>Lihat &amp; Cetak Laporan</span>
            <ArrowRight size={15} />
          </div>
        </div>
      </div>

      {/* Banner Khusus Bot Telegram (Hanya Tampil Jika Bot Sudah Dikonfigurasi di .env) */}
      {botConfig?.enabled && (
        <div style={{
          background: "linear-gradient(135deg, rgba(0, 136, 204, 0.08) 0%, rgba(41, 182, 246, 0.12) 100%)",
          border: "1px solid rgba(0, 136, 204, 0.3)",
          borderRadius: "var(--radius-md, 12px)",
          padding: "1.4rem 1.6rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", maxWidth: "680px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0, 136, 204, 0.3)"
            }}>
              <Send size={22} style={{ transform: "rotate(45deg)", marginLeft: "-2px" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  Asisten Jurnal Telegram {botConfig.username ? `(@${botConfig.username})` : ""}
                </h4>
                <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "#dbeafe", color: "#0284c7", padding: "0.15rem 0.5rem", borderRadius: "10px" }}>
                  Aktif &bull; Auto-Sync
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Ketik jurnal santai, kirim bukti foto/dokumen, atau minta file PDF bulanan resmi langsung lewat chat Telegram tanpa perlu membuka website.
              </p>
            </div>
          </div>

          <a
            href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "0.88rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0, 136, 204, 0.25)",
              whiteSpace: "nowrap"
            }}
          >
            <span>Buka Chat Telegram</span>
            <ArrowRight size={15} />
          </a>
        </div>
      )}

      {/* Alur Kerja 3 Langkah Mudah */}
      <div style={{
        background: "var(--bg-secondary, #ffffff)",
        border: "1px solid var(--border-subtle, #e2e8f0)",
        borderRadius: "var(--radius-md, 12px)",
        padding: "1.5rem 1.75rem",
        marginBottom: "2rem"
      }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
          💡 Cara Cepat Menggunakan Aplikasi:
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "0.85rem",
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "3px" }}>
                Ketik Catatan Kasaran
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Tulis apa yang Anda kerjakan hari ini dengan bahasa santai apa adanya di menu <strong>Jurnal</strong>.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#8b5cf6",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "0.85rem",
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "3px" }}>
                Poles dengan AI
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Tekan tombol <strong>AI Poles</strong> untuk mengubahnya menjadi narasi formal kedinasan otomatis.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#059669",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "0.85rem",
              flexShrink: 0
            }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "3px" }}>
                Cetak Laporan Bulanan
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                Buka menu <strong>Laporan Bulanan</strong>, pilih bulan, dan klik <strong>Cetak / Simpan PDF (A4)</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catatan Terakhir yang Baru Diisi */}
      <div style={{
        background: "var(--bg-secondary, #ffffff)",
        border: "1px solid var(--border-subtle, #e2e8f0)",
        borderRadius: "var(--radius-md, 12px)",
        padding: "1.5rem 1.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
              🕒 Aktivitas Jurnal Terbaru
            </h3>
            {recentJournals.length > 0 && (
              <span style={{
                fontSize: "0.72rem",
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
                fontWeight: "700",
                letterSpacing: "0.02em"
              }}>
                5 Terakhir: Terlama → Terbaru
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate("jurnal")}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            <span>Lihat Semua ({totalJournals})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentJournals.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentJournals.map((j, i) => (
              <div 
                key={j.id || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "var(--bg-tertiary, #f8fafc)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle, #f1f5f9)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                      {j.aktivitas}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      📅 {j.tanggal} &bull; Output: {j.outputJumlah || "1 Kegiatan"}
                    </div>
                  </div>
                </div>

                {(() => {
                  const atts = Array.isArray(j.attachments) && j.attachments.length > 0
                    ? j.attachments
                    : (j.fotoUrl || j.fileName ? [{ type: j.evidenceType || (j.fotoUrl ? "image" : "document"), fotoUrl: j.fotoUrl, fileUrl: j.fileUrl || j.fotoUrl, fileName: j.fileName }] : []);
                  const photoItem = atts.find(a => (a.type === "image" || a.fotoUrl || (a.fileName && /\.(jpe?g|png|gif|webp)$/i.test(a.fileName))) && (a.fotoUrl || a.fileUrl)) || (j.fotoUrl ? { fotoUrl: j.fotoUrl, fileUrl: j.fotoUrl } : null) || (j.evidenceType === "image" && j.fileUrl ? { fotoUrl: j.fileUrl, fileUrl: j.fileUrl } : null);
                  const docItem = atts.find(a => a.type !== "image" && !/\.(jpe?g|png|gif|webp)$/i.test(a.fileName || "") && (a.fileUrl || a.fileName)) || ((j.fileUrl || j.fileName) && !photoItem ? { fileUrl: j.fileUrl, fileName: j.fileName } : null);
                  const isRealDrive = Boolean(j.linkUrl && typeof j.linkUrl === "string" && !j.linkUrl.includes("/uploads/") && (j.linkUrl.startsWith("http://") || j.linkUrl.startsWith("https://")));

                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
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
                            fontSize: "0.74rem",
                            color: "#059669",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            padding: "0.22rem 0.6rem",
                            borderRadius: "6px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          title="Klik untuk melihat foto dokumentasi"
                        >
                          <Camera size={12} />
                          <span>Lihat Foto</span>
                        </button>
                      )}

                      {docItem && (
                        <a
                          href={docItem.fileUrl || (j.linkUrl?.includes("/uploads/") ? j.linkUrl : "#")}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "0.74rem",
                            color: "#334155",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            padding: "0.22rem 0.6rem",
                            borderRadius: "6px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            textDecoration: "none",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          title="Klik untuk membuka dokumen berkas"
                        >
                          <FileText size={12} />
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
                            fontSize: "0.74rem",
                            color: "#2563eb",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            padding: "0.22rem 0.6rem",
                            borderRadius: "6px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            textDecoration: "none",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          title="Buka tautan link"
                        >
                          <Link2 size={12} />
                          <span>Link</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "2rem 1rem",
            color: "var(--text-muted)",
            fontSize: "0.88rem",
            background: "var(--bg-tertiary, #f8fafc)",
            borderRadius: "8px",
            border: "1px dashed var(--border-subtle, #cbd5e1)"
          }}>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "600" }}>
              Belum ada jurnal tercatat untuk akun <b>{currentUser?.name || currentUser?.username || "Anda"}</b>.
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem" }}>
              Silakan tambahkan jurnal harian Anda melalui menu Jurnal atau bot Telegram.
            </p>
          </div>
        )}
      </div>

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
              maxWidth: "700px", 
              width: "100%",
              padding: "1.25rem", 
              background: "var(--bg-secondary, #ffffff)",
              borderRadius: "var(--radius-lg, 12px)",
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
