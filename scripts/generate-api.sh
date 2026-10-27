#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
go generate ./internal/apigen
cd "$ROOT"
npm --prefix tools/openapi run generate
