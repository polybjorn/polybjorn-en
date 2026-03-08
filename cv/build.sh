#!/bin/sh
# Generate CV PDFs from YAML data
# Usage: sh cv/build.sh (run from repo root)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"

echo "Generating icon manifest..."
svg_icons=""
png_icons=""
for f in cv/icons/*.svg; do
  name="$(basename "$f" .svg)"
  svg_icons="$svg_icons\"$name\", "
done
for f in cv/icons/*.png; do
  name="$(basename "$f" .png)"
  png_icons="$png_icons\"$name\", "
done
printf '{\n  "svg": [%s],\n  "png": [%s]\n}\n' \
  "${svg_icons%, }" "${png_icons%, }" > cv/icons.json

EN_FILE="CV-Bjorn-Andersen-EN.pdf"
NO_FILE="CV-Bjorn-Andersen-NO.pdf"

echo "Building English CV..."
typst compile cv/template.typ "cv/output/$EN_FILE" --input lang=en --font-path cv/fonts --root .

echo "Building Norwegian CV..."
typst compile cv/template.typ "cv/output/$NO_FILE" --input lang=no --font-path cv/fonts --root .

cp "cv/output/$EN_FILE" public/
cp "cv/output/$NO_FILE" public/

BRAND_DIR="$HOME/Vault/Assets/Brand/CV"
if [ -d "$BRAND_DIR" ]; then
  cp "cv/output/$EN_FILE" "$BRAND_DIR/"
  cp "cv/output/$NO_FILE" "$BRAND_DIR/"
fi

echo "Done."
ls -lh cv/output/*.pdf
