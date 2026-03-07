#!/bin/sh
# Generate CV PDFs from YAML data
# Usage: sh cv/build.sh (run from repo root)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"

echo "Building English CV..."
typst compile cv/template.typ cv/output/cv-en.pdf --input lang=en --root .

echo "Building Norwegian CV..."
typst compile cv/template.typ cv/output/cv-no.pdf --input lang=no --root .

BRAND_DIR="$HOME/Vault/Assets/Brand/CV"
if [ -d "$BRAND_DIR" ]; then
  cp cv/output/cv-en.pdf "$BRAND_DIR/"
  cp cv/output/cv-no.pdf "$BRAND_DIR/"
  echo "Done. Copied to $BRAND_DIR"
else
  echo "Done. Brand folder not found, output in cv/output/ only"
fi
ls -lh cv/output/*.pdf
