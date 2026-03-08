#!/usr/bin/env python3
"""
Sync web-size photos from the SMB share into public/media/ and update
portfolio frontmatter with image paths and Lightroom keywords.

Uses content-addressable hashing for incremental syncs - only processes
images that have actually changed.

Usage:
    python3 scripts/sync-photos.py                   # sync all categories
    python3 scripts/sync-photos.py portraits         # sync one category
    python3 scripts/sync-photos.py --dry-run         # preview without copying
    python3 scripts/sync-photos.py --force           # ignore manifest, reprocess all
    python3 scripts/sync-photos.py --cleanup         # remove orphaned images
"""

import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip3 install Pillow")

# ── Config ──────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = PROJECT_ROOT / "public" / "media"
CONTENT_DIR = PROJECT_ROOT / "src" / "content" / "portfolio"
MANIFEST_PATH = MEDIA_DIR / ".manifest.json"

# Image variant sizes for responsive srcset
VARIANT_WIDTHS = [400, 800, 1200, 1920]
WEBP_QUALITY = 80

SOURCES = {
    "portraits": Path("/Volumes/sol/portrait-portfolio/web size"),
    "family": Path("/Volumes/sol/family-portfolio"),
    "maternity": Path("/Volumes/sol/maternity-portfolio"),
    "couples": Path("/Volumes/sol/couples-portfolio"),
    "branding": Path("/Volumes/sol/branding-portfolio/web size"),
    "events": Path("/Volumes/sol/retreat-portfolio/web size"),
    "mood": Path("/Volumes/sol/mood-portfolio"),
    "logos": Path("/Volumes/sol/2026 logos"),
    "headshots": Path("/Volumes/sol/Laurel-headshots"),
}

# Keywords to strip — too generic to be useful as tags
GENERIC_KEYWORDS = {"portfolio", "portrait", "branding", "mood"}

# ── Manifest ────────────────────────────────────────────────────────────────

def load_manifest() -> dict:
    """Load the manifest file, or return empty structure if not exists."""
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            print("  WARN: Manifest corrupted, rebuilding")
    return {"version": 1, "images": {}}


def save_manifest(manifest: dict):
    """Save the manifest to disk."""
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)


def compute_file_hash(filepath: Path, sample_size: int = 65536) -> str:
    """
    Hash using file header + trailer for speed on large JPEGs.
    Includes file size to catch truncation.
    """
    hasher = hashlib.sha256()
    size = filepath.stat().st_size
    with open(filepath, "rb") as f:
        hasher.update(f.read(sample_size))
        if size > sample_size * 2:
            f.seek(-sample_size, 2)
            hasher.update(f.read(sample_size))
        hasher.update(str(size).encode())
    return f"sha256:{hasher.hexdigest()[:16]}"


# ── Helpers ─────────────────────────────────────────────────────────────────

def extract_dimensions(filepath: Path) -> tuple[int, int, str] | None:
    """Extract width, height, and orientation from image."""
    try:
        img = Image.open(filepath)
        width, height = img.size

        # Determine orientation based on aspect ratio
        ratio = width / height
        if ratio > 1.1:
            orientation = "landscape"
        elif ratio < 0.9:
            orientation = "portrait"
        else:
            orientation = "square"

        return width, height, orientation
    except Exception:
        pass
    return None


def extract_date_taken(filepath: Path) -> str | None:
    """Extract EXIF DateTimeOriginal from JPEG, return as YYYY-MM-DD."""
    try:
        img = Image.open(filepath)
        exif = img._getexif()
        if exif:
            # 36867 = DateTimeOriginal
            date_str = exif.get(36867) or exif.get(306)  # fallback to DateTime
            if date_str:
                # Format: "2026:01:15 14:30:00" -> "2026-01-15"
                date_part = date_str.split(" ")[0]
                return date_part.replace(":", "-")
    except Exception:
        pass
    return None


def extract_dominant_hue(filepath: Path) -> int | None:
    """Extract dominant hue (0-360) from image by sampling center region."""
    try:
        img = Image.open(filepath)
        # Resize to speed up processing
        img = img.resize((100, 100))
        img = img.convert("RGB")

        # Sample center region
        pixels = list(img.getdata())
        if not pixels:
            return None

        # Convert to HSV and find most common hue
        from colorsys import rgb_to_hsv
        hues = []
        for r, g, b in pixels:
            h, s, v = rgb_to_hsv(r / 255, g / 255, b / 255)
            # Only consider saturated, non-dark pixels
            if s > 0.15 and v > 0.15:
                hues.append(int(h * 360))

        if not hues:
            return None

        # Return median hue
        hues.sort()
        return hues[len(hues) // 2]
    except Exception:
        pass
    return None


def generate_variants(src_path: Path, dest_base: Path, force: bool = False) -> list[str]:
    """
    Generate responsive image variants at multiple widths in WebP format.

    Args:
        src_path: Path to source JPEG
        dest_base: Base path for output (without extension)
        force: If True, regenerate even if variants exist

    Returns:
        List of generated variant filenames
    """
    generated = []

    try:
        img = Image.open(src_path)
        orig_width, orig_height = img.size

        for width in VARIANT_WIDTHS:
            # Skip if variant would be larger than original
            if width > orig_width:
                continue

            variant_path = dest_base.parent / f"{dest_base.stem}-{width}w.webp"

            # Skip if variant exists and is newer than source (unless force)
            if not force and variant_path.exists():
                if variant_path.stat().st_mtime >= src_path.stat().st_mtime:
                    continue

            # Calculate new height maintaining aspect ratio
            ratio = width / orig_width
            height = int(orig_height * ratio)

            # Resize using high-quality Lanczos filter
            resized = img.resize((width, height), Image.Resampling.LANCZOS)

            # Convert to RGB if necessary (WebP doesn't support all modes)
            if resized.mode in ('RGBA', 'P'):
                resized = resized.convert('RGB')

            # Save as WebP
            resized.save(variant_path, 'WEBP', quality=WEBP_QUALITY, method=6)
            generated.append(variant_path.name)

    except Exception as e:
        print(f"    WARN: Failed to generate variants for {src_path.name}: {e}")

    return generated


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


def parse_existing_images(lines: list[str]) -> dict[str, bool]:
    """Extract image paths and their hidden state from existing frontmatter."""
    out: dict[str, bool] = {}
    in_images = False
    current_src: str | None = None
    for line in lines:
        if re.match(r"^images:", line):
            in_images = True
            continue
        if in_images:
            if m := re.match(r"^\s+-\s+src:\s+(.+)", line):
                current_src = m.group(1).strip()
                out[current_src] = False
            elif (m := re.match(r"^\s+hidden:\s+(true|false)", line)) and current_src:
                out[current_src] = m.group(1).lower() == "true"
                current_src = None
            elif re.match(r"^\s+-\s+/media/", line):
                # Legacy: bare string path
                path = line.strip().lstrip("- ").strip()
                out[path] = False
                current_src = None
            elif line.strip() and not line.startswith("  "):
                break
    return out


def update_frontmatter(
    md_path: Path,
    image_data: list[dict],
    tags: list[str],
    cover: str | None,
):
    """Rewrite the YAML frontmatter in a portfolio .md file."""
    text = md_path.read_text()
    fm_match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not fm_match:
        print(f"  WARN: no frontmatter in {md_path.name}, skipping")
        return False

    body = text[fm_match.end():]
    lines = fm_match.group(1).split("\n")
    existing_hidden = parse_existing_images(lines)

    # Build image objects: preserve hidden state for existing paths, add new metadata
    image_objects = []
    for img in image_data:
        obj = {
            "src": img["src"],
            "hidden": existing_hidden.get(img["src"], img.get("hidden", False)),
        }
        if img.get("date_taken"):
            obj["date_taken"] = img["date_taken"]
        if img.get("hue") is not None:
            obj["hue"] = img["hue"]
        if img.get("width") is not None:
            obj["width"] = img["width"]
        if img.get("height") is not None:
            obj["height"] = img["height"]
        if img.get("orientation"):
            obj["orientation"] = img["orientation"]
        if img.get("tags"):
            obj["tags"] = img["tags"]
        image_objects.append(obj)

    result: list[str] = []
    skip_block = False
    for line in lines:
        if re.match(r"^(images|tags):", line):
            skip_block = True
            continue
        if skip_block:
            if re.match(r"^  - ", line) or re.match(r"^    ", line) or line.strip() == "":
                continue
            skip_block = False
        if skip_block:
            continue
        if cover and re.match(r"^cover:", line):
            result.append(f"cover: {cover}")
            continue
        result.append(line)

    insert_idx = len(result)
    for i, l in enumerate(result):
        if l.startswith("featured:"):
            insert_idx = i
            break

    img_lines = format_images_yaml(image_objects).rstrip("\n").split("\n")
    tag_lines = format_yaml_list("tags", tags).rstrip("\n").split("\n")
    for lines_to_insert in reversed([img_lines, tag_lines]):
        for l in reversed(lines_to_insert):
            result.insert(insert_idx, l)

    new_text = "---\n" + "\n".join(result) + "\n---\n" + body
    md_path.write_text(new_text)
    return True


def format_images_yaml(images: list[dict]) -> str:
    """Format images as { src, hidden, date_taken, hue, width, height, orientation, tags } objects for YAML."""
    if not images:
        return "images: []\n"
    lines = ["images:"]
    for obj in images:
        lines.append(f"  - src: {obj['src']}")
        lines.append(f"    hidden: {str(obj['hidden']).lower()}")
        if obj.get("date_taken"):
            lines.append(f"    date_taken: \"{obj['date_taken']}\"")
        if obj.get("hue") is not None:
            lines.append(f"    hue: {obj['hue']}")
        if obj.get("width") is not None:
            lines.append(f"    width: {obj['width']}")
        if obj.get("height") is not None:
            lines.append(f"    height: {obj['height']}")
        if obj.get("orientation"):
            lines.append(f"    orientation: {obj['orientation']}")
        if obj.get("tags"):
            lines.append("    tags:")
            for tag in obj["tags"]:
                lines.append(f"      - {tag}")
    return "\n".join(lines) + "\n"


def format_yaml_list(key: str, items: list[str]) -> str:
    if not items:
        return f"{key}: []\n"
    lines = [f"{key}:"]
    for item in items:
        lines.append(f"  - {item}")
    return "\n".join(lines) + "\n"


# ── Cleanup ─────────────────────────────────────────────────────────────────

def cleanup_orphans(manifest: dict, dry_run: bool = False) -> int:
    """
    Remove images from manifest and disk where source no longer exists.
    Also removes orphaned images from portfolio frontmatter.

    Returns count of removed images.
    """
    # Safety check: ensure at least one source directory is accessible
    # to prevent accidental deletion when SMB is unmounted
    sources_accessible = sum(1 for src in SOURCES.values() if src.exists())
    if sources_accessible == 0:
        print("  ERROR: No source directories accessible (SMB not mounted?)")
        print("  Aborting cleanup to prevent accidental data loss.")
        return 0

    removed = 0
    orphans_by_category: dict[str, list[str]] = {}

    to_remove = []
    for web_path, entry in manifest.get("images", {}).items():
        source_path = Path(entry.get("source_path", ""))
        # Only mark as orphan if the parent directory exists but the file doesn't
        # This prevents false positives when SMB is partially mounted
        if source_path.parent.exists() and not source_path.exists():
            to_remove.append(web_path)

            # Track by category for frontmatter cleanup
            # web_path looks like /media/portfolio/portraits/file.jpg
            parts = web_path.split("/")
            if len(parts) >= 4 and parts[2] == "portfolio":
                category = parts[3]
                if category not in orphans_by_category:
                    orphans_by_category[category] = []
                orphans_by_category[category].append(web_path)

    for web_path in to_remove:
        # Convert web path to filesystem path
        # /media/portfolio/portraits/file.jpg -> public/media/portfolio/portraits/file.jpg
        fs_path = PROJECT_ROOT / "public" / web_path.lstrip("/")

        if dry_run:
            print(f"  Would remove: {web_path}")
        else:
            # Remove the JPEG
            if fs_path.exists():
                fs_path.unlink()
                print(f"  Removed: {fs_path.name}")

            # Remove WebP variants
            stem = fs_path.stem
            parent = fs_path.parent
            for width in VARIANT_WIDTHS:
                variant = parent / f"{stem}-{width}w.webp"
                if variant.exists():
                    variant.unlink()
                    print(f"  Removed variant: {variant.name}")

            # Remove from manifest
            del manifest["images"][web_path]

        removed += 1

    # Update frontmatter to remove orphaned images
    if not dry_run and orphans_by_category:
        for category, orphan_paths in orphans_by_category.items():
            md_path = CONTENT_DIR / f"{category}.md"
            if md_path.exists():
                remove_images_from_frontmatter(md_path, orphan_paths)

    return removed


def remove_images_from_frontmatter(md_path: Path, orphan_paths: list[str]):
    """Remove specific image paths from a portfolio .md frontmatter."""
    text = md_path.read_text()
    fm_match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not fm_match:
        return

    body = text[fm_match.end():]
    lines = fm_match.group(1).split("\n")
    orphan_set = set(orphan_paths)

    result = []
    skip_until_next_item = False
    in_images = False

    for line in lines:
        if re.match(r"^images:", line):
            in_images = True
            result.append(line)
            continue

        if in_images:
            # Check if this is a new image entry
            if m := re.match(r"^\s+-\s+src:\s+(.+)", line):
                src = m.group(1).strip()
                if src in orphan_set:
                    skip_until_next_item = True
                    continue
                else:
                    skip_until_next_item = False
            elif re.match(r"^\s+-\s+/media/", line):
                # Legacy bare path format
                path = line.strip().lstrip("- ").strip()
                if path in orphan_set:
                    continue
            elif skip_until_next_item:
                # Skip properties of the orphaned image
                if re.match(r"^\s{4,}", line):
                    continue
                else:
                    skip_until_next_item = False

            # End of images block
            if line.strip() and not line.startswith("  ") and not re.match(r"^images:", line):
                in_images = False

        if not skip_until_next_item:
            result.append(line)

    new_text = "---\n" + "\n".join(result) + "\n---\n" + body
    md_path.write_text(new_text)
    print(f"  Updated frontmatter: {md_path.name} (removed {len(orphan_paths)} orphans)")


# ── Main ────────────────────────────────────────────────────────────────────

def sync_category(category: str, manifest: dict, dry_run: bool = False, force: bool = False):
    src = SOURCES.get(category)
    if not src:
        print(f"Unknown category: {category}")
        return

    if not src.exists():
        print(f"  Source not found (SMB not mounted?): {src}")
        return

    # Determine destination and whether this is a gallery with frontmatter
    if category == "logos":
        dest = MEDIA_DIR / "site" / "logos"
        is_gallery = False
    elif category == "mood":
        dest = MEDIA_DIR / "mood"
        is_gallery = False
    elif category == "headshots":
        dest = MEDIA_DIR / "pages"
        is_gallery = False
    else:
        dest = MEDIA_DIR / "portfolio" / category
        is_gallery = True
    dest.mkdir(parents=True, exist_ok=True)

    # Logos support PNG; everything else is JPG only
    exts = (".png", ".jpg", ".jpeg") if category == "logos" else (".jpg", ".jpeg")
    files = sorted(f for f in src.iterdir() if f.suffix.lower() in exts)
    if not files:
        print(f"  No images found in {src}")
        # Still update frontmatter to reflect empty state for galleries
        if is_gallery and not dry_run:
            md_path = CONTENT_DIR / f"{category}.md"
            if md_path.exists():
                ok = update_frontmatter(md_path, [], [], None)
                if ok:
                    print(f"  Cleared images from {md_path.relative_to(PROJECT_ROOT)}")
        return

    print(f"  {len(files)} images → {dest.relative_to(PROJECT_ROOT)}")

    all_tags: set[str] = set()
    image_data: list[dict] = []

    processed = 0
    skipped = 0
    variants_generated = 0

    for f in files:
        target = dest / f.name
        if category == "logos":
            prefix = "site/logos"
        elif category == "headshots":
            prefix = "pages"
        elif is_gallery:
            prefix = f"portfolio/{category}"
        else:
            prefix = "mood"
        web_path = f"/media/{prefix}/{f.name}"

        # Check manifest for hash match
        source_hash = compute_file_hash(f)
        manifest_entry = manifest.get("images", {}).get(web_path, {})

        needs_processing = force or manifest_entry.get("content_hash") != source_hash

        if not needs_processing:
            skipped += 1
            # Still need to collect image data for frontmatter
            img_entry = {"src": web_path, "hidden": False}
            if f.suffix.lower() in (".jpg", ".jpeg"):
                # Read cached metadata from manifest if available
                if manifest_entry.get("width"):
                    img_entry["width"] = manifest_entry["width"]
                    img_entry["height"] = manifest_entry["height"]
                    img_entry["orientation"] = manifest_entry.get("orientation")
                if manifest_entry.get("date_taken"):
                    img_entry["date_taken"] = manifest_entry["date_taken"]
                if manifest_entry.get("hue") is not None:
                    img_entry["hue"] = manifest_entry["hue"]
                if manifest_entry.get("tags"):
                    img_entry["tags"] = manifest_entry["tags"]
                    all_tags.update(manifest_entry["tags"])
            image_data.append(img_entry)
            continue

        processed += 1

        if not dry_run:
            shutil.copy2(f, target)

        # Generate responsive variants for gallery images (not logos)
        if not dry_run and is_gallery and f.suffix.lower() in (".jpg", ".jpeg"):
            dest_base = dest / f.stem
            variants = generate_variants(f, dest_base, force=force)
            variants_generated += len(variants)

        img_entry = {"src": web_path, "hidden": False}

        # Only extract metadata from JPEGs (not logos)
        if f.suffix.lower() in (".jpg", ".jpeg"):
            keywords = extract_keywords(f)
            all_tags.update(keywords)
            # Extract date and hue for sorting
            img_entry["date_taken"] = extract_date_taken(f)
            img_entry["hue"] = extract_dominant_hue(f)
            # Extract dimensions and orientation for smart aspect ratio display
            dims = extract_dimensions(f)
            if dims:
                img_entry["width"], img_entry["height"], img_entry["orientation"] = dims
            # Store tags per-image for filtering
            if keywords:
                img_entry["tags"] = keywords

        image_data.append(img_entry)

        # Update manifest
        if not dry_run:
            manifest.setdefault("images", {})[web_path] = {
                "content_hash": source_hash,
                "source_path": str(f),
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "variants": [f"{w}w" for w in VARIANT_WIDTHS if w <= (img_entry.get("width") or 9999)],
                "width": img_entry.get("width"),
                "height": img_entry.get("height"),
                "orientation": img_entry.get("orientation"),
                "date_taken": img_entry.get("date_taken"),
                "hue": img_entry.get("hue"),
                "tags": img_entry.get("tags", []),
            }

    tags = sorted(all_tags)
    cover = image_data[0]["src"] if image_data else None

    if dry_run:
        print(f"  Would process: {processed}, skip unchanged: {skipped}")
        print(f"  Tags: {tags}")
        print(f"  Cover: {cover}")
        print(f"  Images: {len(image_data)} total")
        # Show sample metadata
        if image_data and image_data[0].get("date_taken"):
            print(f"  Sample date: {image_data[0]['date_taken']}, hue: {image_data[0].get('hue')}")
        return

    print(f"  Processed: {processed}, skipped unchanged: {skipped}")

    if is_gallery:
        md_path = CONTENT_DIR / f"{category}.md"
        if md_path.exists():
            ok = update_frontmatter(md_path, image_data, tags, cover)
            if ok:
                variant_msg = f", {variants_generated} variants" if variants_generated else ""
                print(f"  Updated {md_path.relative_to(PROJECT_ROOT)} ({len(image_data)} images, {len(tags)} tags{variant_msg})")
        else:
            print(f"  WARN: {md_path.name} not found — create it first")
    elif category == "logos":
        print(f"  Logos: {len(image_data)} files synced to {dest.relative_to(PROJECT_ROOT)}")
    elif category == "headshots":
        print(f"  Headshots: {len(image_data)} images synced to {dest.relative_to(PROJECT_ROOT)}")
    else:
        print(f"  Mood: {len(image_data)} images synced (no frontmatter to update)")


def count_orphans(manifest: dict) -> int:
    """Count orphaned images (source deleted but still in manifest)."""
    count = 0
    for web_path, entry in manifest.get("images", {}).items():
        source_path = Path(entry.get("source_path", ""))
        if source_path.parent.exists() and not source_path.exists():
            count += 1
    return count


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    cleanup = "--cleanup" in sys.argv

    categories = args if args else list(SOURCES.keys())

    if dry_run:
        print("DRY RUN — no files will be copied\n")
    if force:
        print("FORCE MODE — ignoring manifest, reprocessing all\n")

    # Load manifest
    manifest = load_manifest() if not force else {"version": 1, "images": {}}

    # Handle cleanup mode
    if cleanup:
        print("[cleanup]")
        removed = cleanup_orphans(manifest, dry_run=dry_run)
        if removed:
            print(f"  Removed {removed} orphaned images")
            if not dry_run:
                save_manifest(manifest)
        else:
            print("  No orphans found")
        print()
        return

    for cat in categories:
        print(f"[{cat}]")
        sync_category(cat, manifest, dry_run=dry_run, force=force)
        print()

    # Save manifest
    if not dry_run:
        save_manifest(manifest)
        print(f"Manifest saved: {MANIFEST_PATH.relative_to(PROJECT_ROOT)}")

    # Check for orphans and warn user
    orphan_count = count_orphans(manifest)
    if orphan_count > 0:
        print(f"\n⚠️  {orphan_count} orphaned images detected (source deleted, still in manifest)")
        print("   Run 'make sync-cleanup' to remove them")


if __name__ == "__main__":
    main()
