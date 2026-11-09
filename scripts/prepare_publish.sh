#!/usr/bin/env bash
# Assemble a clean static publish folder (./dist) for Cloudflare Pages or any
# static host. Only the files the browser needs, plus the data/citations for
# transparency. No build, no Worker, no server code.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="dist"
rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/notes"

cp index.html "$OUT/"
cp data/incident.js "$OUT/data/"
cp data/incident.json "$OUT/data/"      # audit copy, optional but transparent
cp notes/SOURCES.md "$OUT/notes/"       # citations, optional

echo "Wrote $OUT/:"
find "$OUT" -type f | sort | sed 's/^/  /'
echo
echo "Publish $OUT with:  wrangler pages deploy $OUT --project-name sim-ng"
echo "or drag the $OUT folder into Cloudflare Pages > Upload assets."
