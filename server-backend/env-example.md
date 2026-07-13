# =============================================================================
# Sagip — server-backend (.env.example)
# Copy to .env in this directory:
#   cp .env.example .env
#
# API runs on http://localhost:8001
# Client (http://localhost:8000) proxies /api/* here via proxy.ts — same-origin.
# =============================================================================

# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------

# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sagip?schema=public"

# Master key for HS256 login tokens (≥32 characters).
# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
AUTH_TOKEN_SECRET="change-me-to-a-long-random-string"

# 32-byte key (base64) — encrypts Stellar account secrets at rest (AES-256-GCM).
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_ENCRYPTION_KEY="change-me-32-byte-base64-key"

# -----------------------------------------------------------------------------
# Admin bootstrap (optional — created/updated by `npm run db:seed`)
# Sign in at http://localhost:8000/admin/sign-in (separate from user accounts)
# -----------------------------------------------------------------------------

ADMIN_USERNAME="root"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me-strong-password"
ADMIN_NAME="Administrator"

# -----------------------------------------------------------------------------
# Email / SMTP (optional — copied into DB by seed)
# Without these, email features report that mail is not configured yet.
# -----------------------------------------------------------------------------

# SMTP_HOST="smtp.resend.com"
# SMTP_PORT="465"
# SMTP_USER="resend"
# SMTP_PASS="your-smtp-password"
# SMTP_FROM="Sagip <no-reply@yourdomain.com>"

# -----------------------------------------------------------------------------
# Cron (optional — production)
# Protects POST /api/cron/reminders (check-in reminder emails).
# GitHub Actions: set CRON_SECRET in repo secrets + API_URL to backend URL.
# -----------------------------------------------------------------------------

# CRON_SECRET="change-me-cron-secret"

# -----------------------------------------------------------------------------
# CORS (optional — usually leave unset)
# Default web app uses client proxy.ts → same-origin /api/* → no CORS needed.
# Only set if a browser on another origin calls this API directly (no proxy).
# Comma-separated list. CLIENT_ORIGIN is an alias for CORS_ORIGIN.
# -----------------------------------------------------------------------------

# CORS_ORIGIN="http://localhost:8000"
# CORS_ORIGIN="http://localhost:8000,https://app.yourdomain.com"
# CLIENT_ORIGIN="https://app.yourdomain.com"

# -----------------------------------------------------------------------------
# Dev / CI (optional)
# -----------------------------------------------------------------------------

# Skip USDC treasury bootstrap during seed (no network required).
# Use for CI and offline dev: SKIP_TREASURY="1"
# SKIP_TREASURY="1"

# NODE_ENV is set automatically by Next.js (development | production | test).
