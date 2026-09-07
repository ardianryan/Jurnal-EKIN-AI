import React, { useState, useEffect } from "react";
import Sheet from "./ui/Sheet";
import { 
  X, 
  Key, 
  ExternalLink, 
  Check, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Server, 
  User,
  AlertCircle,
  Zap,
  Globe,
  Cpu
} from "lucide-react";

export default function GeminiModal({
  isOpen,
  onClose,
  currentUser,
  onSaveUserKey,
  envApiKey,
  serverAiConfig = null,
  allowEnvKey,
  onToggleAllowEnvKey
}) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const hasEnvKey = Boolean(envApiKey) || Boolean(serverAiConfig?.hasServerKey || serverAiConfig?.enabled);
  const isAllowedEnv = isSuperadmin || (typeof currentUser?.allowEnvKey === "boolean" ? currentUser.allowEnvKey : allowEnvKey);

  // State Pilihan Mode AI: "env" | "personal" | "offline"
  const [keyChoice, setKeyChoice] = useState(() => {
    if (currentUser?.aiModeChoice === "offline") return "offline";
    if (currentUser?.aiModeChoice === "personal") return "personal";
    if (currentUser?.aiModeChoice === "env" && hasEnvKey && isAllowedEnv) return "env";
    if (currentUser?.usePersonalKey && currentUser?.personalApiKey) return "personal";
    if (hasEnvKey && isAllowedEnv) return "env";
    if (currentUser?.personalApiKey) return "personal";
    return "offline";
  });

  const [personalKeyInput, setPersonalKeyInput] = useState(currentUser?.personalApiKey || "");
  const [personalProvider, setPersonalProvider] = useState(currentUser?.personalAiProvider || "gemini");
  const [personalBaseUrl, setPersonalBaseUrl] = useState(currentUser?.personalAiBaseUrl || "https://api.9router.com/v1");
  const [personalModel, setPersonalModel] = useState(currentUser?.personalAiModel || "openai/gpt-4o-mini");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPersonalKeyInput(currentUser.personalApiKey || "");
      setPersonalProvider(currentUser.personalAiProvider || "gemini");
      setPersonalBaseUrl(currentUser.personalAiBaseUrl || "https://api.9router.com/v1");
      setPersonalModel(currentUser.personalAiModel || "openai/gpt-4o-mini");

      if (currentUser.aiModeChoice === "offline") {
        setKeyChoice("offline");
      } else if (currentUser.aiModeChoice === "personal") {
        setKeyChoice("personal");
      } else if (currentUser.aiModeChoice === "env") {
        if (hasEnvKey && isAllowedEnv) {
          setKeyChoice("env");
        } else {
          setKeyChoice(currentUser.personalApiKey ? "personal" : "offline");
        }
      } else if (currentUser.usePersonalKey && currentUser.personalApiKey) {
        setKeyChoice("personal");
      } else if (hasEnvKey && isAllowedEnv) {
        setKeyChoice("env");
      } else if (currentUser.personalApiKey) {
        setKeyChoice("personal");
      } else {
        setKeyChoice("offline");
      }
    }
  }, [currentUser, allowEnvKey, hasEnvKey, isAllowedEnv, serverAiConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    const usePersonal = keyChoice === "personal";
    onSaveUserKey(
      personalKeyInput.trim(), 
      usePersonal, 
      keyChoice,
      {
        provider: personalProvider,
        baseUrl: personalBaseUrl.trim(),
        model: personalModel.trim()
      }
    );
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleClearPersonal = () => {
    setPersonalKeyInput("");
    setPersonalProvider("gemini");
    setPersonalBaseUrl("https://api.9router.com/v1");
    setPersonalModel("openai/gpt-4o-mini");
    const nextChoice = (hasEnvKey && isAllowedEnv) ? "env" : "offline";
    setKeyChoice(nextChoice);
    onSaveUserKey("", false, nextChoice, {
      provider: "gemini",
      baseUrl: "",
      model: ""
    });
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan AI Assistant & API Key"
      description={`Akun: ${currentUser?.nama || currentUser?.username || "Pegawai"} (${currentUser?.role || "pegawai"})`}
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* KHUSUS SUPERADMIN: SETTING TOGGLE IZIN PEMAKAIAN KEY DARI .ENV */}
          {isSuperadmin && (
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: allowEnvKey ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: allowEnvKey ? "#10b981" : "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1px solid ${allowEnvKey ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>Izin API Key Sistem (.env) untuk Pegawai</span>
                    <span style={{
                      fontSize: "0.72rem",
                      padding: "2px 7px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      background: allowEnvKey ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: allowEnvKey ? "#10b981" : "#ef4444"
                    }}>
                      {allowEnvKey ? "Diizinkan Aktif" : "Dibatasi"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {allowEnvKey 
                      ? "Seluruh pegawai diizinkan langsung menggunakan API Key bersama dari file .env sistem." 
                      : "Pegawai dibatasi dan diwajibkan memasukkan API Key Gemini pribadi akun."}
                  </div>
                </div>
              </div>

              {/* Modern Interactive Switch */}
              <button
                type="button"
                onClick={() => onToggleAllowEnvKey(!allowEnvKey)}
                role="switch"
                aria-checked={allowEnvKey}
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "9999px",
                  background: allowEnvKey ? "#10b981" : "var(--border-strong)",
                  position: "relative",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                  padding: "3px"
                }}
                title="Klik untuk mengubah izin API Key .env sistem"
              >
                <div style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transform: allowEnvKey ? "translateX(22px)" : "translateX(0px)",
                  transition: "transform 0.2s ease"
                }} />
              </button>
            </div>
          )}

          {/* STATUS INFORMASI UNTUK PEGAWAI */}
          {!isSuperadmin && (
            isAllowedEnv && hasEnvKey ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(52, 99, 75, 0.12)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Server size={18} />
                </div>
                <div>
                  <strong style={{ color: "var(--accent-primary)" }}>Sistem Menyediakan API Key Bersama (.env):</strong> Akun Anda diizinkan langsung menggunakan fitur AI tanpa perlu repot memasukkan key pribadi. Namun jika kuota sistem sedang bermasalah atau habis, Anda dapat memilih opsi <em>Key Pribadi Akun</em> di bawah.
                </div>
              </div>
            ) : currentUser?.allowEnvKey === false ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <strong style={{ color: "#ef4444" }}>Akses API Key Sistem Dibatasi untuk Akun Anda:</strong> Administrator mewajibkan akun ini menggunakan API Key sendiri. Silakan masukkan API Key Gemini pribadi Anda di bawah untuk mengaktifkan fitur AI.
                </div>
              </div>
            ) : (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                lineHeight: "1.5"
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <strong style={{ color: "#d97706" }}>Mode AI Cerdas Offline Aktif:</strong> Belum ada API Key (atau mode sistem dibatasi). Tenang, Anda <strong>tidak diblokir</strong> — fitur AI tetap bisa memoles catatan kasaran menggunakan engine heuristik offline bawaan. Jika ingin menggunakan Google Gemini Online, Anda dapat memasukkan API Key di bawah kapan saja.
                </div>
              </div>
            )
          )}

          {/* PILIHAN SUMBER KEY / MODE PEMROSESAN AI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Pilih Mode Pemrosesan AI untuk Akun Anda:
            </label>

            {/* Opsi 1: Gunakan Key Sistem (.env) */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "env" ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                background: keyChoice === "env" ? "rgba(52, 99, 75, 0.06)" : "var(--bg-secondary)",
                cursor: (hasEnvKey && isAllowedEnv) ? "pointer" : "not-allowed",
                opacity: (hasEnvKey && isAllowedEnv) ? 1 : 0.6,
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="env"
                disabled={!(hasEnvKey && isAllowedEnv)}
                checked={keyChoice === "env"}
                onChange={() => setKeyChoice("env")}
                style={{ marginTop: "3px", accentColor: "var(--accent-primary)" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Server size={14} style={{ color: "var(--accent-primary)" }} />
                  <span>Gunakan AI Bersama dari Sistem (.env)</span>
                  {hasEnvKey && isAllowedEnv ? (
                    <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Tersedia &amp; Diizinkan
                    </span>
                  ) : !hasEnvKey ? (
                    <span style={{ fontSize: "0.72rem", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Belum Diatur di Server
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Dibatasi Administrator
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {serverAiConfig?.provider === "openai"
                    ? `Menggunakan server-side OpenAI/9router (${serverAiConfig.model || "openai/gpt-4o-mini"}) tanpa perlu mendaftar key sendiri.`
                    : "Praktis menggunakan Gemini 2.5 Flash Online dari konfigurasi server tanpa perlu mendaftar key sendiri."}
                </div>
              </div>
            </label>

            {/* Opsi 2: Gunakan Key Pribadi Akun */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "personal" ? "#7c3aed" : "var(--border-subtle)"}`,
                background: keyChoice === "personal" ? "rgba(124, 58, 237, 0.05)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="personal"
                checked={keyChoice === "personal"}
                onChange={() => setKeyChoice("personal")}
                style={{ marginTop: "3px", accentColor: "#7c3aed" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <User size={14} style={{ color: "#7c3aed" }} />
                  <span>Gunakan Konfigurasi AI Pribadi Akun Sendiri</span>
                  {personalKeyInput ? (
                    <span style={{ fontSize: "0.72rem", background: "#f3e8ff", color: "#6b21a8", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      {personalProvider === "openai" ? "9router / OpenAI" : "Gemini"} Tersimpan
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                      Perlu Input Key
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Gunakan kuota milik Anda sendiri: Google Gemini atau OpenAI-Compatible (9router, OpenRouter, LiteLLM, Ollama) dengan custom model &amp; endpoint.
                </div>
              </div>
            </label>

            {/* Opsi 3: Gunakan Mode AI Cerdas Offline (Bawaan BKN) */}
            <label 
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: `1.5px solid ${keyChoice === "offline" ? "#d97706" : "var(--border-subtle)"}`,
                background: keyChoice === "offline" ? "rgba(245, 158, 11, 0.05)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <input
                type="radio"
                name="geminiSource"
                value="offline"
                checked={keyChoice === "offline"}
                onChange={() => setKeyChoice("offline")}
                style={{ marginTop: "3px", accentColor: "#d97706" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Zap size={14} style={{ color: "#d97706" }} />
                  <span>Gunakan Mode AI Cerdas Offline (Bawaan BKN)</span>
                  <span style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                    Instan &amp; Tanpa Kuota
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Memoles catatan kasaran menggunakan engine heuristik lokal kedinasan ASN tanpa kuota dan tanpa butuh koneksi internet.
                </div>
              </div>
            </label>
          </div>

          {/* Kolom Input Key Pribadi jika Opsi Personal Terpilih */}
          {keyChoice === "personal" && (
            <div style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1.1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              {/* Provider Selection Tabs */}
              <div>
                <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", marginBottom: "0.5rem", display: "block" }}>
                  Pilih Penyedia AI (AI Provider):
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setPersonalProvider("gemini")}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: `1.5px solid ${personalProvider === "gemini" ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                      background: personalProvider === "gemini" ? "rgba(52, 99, 75, 0.12)" : "var(--bg-secondary)",
                      color: personalProvider === "gemini" ? "var(--accent-primary)" : "var(--text-secondary)",
                      fontWeight: "700",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Google Gemini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPersonalProvider("openai")}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: `1.5px solid ${personalProvider === "openai" ? "#7c3aed" : "var(--border-subtle)"}`,
                      background: personalProvider === "openai" ? "rgba(124, 58, 237, 0.12)" : "var(--bg-secondary)",
                      color: personalProvider === "openai" ? "#7c3aed" : "var(--text-secondary)",
                      fontWeight: "700",
                      fontSize: "0.82rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <Globe size={15} />
                    <span>OpenAI / 9router</span>
                  </button>
                </div>
              </div>

              {/* Form Jika Google Gemini */}
              {personalProvider === "gemini" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem" }}>
                    Gemini API Key Pribadi Anda:
                  </label>
                  <input 
                    type="password" 
                    className="input-field font-mono"
                    value={personalKeyInput}
                    onChange={(e) => setPersonalKeyInput(e.target.value)}
                    placeholder="AIzaSy... (atau kosongkan untuk Mode AI Offline)"
                    style={{ fontSize: "0.85rem" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Kosongkan jika ingin memakai AI Mode Offline gratis tanpa key.
                    </span>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "3px" }}
                    >
                      Dapatkan Key Gratis <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}

              {/* Form Jika OpenAI Compatible / 9router */}
              {personalProvider === "openai" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {/* Base URL Endpoint */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", margin: 0 }}>
                        Base URL / Custom Endpoint:
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Format /v1</span>
                    </div>
                    <input 
                      type="text" 
                      className="input-field font-mono"
                      value={personalBaseUrl}
                      onChange={(e) => setPersonalBaseUrl(e.target.value)}
                      placeholder="https://api.9router.com/v1"
                      style={{ fontSize: "0.85rem" }}
                    />
                    {/* Preset Endpoint Chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                      {[
                        { name: "9router (Default)", url: "https://api.9router.com/v1" },
                        { name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
                        { name: "OpenAI Resmi", url: "https://api.openai.com/v1" },
                        { name: "Localhost (Ollama)", url: "http://localhost:11434/v1" }
                      ].map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setPersonalBaseUrl(preset.url)}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            border: "1px solid var(--border-subtle)",
                            background: personalBaseUrl === preset.url ? "#7c3aed" : "var(--bg-secondary)",
                            color: personalBaseUrl === preset.url ? "#ffffff" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem" }}>
                      API Key (9router / OpenAI / Provider):
                    </label>
                    <input 
                      type="password" 
                      className="input-field font-mono"
                      value={personalKeyInput}
                      onChange={(e) => setPersonalKeyInput(e.target.value)}
                      placeholder="Masukkan API Key (9router-..., sk-..., dll)"
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>

                  {/* Custom Model */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="form-label" style={{ fontWeight: "700", fontSize: "0.82rem", margin: 0 }}>
                        Nama Model (Custom Model):
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Sesuai katalog provider</span>
                    </div>
                    <input 
                      type="text" 
                      className="input-field font-mono"
                      value={personalModel}
                      onChange={(e) => setPersonalModel(e.target.value)}
                      placeholder="openai/gpt-4o-mini"
                      style={{ fontSize: "0.85rem" }}
                    />
                    {/* Preset Model Chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                      {[
                        "openai/gpt-4o-mini",
                        "google/gemini-2.5-flash",
                        "deepseek/deepseek-chat",
                        "gpt-4o-mini",
                        "gpt-4o"
                      ].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPersonalModel(m)}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            border: "1px solid var(--border-subtle)",
                            background: personalModel === m ? "#7c3aed" : "var(--bg-secondary)",
                            color: personalModel === m ? "#ffffff" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {saveSuccess && (
            <div style={{ 
              padding: "0.75rem", 
              background: "#dcfce7", 
              border: "1px solid #86efac",
              borderRadius: "8px",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.84rem",
              fontWeight: "600"
            }}>
              <Check size={16} />
              <span>
                {keyChoice === "env" 
                  ? "Mode AI Bersama (.env Sistem) berhasil diaktifkan!" 
                  : keyChoice === "personal" 
                  ? "API Key Gemini Pribadi berhasil disimpan dan aktif!" 
                  : "Mode AI Cerdas Offline BKN berhasil diaktifkan!"}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {personalKeyInput ? (
            <button 
              type="button" 
              className="btn btn-outline btn-sm" 
              onClick={handleClearPersonal}
              style={{ fontSize: "0.8rem", color: "#dc2626" }}
            >
              Hapus Key Pribadi
            </button>
          ) : <div />}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Batal
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-sm" 
              onClick={handleSave}
              style={{ fontWeight: "700" }}
            >
              <Check size={15} />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
    </Sheet>
  );
}
