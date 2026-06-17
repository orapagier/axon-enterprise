#!/usr/bin/env bash
# Runs back.sh and front.sh together. Ctrl+C stops both.
set -euo pipefail

cd "$(dirname "$0")"
source ./dev-lib.sh

# Ports the dev servers bind to (front=storefront, back=medusa).
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
  # Reap any orphaned grandchildren (turbo -> next/medusa) still holding ports.
  free_port "${PORTS[@]}"
}
trap cleanup INT TERM EXIT

# Make sure the ports are clear before we start (handles a previous crashed run).
free_port "${PORTS[@]}"

./back.sh &
pids+=("$!")

./front.sh &
pids+=("$!")

# Exit (and trigger cleanup) as soon as either process dies.
wait -n
