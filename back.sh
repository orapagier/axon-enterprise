#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source ./dev-lib.sh

# Free the Medusa backend port before starting (handles a previous crashed run).
free_port 9000

npm run backend:dev
