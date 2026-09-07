import React from "react";
import { 
  Home, 
  BookOpen, 
  FileText, 
  Key, 
  Database, 
  ShieldCheck, 
  LogIn, 
  User, 
  LogOut, 
  Moon, 
  Sun,
  Send,
  X,
  Sparkles,
  Users,
  Sliders
} from "lucide-react";

/**
 * Google Account Style Sidebar Navigation
 * - Aesthetic sage green palette & round pill navigation buttons
 * - Fixed/sticky layout on desktop, sliding drawer on mobile
 * - Accessible with proper ARIA attributes, semantic buttons, and focus states
 */
export default function Sidebar({
  activeTab,
  onNavigate,
  journalsCount = 0,
  currentUser,
  onOpenGeminiModal,
  onOpenLoginModal,
  onLogout,
  onExportJson,
  theme,
  setTheme,
  isOpenMobile,
  onCloseMobile,
  botConfig = { enabled: false, username: "" },
  apiKeyInfo,
  schoolName = "SMA Negeri 1 Gedeg",
  schoolLogo = null
}) {
  const isSuperadmin = currentUser?.role === "superadmin";

  const userInitial = (currentUser?.nama || currentUser?.username || "P").trim().charAt(0).toUpperCase();

  const handleNavClick = (tabId) => {
    onNavigate(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="sidebar-mobile-backdrop no-print" 
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`app-sidebar no-print ${isOpenMobile ? "mobile-open" : ""}`}
        aria-label="Navigasi Utama Aplikasi"
      >
        {/* Sidebar Header: Branding Google Account Style */}
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => handleNavClick("home")} role="button" tabIndex={0}>
            <div 
              className="sidebar-brand-icon" 
              style={{ 
                overflow: "hidden",
                background: schoolLogo ? "var(--bg-secondary)" : undefined,
                border: schoolLogo ? "1px solid var(--border-subtle)" : undefined
              }}
            >
              {schoolLogo ? (
                <img 
                  src={schoolLogo} 
                  alt="Logo Instansi" 
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px" }} 
                />
              ) : (
                <BookOpen size={20} />
              )}
            </div>
            <div className="sidebar-brand-info">
              <span className="sidebar-brand-title">E-Kinerja</span>
              <span className="sidebar-brand-tag">{schoolName}</span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button 
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Tutup navigasi sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Nav Items (Pill Style ala Google Account) */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu Utama</div>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => handleNavClick("home")}
            aria-current={activeTab === "home" ? "page" : undefined}
          >
            <div className="sidebar-nav-icon">
              <Home size={18} />
            </div>
            <span className="sidebar-nav-label">Beranda</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "jurnal" ? "active" : ""}`}
            onClick={() => handleNavClick("jurnal")}
            aria-current={activeTab === "jurnal" ? "page" : undefined}
          >
            <div className="sidebar-nav-icon">
              <BookOpen size={18} />
            </div>
            <span className="sidebar-nav-label">Jurnal Harian</span>
            {journalsCount > 0 && (
              <span className="sidebar-nav-badge" aria-label={`${journalsCount} kegiatan dicatat`}>
                {journalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "laporan" ? "active" : ""}`}
            onClick={() => handleNavClick("laporan")}
            aria-current={activeTab === "laporan" ? "page" : undefined}
          >
            <div className="sidebar-nav-icon">
              <FileText size={18} />
            </div>
            <span className="sidebar-nav-label">Laporan Bulanan</span>
          </button>

          <div className="sidebar-divider" />
          <div className="sidebar-section-title">Alat &amp; Sistem</div>

          {/* AI Settings Trigger */}
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onOpenGeminiModal();
              if (onCloseMobile) onCloseMobile();
            }}
          >
            <div className="sidebar-nav-icon">
              <Key size={18} />
            </div>
            <span className="sidebar-nav-label">Pengaturan AI</span>
            <span className={`sidebar-pill-dot ${apiKeyInfo?.source === "offline" ? "offline" : "online"}`} />
          </button>

          {/* Backup / Export Trigger */}
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onExportJson();
              if (onCloseMobile) onCloseMobile();
            }}
          >
            <div className="sidebar-nav-icon">
              <Database size={18} />
            </div>
            <span className="sidebar-nav-label">Cadangan Data</span>
          </button>

          {/* Telegram Bot Link */}
          {botConfig?.enabled && (
            <a
              href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-nav-item"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
            >
              <div className="sidebar-nav-icon">
                <Send size={18} />
              </div>
              <span className="sidebar-nav-label">Bot Telegram</span>
            </a>
          )}

          {/* Superadmin Panel: Terpisah Data Pegawai & Pengaturan Instansi */}
          {isSuperadmin && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section-title">Administrasi</div>

              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "pegawai" ? "active" : ""}`}
                onClick={() => handleNavClick("pegawai")}
                aria-current={activeTab === "pegawai" ? "page" : undefined}
              >
                <div className="sidebar-nav-icon">
                  <Users size={18} />
                </div>
                <span className="sidebar-nav-label">Data Pegawai</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === "pengaturan" ? "active" : ""}`}
                onClick={() => handleNavClick("pengaturan")}
                aria-current={activeTab === "pengaturan" ? "page" : undefined}
              >
                <div className="sidebar-nav-icon">
                  <Sliders size={18} />
                </div>
                <span className="sidebar-nav-label">Pengaturan Instansi</span>
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer: User Card ala Google Account */}
        <div className="sidebar-footer">
          <div 
            className="sidebar-user-card"
            onClick={() => {
              onOpenLoginModal();
              if (onCloseMobile) onCloseMobile();
            }}
            role="button"
            tabIndex={0}
            title="Klik untuk ganti akun atau profil"
          >
            <div className={`sidebar-avatar ${isSuperadmin ? "admin" : ""}`}>
              {userInitial}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name" title={currentUser?.nama || "Pegawai"}>
                {currentUser?.nama || "Pegawai"}
              </div>
              <div className="sidebar-user-role">
                {isSuperadmin ? "Super Administrator" : (`${currentUser?.jabatan || "Pegawai"} • ${schoolName}`)}
              </div>
            </div>
          </div>

          <div className="sidebar-footer-actions">
            {/* Theme Toggle */}
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
              title={`Ubah ke mode ${theme === "dark" ? "terang" : "gelap"}`}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Logout */}
            <button
              type="button"
              className="sidebar-action-btn logout-btn"
              onClick={onLogout}
              aria-label="Keluar dari akun"
              title="Keluar dari akun"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
