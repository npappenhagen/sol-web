#!/usr/bin/env python3
"""
Validate that all image references in portfolio frontmatter exist on disk.
Run this before deploying to catch broken images early.

Usage:
    python3 scripts/validate-images.py         # check all
    python3 scripts/validate-images.py --fix   # re-sync to fix orphans
"""

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = PROJECT_ROOT / "src" / "content" / "portfolio"
MEDIA_DIR = PROJECT_ROOT / "public" / "media"

# ANSI colors
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def extract_image_paths(md_path: Path) -> list[str]:
    """Extract all image src paths from portfolio frontmatter."""
    text = md_path.read_text()
    # Match src: /media/... paths
    return re.findall(r'src:\s*(/media/[^\s\n]+)', text)


def check_image_exists(src_path: str) -> bool:
    """Check if an image (or its WebP variant) exists on disk."""
    # Convert /media/... to public/media/...
    relative = src_path.lstrip("/")
    full_path = PROJECT_ROOT / "public" / relative

    # Check original path
    if full_path.exists():
        return True

    # Check WebP variant (for JPGs that were converted)
    if src_path.endswith(".jpg") or src_path.endswith(".jpeg"):
        webp_1920 = full_path.parent / f"{full_path.stem}-1920w.webp"
        if webp_1920.exists():
            return True

    return False


def main():
    fix_mode = "--fix" in sys.argv

    print("Validating portfolio image references...\n")

    missing = []
    checked = 0

    for md_file in sorted(CONTENT_DIR.glob("*.md")):
        category = md_file.stem
        paths = extract_image_paths(md_file)

        for src in paths:
            checked += 1
            if not check_image_exists(src):
                missing.append((category, src))

    # Also check mood images
    print(f"Checked {checked} portfolio image references")

    mood_missing = []
    for i in range(1, 54):
        webp = MEDIA_DIR / "mood" / f"2026-mood-portfolio-{i:02d}-1920w.webp"
        if not webp.exists():
            mood_missing.append(i)

    print(f"Checked 53 mood image references")
    print()

    if missing:
        print(f"{RED}MISSING PORTFOLIO IMAGES:{RESET}")
        for category, src in missing:
            print(f"  {category}: {src}")
        print()

    if mood_missing:
        print(f"{RED}MISSING MOOD IMAGES:{RESET}")
        for num in mood_missing:
            print(f"  mood-{num:02d}")
        print()

    if missing or mood_missing:
        print(f"{YELLOW}To fix, re-sync from source:{RESET}")
        if missing:
            categories = set(cat for cat, _ in missing)
            for cat in categories:
                print(f"  python3 scripts/sync-photos.py {cat} --force")
        if mood_missing:
            print(f"  python3 scripts/sync-photos.py mood --force")
        print()

        if fix_mode:
            import subprocess
            print(f"{YELLOW}Running fix...{RESET}\n")
            categories = set(cat for cat, _ in missing)
            for cat in categories:
                subprocess.run(["python3", "scripts/sync-photos.py", cat, "--force"])
            if mood_missing:
                subprocess.run(["python3", "scripts/sync-photos.py", "mood", "--force"])
            print(f"\n{GREEN}Re-run validation to confirm fix.{RESET}")

        sys.exit(1)
    else:
        print(f"{GREEN}All images valid!{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
