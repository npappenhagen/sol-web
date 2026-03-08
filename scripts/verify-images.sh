#!/usr/bin/env bash
#
# Verify all portfolio JPEGs have their WebP variants.
# Returns non-zero exit code if any are missing.
#
# Usage:
#   ./scripts/verify-images.sh          # check and report
#   ./scripts/verify-images.sh --quiet  # exit code only

set -euo pipefail
shopt -s globstar nullglob

MEDIA_DIR="public/media/portfolio"
QUIET=false
MISSING=0
CHECKED=0

if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=true
fi

if [[ ! -d "$MEDIA_DIR" ]]; then
  echo "Media directory not found: $MEDIA_DIR"
  exit 1
fi

# Find all JPEGs and check for variants
for jpg in "$MEDIA_DIR"/**/*.jpg "$MEDIA_DIR"/**/*.jpeg; do
  [[ -f "$jpg" ]] || continue

  CHECKED=$((CHECKED + 1))
  stem="${jpg%.*}"
  stem="${stem##*/}"
  dir="$(dirname "$jpg")"

  # Check for 400w variant as indicator
  variant="${dir}/${stem}-400w.webp"

  if [[ ! -f "$variant" ]]; then
    MISSING=$((MISSING + 1))
    if [[ "$QUIET" == "false" ]]; then
      echo "MISSING: $(basename "$jpg")"
    fi
  fi
done

if [[ "$QUIET" == "false" ]]; then
  echo ""
  echo "Checked: $CHECKED images"
  echo "Missing variants: $MISSING"
fi

if [[ $MISSING -gt 0 ]]; then
  if [[ "$QUIET" == "false" ]]; then
    echo ""
    echo "Run 'make process-cms' to generate missing variants."
  fi
  exit 1
fi

if [[ "$QUIET" == "false" ]]; then
  echo "All images have variants."
fi
exit 0
