import React, { useState, useRef, useEffect } from "react";
import { 
  Menu,
  Search,
  Key,
  Database,
  Moon,
  Sun,
  ShieldCheck,
  Send,
  Download,
  Upload,
  RefreshCw,
  ChevronDown
} from "lucide-react";

/**
 * Top App Bar ala Google Account
 * - Minimalist, highly accessible (WCAG 2.2 AA)
 * - Centered quick search bar
 * - Mobile hamburger toggle
 * - Profile avatar trigger
 */
export default function Header({
  theme,
  setTheme,
  onOpenGeminiModal,
  onExportJson,
  onImportJson,
  hasGeminiKey,
  isKeyFromEnv,
  currentUser,
  onOpenLoginModal,
  onLogout,
  apiKeyInfo,
  botConfig = { enabled: false, username: "" },
  isSyncing,
  onRefreshSync,
  onToggleSidebarMobile,
  searchQuery = "",
  setSearchQuery,
  schoolName = "SMAN Garuda",
  schoolLogo = null
}) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const userInitial = (currentUser?.nama || currentUser?.username || "P").trim().charAt(0).toUpperCase();

  const getAiStatusDetails = () => {
    if (apiKeyInfo?.source === "env") {
      return {
        label: "AI Terhubung (.env)",
        dotClass: "online",
        title: "AI Google Gemini Aktif dari Server (.env)"
      };
    }
    if (apiKeyInfo?.source === "personal") {
      return {
        label: "AI Key Pribadi",
        dotClass: "online",
        title: "AI Google Gemini Aktif menggunakan Key Akun Anda"
      };
    }
    return {
      label: "AI Mode Baku",
      dotClass: "offline",
      title: "Mode Cerdas Baku Offline (Poles formal tetap aktif)"
    };
  };

  const aiStatus = getAiStatusDetails();

  return (
    <header className="app-topbar no-print" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleSidebarMobile}
          aria-label="Buka menu navigasi samping"
          title="Buka Menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-branding-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {schoolLogo ? (
            <div style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              overflow: "hidden",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px",
              flexShrink: 0
            }}>
              <img src={schoolLogo} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
          ) : null}
          <div>
            <span className="topbar-logo-title">E-Kinerja</span>
            <span className="topbar-logo-badge">{schoolName}</span>
          </div>
        </div>
      </div>

      {/* Google-like Centered Search Bar */}
      <div className="topbar-search-container" role="search">
        <div className="topbar-search-inner">
          <Search size={17} className="topbar-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="topbar-search-input"
            placeholder="Telusuri kegiatan, tanggal, atau uraian kerja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            aria-label="Telusuri kegiatan kinerja"
          />
        </div>
      </div>

      {/* Topbar Right Tools */}
      <div className="topbar-right">
        {/* Status AI Badge */}
        <button
          type="button"
          className="topbar-ai-pill"
          onClick={onOpenGeminiModal}
          title={aiStatus.title}
          aria-label={`Status AI: ${aiStatus.label}`}
        >
          <span className={`topbar-pill-dot ${aiStatus.dotClass}`} aria-hidden="true" />
          <Key size={13} aria-hidden="true" />
          <span className="topbar-pill-label">{aiStatus.label}</span>
        </button>

        {/* Telegram Icon Button */}
        {botConfig?.enabled && (
          <a
            href={botConfig.username ? `https://t.me/${botConfig.username}` : "https://t.me"}
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-icon-btn"
            title={`Buka Bot Telegram (@${botConfig.username || "Bot"})`}
            aria-label="Buka Bot Telegram"
          >
            <Send size={16} style={{ transform: "rotate(45deg)", marginLeft: "-2px" }} />
          </a>
        )}

        {/* Sync Button */}
        {onRefreshSync && (
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={onRefreshSync}
            disabled={isSyncing}
            title="Sinkronkan data dengan database & bot"
            aria-label="Sinkronkan data"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
          </button>
        )}

        {/* User Profile Avatar ala Google */}
        <button
          type="button"
          className={`topbar-avatar-btn ${isSuperadmin ? "admin" : ""}`}
          onClick={onOpenLoginModal}
          title={`Profil: ${currentUser?.nama || "Pegawai"} (Klik untuk kelola / ganti akun)`}
          aria-label={`Akun ${currentUser?.nama || "Pegawai"}`}
        >
          {userInitial}
        </button>
      </div>
    </header>
  );
}
