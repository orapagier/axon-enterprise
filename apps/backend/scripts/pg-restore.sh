#!/usr/bin/env bash
#
# Restore a FreshHub PostgreSQL backup produced by pg-backup.sh (Phase H).
#
# DESTRUCTIVE: --clean drops existing objects before recreating them. Point it
# at a scratch/staging database first to rehearse a restore.
#
#   DATABASE_URL    target connection string (defaults to apps/backend/.env)
#
# Usage:
#   ./scripts/pg-restore.sh ~/freshhub-backups/freshhub-20260614-020000.dump
#
set -euo pipefail

DUMP="${1:-}"
if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "usage: $0 <path-to-.dump>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" && -f "${BACKEND_DIR}/.env" ]]; then
  DATABASE_URL="$(grep -E '^(export[[:space:]]+)?DATABASE_URL=' "${BACKEND_DIR}/.env" \
    | tail -1 | sed -E 's/^(export[[:space:]]+)?DATABASE_URL=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')"
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "pg-restore: DATABASE_URL is not set and not found in ${BACKEND_DIR}/.env" >&2
  exit 1
fi

echo "pg-restore: restoring ${DUMP} → ${DATABASE_URL%%\?*}"
read -r -p "This will DROP and recreate objects in the target DB. Continue? [y/N] " ok
[[ "${ok}" == "y" || "${ok}" == "Y" ]] || { echo "aborted"; exit 1; }

pg_restore --dbname="${DATABASE_URL}" --clean --if-exists --no-owner --no-acl "${DUMP}"
echo "pg-restore: done"
