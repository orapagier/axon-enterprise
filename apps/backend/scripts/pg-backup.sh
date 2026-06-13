#!/usr/bin/env bash
#
# PostgreSQL backup for FreshHub (Phase H).
#
# Dumps the app database to a timestamped, compressed custom-format file
# (pg_dump -Fc, restorable with pg_restore) and prunes backups older than the
# retention window. Designed to run from cron — see docs/OPERATIONS.md.
#
# Configuration (env, with sensible defaults):
#   DATABASE_URL       postgres connection string. If unset, read from
#                      apps/backend/.env.
#   PG_BACKUP_DIR      where dumps are written (default: ~/freshhub-backups).
#   PG_BACKUP_KEEP_DAYS  retention in days (default: 14).
#
# Usage:
#   ./scripts/pg-backup.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# --- Resolve DATABASE_URL ----------------------------------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "${BACKEND_DIR}/.env" ]]; then
    # Pull only the DATABASE_URL line; tolerate optional quotes/`export`.
    DATABASE_URL="$(grep -E '^(export[[:space:]]+)?DATABASE_URL=' "${BACKEND_DIR}/.env" \
      | tail -1 | sed -E 's/^(export[[:space:]]+)?DATABASE_URL=//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')"
  fi
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "pg-backup: DATABASE_URL is not set and not found in ${BACKEND_DIR}/.env" >&2
  exit 1
fi

BACKUP_DIR="${PG_BACKUP_DIR:-${HOME}/freshhub-backups}"
KEEP_DAYS="${PG_BACKUP_KEEP_DAYS:-14}"
mkdir -p "${BACKUP_DIR}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/freshhub-${STAMP}.dump"

echo "pg-backup: dumping → ${OUT}"
# -Fc: custom format (compressed, selective restore). --no-owner/--no-acl keep
# the dump portable across roles between dev and prod.
pg_dump --dbname="${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${OUT}"

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "pg-backup: wrote ${OUT} (${SIZE})"

# --- Prune old backups -------------------------------------------------------
PRUNED="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'freshhub-*.dump' -type f -mtime "+${KEEP_DAYS}" -print -delete | wc -l | tr -d ' ')"
echo "pg-backup: retention ${KEEP_DAYS}d — pruned ${PRUNED} old backup(s)"

REMAINING="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'freshhub-*.dump' -type f | wc -l | tr -d ' ')"
echo "pg-backup: done — ${REMAINING} backup(s) on disk in ${BACKUP_DIR}"
