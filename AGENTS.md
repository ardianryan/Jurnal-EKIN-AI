# Antigravity Rules & Workspace Guidelines

## Project Context
- **Name**: E-Kinerja SMAN 1 Gedeg (SMAN Garuda)
- **Active Git Branch**: `smansage` (ALWAYS commit and push to `smansage`, never push directly to `main` unless requested)
- **Runtime Target**: Docker (GHCR image `ghcr.io/ardianryan/jurnal-ekin-ai:smansage`) & Portainer Stack
- **Database**: External PostgreSQL at `10.1.0.18:5432` (`ekinaism`), with fallback to `database/ekinerja_store.json`
- **Public Domain**: `https://ekin.sman1gedeg.sch.id`

---

## Strict Development Rules

### 1. Security & Secrets Protection
- **NEVER hardcode credentials**, passwords, API keys, or private tokens in tracked repository files, documentation, or commit messages.
- Always read secrets from `process.env` (e.g. `DB_PASSWORD`, `R2_SECRET_ACCESS_KEY`, `ZITADEL_CLIENT_SECRET`, `GEMINI_API_KEY`).
- `.env` must remain strictly ignored in `.gitignore`. Provide reference variables in `.env.example` with dummy values.

### 2. Single Sign-On (Zitadel OIDC) Guidelines
- Always support `APP_URL` and `ZITADEL_REDIRECT_URI` environment variables for computing canonical callback URIs behind reverse proxies (Nginx/Cloudflare/Portainer).
- Do not reject valid authenticated Zitadel users even if custom metadata is missing or partial; auto-register them and let them complete profile onboarding.
- The SSO button must remain positioned prominently at the top of the login options.

### 3. Database Auto-Migration & Auto-Seeding
- All schema alterations in `server/postgresAdapter.js` (and `server/mysqlAdapter.js`) must be non-destructive (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Never delete or drop tables in production initialization.
- Seeding default accounts (`DEFAULT_SEED_ACCOUNTS`) is allowed ONLY when `SELECT COUNT(*) FROM accounts` returns 0.

### 4. Build & Verification
- Always test frontend build with `npm run build` before pushing commits to Git.
- Ensure Vite outputs clean bundle with 0 syntax or bundling errors.
