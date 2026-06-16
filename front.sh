#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ./dev-lib.sh

# Free the storefront port before starting (handles a previous crashed run).
free_port 8000

npm run storefront:dev
