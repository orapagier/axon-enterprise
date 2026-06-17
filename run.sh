#!/usr/bin/env bash
# run.sh — production launcher for FreshHub.
#
# Builds the apps (unless SKIP_BUILD=1) and then runs the Medusa backend
# (:9000) and the Next.js storefront (:8000) together in production mode.
# Ctrl+C stops both. Mirrors dev.sh, but with NODE_ENV=production and the
# production `start` scripts (medusa start / next start) instead of dev servers.
#
# Usage:
#   ./run.sh                    # build, then start both in production
#   SKIP_BUILD=1 ./run.sh       # skip the build, start from existing artifacts
#   RUN_MIGRATIONS=1 ./run.sh   # apply DB migrations before booting the backend
#
# DB migrations: --skip-links avoids the stale buyer_wallet link-table drop
# prompt. To apply them by hand instead of via RUN_MIGRATIONS=1:
#   (cd apps/backend && npx medusa db:migrate --skip-links)
set -euo pipefail

cd "$(dirname "$0")"
source ./dev-lib.sh

export NODE_ENV=production

# Ports the production servers bind to (front=storefront, back=medusa).
PORTS=(8000 9000)

pids=()

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "Shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  # Reap any orphaned grandchildren still holding the ports.
  free_port "${PORTS[@]}"
}
trap cleanup INT TERM EXIT

# Clear the ports before we start (handles a previous crashed run or a stray
# dev server still bound to them).
free_port "${PORTS[@]}"

# Build production artifacts unless told to skip (e.g. CI already built them).
# Use turbo directly: the root `npm run build` script is broken (`npm -r build`
# is pnpm syntax), and turbo is what the root `start` script uses anyway.
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Building backend + storefront (NODE_ENV=production)..."
  npx turbo build
fi

# Optionally apply database migrations before the backend boots.
if [[ "${RUN_MIGRATIONS:-0}" == "1" ]]; then
  echo "==> Applying database migrations..."
  ( cd apps/backend && npx medusa db:migrate --skip-links )
fi

echo "==> Starting backend (:9000) and storefront (:8000)..."

# Each app's own `start` script: backend -> `medusa start`, storefront ->
# `next start -p 8000`. exec so the captured pid is the real node process.
( cd apps/backend && exec npm run start ) &
pids+=("$!")

( cd apps/storefront && exec npm run start ) &
pids+=("$!")

# Exit (and trigger cleanup) as soon as either process dies.
wait -n
