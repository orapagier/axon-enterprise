#!/usr/bin/env bash
# Shared helpers for the dev scripts (dev.sh / back.sh / front.sh).

# free_port PORT [PORT...] — kill whatever is listening on the given TCP ports.
# Tries lsof, then falls back to fuser. Safe to call when nothing is listening.
free_port() {
  local port pids
  for port in "$@"; do
    pids=""
    if command -v lsof >/dev/null 2>&1; then
      pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
    fi
    if [[ -z "$pids" ]] && command -v fuser >/dev/null 2>&1; then
      pids="$(fuser "${port}/tcp" 2>/dev/null || true)"
    fi
    if [[ -n "$pids" ]]; then
      echo "Freeing port ${port} (killing: ${pids//$'\n'/ })"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 1
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  done
}
