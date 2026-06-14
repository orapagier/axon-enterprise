#!/usr/bin/env bash
# Runs back.sh and front.sh together. Ctrl+C stops both.
set -euo pipefail

cd "$(dirname "$0")"

pids=()

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "Shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

./back.sh &
pids+=("$!")

./front.sh &
pids+=("$!")

# Exit (and trigger cleanup) as soon as either process dies.
wait -n
