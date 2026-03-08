#!/bin/bash
# Check for broken image references in portfolio frontmatter
# Usage: ./scripts/check-images.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Checking portfolio image references..."
echo ""

MISSING=0
FOUND=0

# Extract image paths from portfolio markdown files
for md_file in src/content/portfolio/*.md; do
  category=$(basename "$md_file" .md)

  # Extract src paths from frontmatter
  grep -oE '/media/portfolio/[^"]+\.(jpg|jpeg|webp)' "$md_file" 2>/dev/null | while read -r img_path; do
    # For WebP references, check the base JPG or WebP variant
    base_path=$(echo "$img_path" | sed 's/-[0-9]*w\.webp/.jpg/')
    webp_1920="public$(echo "$img_path" | sed 's/\.jpg/-1920w.webp/')"

    # Check if either the JPG or WebP variant exists
    jpg_path="public$base_path"

    if [[ "$img_path" == *".webp" ]]; then
      check_path="public$img_path"
    else
      check_path="public${img_path%.jpg}-1920w.webp"
    fi

    if [[ ! -f "$check_path" ]] && [[ ! -f "$jpg_path" ]]; then
      echo -e "${RED}MISSING:${NC} $img_path (in $category.md)"
      echo "  Checked: $check_path"
    fi
  done
done

# Also check mood metadata
echo ""
echo "Checking mood image references..."

for i in $(seq 1 53); do
  num=$(printf "%02d" $i)
  webp="public/media/mood/2026-mood-portfolio-${num}-1920w.webp"
  if [[ ! -f "$webp" ]]; then
    echo -e "${RED}MISSING:${NC} mood image $num"
  fi
done

echo ""
echo "Done. Fix any missing images by re-running: python3 scripts/sync-photos.py --force"
