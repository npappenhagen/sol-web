#!/usr/bin/env python3
"""
Sync web-size photos from the SMB share into public/media/ and update
portfolio frontmatter with image paths and Lightroom keywords.

Usage:
    python3 scripts/sync-photos.py                   # sync all categories
    python3 scripts/sync-photos.py portraits          # sync one category
    python3 scripts/sync-photos.py --dry-run          # preview without copying
"""

import os
import re
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip3 install Pillow")

# ── Config ──────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = PROJECT_ROOT / "public" / "media"
CONTENT_DIR = PROJECT_ROOT / "src" / "content" / "portfolio"

SOURCES = {
    "portraits": Path("/Volumes/sol/portrait-portfolio/web size"),
    "branding": Path("/Volumes/sol/branding-portfolio/web size"),
    "events": Path("/Volumes/sol/retreat-portfolio/web size"),
    "mood": Path("/Volumes/sol/mood-portfolio"),
}

# Keywords to strip — too generic to be useful as tags
GENERIC_KEYWORDS = {"portfolio", "portrait", "branding", "mood"}

# ── Helpers ─────────────────────────────────────────────────────────────────

def extract_keywords(filepath: Path) -> list[str]:
    """Read Lightroom keywords from XMP dc:subject embedded in JPEG."""
    try:
        img = Image.open(filepath)
        xmp = img.info.get("xmp", b"")
        xmp_str = xmp.decode("utf-8", errors="replace") if isinstance(xmp, bytes) else str(xmp)
        match = re.search(r"<dc:subject>(.*?)</dc:subject>", xmp_str, re.DOTALL)
        if match:
            raw = re.findall(r"<rdf:li>(.*?)</rdf:li>", match.group(1))
            return sorted(
                {kw.strip().lower() for kw in raw if kw.strip().lower() not in GENERIC_KEYWORDS}
                - {kw for kw in raw if re.match(r"^[\d., -]+$", kw)}  # filter curve data
            )
    except Exception:
        pass
    return []


def update_frontmatter(md_path: Path, images: list[str], tags: list[str], cover: str | None):
    """Rewrite the YAML frontmatter in a portfolio .md file."""
    text = md_path.read_text()
    fm_match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not fm_match:
        print(f"  WARN: no frontmatter in {md_path.name}, skipping")
        return False

    body = text[fm_match.end():]
    lines = fm_match.group(1).split("\n")

    # Parse frontmatter into ordered key-value pairs (preserving scalar lines,
    # replacing multi-line list blocks for images/tags)
    result: list[str] = []
    skip_block = False
    for line in lines:
        if re.match(r"^(images|tags):", line):
            skip_block = True
            continue
        if skip_block:
            if re.match(r"^  - ", line) or line.strip() == "":
                continue
            skip_block = False
        if skip_block:
            continue
        if cover and re.match(r"^cover:", line):
            result.append(f"cover: {cover}")
            continue
        result.append(line)

    # Insert images and tags before 'featured' (or at end)
    insert_idx = len(result)
    for i, l in enumerate(result):
        if l.startswith("featured:"):
            insert_idx = i
            break

    img_lines = format_yaml_list("images", images).rstrip("\n").split("\n")
    tag_lines = format_yaml_list("tags", tags).rstrip("\n").split("\n")
    for lines_to_insert in reversed([img_lines, tag_lines]):
        for l in reversed(lines_to_insert):
            result.insert(insert_idx, l)

    new_text = "---\n" + "\n".join(result) + "\n---\n" + body
    md_path.write_text(new_text)
    return True


def format_yaml_list(key: str, items: list[str]) -> str:
    if not items:
        return f"{key}: []\n"
    lines = [f"{key}:"]
    for item in items:
        lines.append(f"  - {item}")
    return "\n".join(lines) + "\n"

# ── Main ────────────────────────────────────────────────────────────────────

def sync_category(category: str, dry_run: bool = False):
    src = SOURCES.get(category)
    if not src:
        print(f"Unknown category: {category}")
        return

    if not src.exists():
        print(f"  Source not found (SMB not mounted?): {src}")
        return

    is_gallery = category != "mood"
    dest = MEDIA_DIR / (Path("portfolio") / category if is_gallery else Path("mood"))
    dest.mkdir(parents=True, exist_ok=True)

    jpgs = sorted(f for f in src.iterdir() if f.suffix.lower() in (".jpg", ".jpeg"))
    if not jpgs:
        print(f"  No images found in {src}")
        return

    print(f"  {len(jpgs)} images → {dest.relative_to(PROJECT_ROOT)}")

    all_tags: set[str] = set()
    image_paths: list[str] = []

    for jpg in jpgs:
        target = dest / jpg.name
        prefix = f"portfolio/{category}" if is_gallery else "mood"
        web_path = f"/media/{prefix}/{jpg.name}"

        if not dry_run and (not target.exists() or target.stat().st_size != jpg.stat().st_size):
            shutil.copy2(jpg, target)

        image_paths.append(web_path)
        keywords = extract_keywords(jpg)
        all_tags.update(keywords)

    tags = sorted(all_tags)
    cover = image_paths[0] if image_paths else None

    if dry_run:
        print(f"  Tags: {tags}")
        print(f"  Cover: {cover}")
        print(f"  Images: {len(image_paths)} total")
        return

    if is_gallery:
        md_path = CONTENT_DIR / f"{category}.md"
        if md_path.exists():
            ok = update_frontmatter(md_path, image_paths, tags, cover)
            if ok:
                print(f"  Updated {md_path.relative_to(PROJECT_ROOT)} ({len(image_paths)} images, {len(tags)} tags)")
        else:
            print(f"  WARN: {md_path.name} not found — create it first")
    else:
        print(f"  Mood: {len(image_paths)} images synced (no frontmatter to update)")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry_run = "--dry-run" in sys.argv

    categories = args if args else list(SOURCES.keys())

    if dry_run:
        print("DRY RUN — no files will be copied\n")

    for cat in categories:
        print(f"[{cat}]")
        sync_category(cat, dry_run=dry_run)
        print()


if __name__ == "__main__":
    main()
