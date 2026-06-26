#!/usr/bin/env bash
# install.sh — one-time production setup for FreshHub on a fresh clone.
#
# Run this ONCE after `git clone` on the server. It is idempotent and
# resumable: run it, fill in the secrets it can't generate, then run it
# again — it picks up where it left off.
#
# What it does:
#   1. Preflight  — checks Node >=20, npm, openssl (+ warns on psql/redis).
#   2. Deps       — npm install (root; installs backend + storefront workspaces).
#   3. Env        — copies .env templates if missing and auto-generates the
#                   secrets it safely can (JWT/COOKIE/OTP). On first creation it
#                   STOPS so you can fill DATABASE_URL / REDIS_URL / S3 / Resend.
#   4. Validate   — confirms the prod-required vars are set (medusa-config.ts
#                   refuses to boot without them).
#   5. Migrate    — npx medusa db:migrate --skip-links.
#   6. Wire key   — reads the publishable API key out of the DB and writes it
#                   into apps/storefront/.env.local (needed for the build).
#   7. Build      — npx turbo build (backend + storefront).
#
# After this finishes, start the app with:  ./run.sh   (or SKIP_BUILD=1 ./run.sh)
#
# Optional overrides (env vars):
#   ADMIN_EMAIL / ADMIN_PASSWORD   create an admin user during install
#   SKIP_DEPS=1                    skip `npm install`
#   SKIP_BUILD=1                   skip the final turbo build
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"
BACKEND="$ROOT/apps/backend"
STOREFRONT="$ROOT/apps/storefront"
BACKEND_ENV="$BACKEND/.env"
STOREFRONT_ENV="$STOREFRONT/.env.local"

# Production install: this makes medusa-config enforce the prod-required vars,
# so failures are explicit here rather than cryptic at first boot.
export NODE_ENV=production

# ── small helpers ──────────────────────────────────────────────────────────
say()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# getenv KEY FILE — print the value of KEY=... from an env file (empty if unset).
getenv() {
  [[ -f "$2" ]] || return 0
  grep -E "^$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2-
}

# setenv KEY VALUE FILE — replace KEY=... in place, or append it if absent.
# Uses awk (not sed) so base64 secrets with / + = need no escaping.
setenv() {
  local key="$1" val="$2" file="$3"
  if grep -qE "^${key}=" "$file"; then
    KEY="$key" VAL="$val" awk -F= '
      BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"] }
      $1 == k { print k "=" v; next }
      { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# is_placeholder VALUE — true when a value is empty or a known template stub.
is_placeholder() {
  case "$1" in
    "" | supersecret | pk_xxx | pk_xxxxxxxxxxxxxxxxxxxx) return 0 ;;
    *user:password@* | *postgres://user:*) return 0 ;;
    *) return 1 ;;
  esac
}

# ── 1. preflight ────────────────────────────────────────────────────────────
say "Preflight checks"
have node || die "Node.js not found. Install Node 20+ first."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$node_major" -ge 20 ]] || die "Node 20+ required (found $(node -v))."
have npm     || die "npm not found."
have openssl || die "openssl not found (needed to generate secrets)."
have psql    || warn "psql not found — can't auto-read the publishable key or verify the DB. Install postgresql-client for the smoothest setup."
echo "Node $(node -v), npm $(npm -v) — OK"

# ── 2. dependencies ─────────────────────────────────────────────────────────
if [[ "${SKIP_DEPS:-0}" != "1" ]]; then
  say "Installing dependencies (npm install — backend + storefront workspaces)"
  npm install
else
  say "Skipping npm install (SKIP_DEPS=1)"
fi

# ── 3. environment files ────────────────────────────────────────────────────
say "Setting up environment files"
fresh_env=0

if [[ ! -f "$BACKEND_ENV" ]]; then
  cp "$BACKEND/.env.template" "$BACKEND_ENV"
  echo "Created apps/backend/.env from template"
  fresh_env=1
fi
if [[ ! -f "$STOREFRONT_ENV" ]]; then
  cp "$STOREFRONT/.env.template" "$STOREFRONT_ENV"
  echo "Created apps/storefront/.env.local from template"
  fresh_env=1
fi

# Auto-generate the secrets we safely can (only when still at the stub value).
[[ -z "$(getenv JWT_SECRET "$BACKEND_ENV")"    || "$(getenv JWT_SECRET "$BACKEND_ENV")"    == supersecret ]] && \
  { setenv JWT_SECRET    "$(openssl rand -base64 32)" "$BACKEND_ENV";    echo "Generated JWT_SECRET"; }
[[ -z "$(getenv COOKIE_SECRET "$BACKEND_ENV")" || "$(getenv COOKIE_SECRET "$BACKEND_ENV")" == supersecret ]] && \
  { setenv COOKIE_SECRET "$(openssl rand -base64 32)" "$BACKEND_ENV";    echo "Generated COOKIE_SECRET"; }
[[ -z "$(getenv MFH_OTP_SECRET "$STOREFRONT_ENV")" ]] && \
  { setenv MFH_OTP_SECRET "$(openssl rand -hex 32)" "$STOREFRONT_ENV";   echo "Generated MFH_OTP_SECRET"; }

if [[ "$fresh_env" == "1" ]]; then
  cat <<EOF

────────────────────────────────────────────────────────────────────────────
 Environment files were just created. Fill in the values only YOU can provide,
 then re-run ./install.sh to continue.

 apps/backend/.env        (required in production):
   DATABASE_URL   postgres://USER:PASS@HOST:5432/medusa-freshhub
   REDIS_URL      redis://localhost:6379
   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FILE_URL
   (optional) RESEND_API_KEY + EMAIL_FROM, TELEGRAM_*, ASSISTANT_API_KEY, GOOGLE_*

 apps/storefront/.env.local:
   NEXT_PUBLIC_MEDUSA_BACKEND_URL   public URL of the backend (e.g. https://api.yourdomain)
   NEXT_PUBLIC_BASE_URL             public URL of the storefront
   (the publishable key is wired in automatically on the next run)

 JWT_SECRET / COOKIE_SECRET / MFH_OTP_SECRET were generated for you.
 If you are RESTORING a database backup, do that now (see docs/OPERATIONS.md
 / pg-restore.sh) before re-running.
────────────────────────────────────────────────────────────────────────────
EOF
  exit 0
fi

# ── 4. validate prod-required env ───────────────────────────────────────────
say "Validating production environment"
DATABASE_URL="$(getenv DATABASE_URL "$BACKEND_ENV")"
REDIS_URL="$(getenv REDIS_URL "$BACKEND_ENV")"
missing=()
is_placeholder "$DATABASE_URL"                        && missing+=("DATABASE_URL")
[[ -z "$REDIS_URL" ]]                                 && missing+=("REDIS_URL")
is_placeholder "$(getenv JWT_SECRET "$BACKEND_ENV")"  && missing+=("JWT_SECRET")
is_placeholder "$(getenv COOKIE_SECRET "$BACKEND_ENV")" && missing+=("COOKIE_SECRET")
for v in S3_BUCKET S3_REGION S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY S3_FILE_URL; do
  [[ -z "$(getenv "$v" "$BACKEND_ENV")" ]] && missing+=("$v")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  die "These prod-required vars are unset in apps/backend/.env (medusa-config.ts won't boot without them):
       ${missing[*]}
     Fill them in and re-run ./install.sh."
fi
echo "All prod-required vars present."

# Optional: verify the DB is reachable before we try to migrate.
if have psql; then
  if ! psql "$DATABASE_URL" -tAc 'SELECT 1' >/dev/null 2>&1; then
    die "Cannot connect to DATABASE_URL. Make sure Postgres is running and the
     database exists (createdb, or restore your dump), then re-run."
  fi
  echo "Database reachable."
fi

# ── 5. migrations ───────────────────────────────────────────────────────────
say "Applying database migrations (medusa db:migrate --skip-links)"
# --skip-links avoids the stale buyer_wallet link-table drop prompt (known/benign).
( cd "$BACKEND" && npx medusa db:migrate --skip-links )

# ── (optional) admin user ───────────────────────────────────────────────────
if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  say "Creating admin user $ADMIN_EMAIL"
  ( cd "$BACKEND" && npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" ) \
    || warn "Admin user not created (it may already exist) — continuing."
fi

# ── 6. wire the storefront publishable key from the DB ──────────────────────
say "Wiring the storefront publishable API key"
current_key="$(getenv NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY "$STOREFRONT_ENV")"
if ! is_placeholder "$current_key"; then
  echo "Storefront already has a publishable key — leaving it as-is."
elif have psql; then
  db_key="$(psql "$DATABASE_URL" -tAc \
    "SELECT token FROM api_key WHERE type='publishable' ORDER BY created_at ASC LIMIT 1;" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ -n "$db_key" ]]; then
    setenv NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY "$db_key" "$STOREFRONT_ENV"
    echo "Wired publishable key ${db_key:0:12}… into apps/storefront/.env.local"
  else
    die "No publishable API key found in the database. This DB hasn't been
     seeded (and isn't a restored backup). Do ONE of:
       • Restore your production dump (pg-restore.sh), then re-run; OR
       • Seed base data:
           cd apps/backend && npx medusa exec ./src/migration-scripts/initial-data-seed.ts
         (then your PH-specific seeds: seed-hubs.ts, add-philippines-region.ts, …)
         and re-run ./install.sh.
     The storefront build needs this key, so install stops here."
  fi
else
  die "psql isn't installed, so I can't read the publishable key automatically.
     Install postgresql-client, OR set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in
     apps/storefront/.env.local by hand (admin → Settings → Publishable API keys),
     then re-run."
fi

# ── 7. build ────────────────────────────────────────────────────────────────
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  say "Building backend + storefront (npx turbo build)"
  npx turbo build
else
  say "Skipping build (SKIP_BUILD=1)"
fi

say "Install complete 🎉"
cat <<EOF

Start the app in production with:
    ./run.sh                 # rebuilds, then starts backend :9000 + storefront :8000
    SKIP_BUILD=1 ./run.sh    # reuse the build this script just made (faster first start)

To re-apply migrations on a future deploy:  RUN_MIGRATIONS=1 ./run.sh
EOF
