#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
node scripts/configure-embedded-secrets.mjs
