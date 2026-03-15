#!/usr/bin/env python3
"""
Sync web-size photos from the SMB share into public/media/ and update
portfolio frontmatter with image paths and Lightroom keywords.

Always does a full reprocess (force mode is the default for reliability).

Usage:
    python3 scripts/sync-photos.py                   # sync all categories
    python3 scripts/sync-photos.py portraits         # sync one category
    python3 scripts/sync-photos.py --dry-run         # preview without copying
"""

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
MOOD_METADATA_PATH = MEDIA_DIR / "mood" / "metadata.json"
TESTIMONIAL_MAPPING_PATH = MEDIA_DIR / "testimonials" / "mapping.json"

# Image variant sizes for responsive srcset
VARIANT_WIDTHS = [400, 800, 1200, 1920]
WEBP_QUALITY = 80

# JPEG optimization settings
JPEG_MAX_WIDTH = 1920       # Max width for stored JPEGs (resize larger originals)
JPEG_QUALITY = 92           # High quality (92-95 is visually lossless for photos)

SOURCES = {
    "portraits": Path("/Volumes/sol/portrait-portfolio/web size"),
    "family": Path("/Volumes/sol/family-portfolio"),
    "maternity": Path("/Volumes/sol/maternity-portfolio"),
    "couples": Path("/Volumes/sol/couples-portfolio"),
    "branding": Path("/Volumes/sol/branding-portfolio/web size"),
    "events": Path("/Volumes/sol/retreat-portfolio/web size"),
    "mood": Path("/Volumes/sol/mood-portfolio"),
    "testimonials": Path("/Volumes/sol/testimonial-photos"),
    "logos": Path("/Volumes/sol/2026 logos"),
    "headshots": Path("/Volumes/sol/Laurel-headshots"),
}

# Keywords to strip — too generic to be useful as tags
GENERIC_KEYWORDS = {"portfolio", "portrait", "branding", "mood"}

# Filename sanitization: replace spaces, Unicode whitespace, and special chars with hyphens
# Prevents frontmatter/variant mismatch from filenames like "photo-23 2.14.08\u202fPM.jpg"
UNSAFE_FILENAME_CHARS = re.compile(r"[\s\u00a0\u202f\u2007\u2060]+")

# Cover tag pattern: home-{category}-cover
COVER_TAG_PATTERN = re.compile(r"^home-(\w+)-cover$", re.IGNORECASE)

# Testimonial tag pattern: testimonial-{name}
TESTIMONIAL_TAG_PATTERN = re.compile(r"^testimonial-(\w+)$", re.IGNORECASE)

# Cover tag category name mapping (tag name -> actual category name)
# Handles cases where tag name differs from folder/category name
COVER_TAG_CATEGORY_MAP = {
    "retreat": "events",
    "retreats": "events",
    "portrait": "portraits",
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def sanitize_filename(name: str) -> str:
    """
    Replace spaces and Unicode whitespace with hyphens, collapse runs.

    Lightroom sometimes exports filenames with regular spaces, narrow
    no-break spaces (U+202F), or other Unicode whitespace. These cause
    mismatches between frontmatter paths and generated WebP variant names.
    """
    sanitized = UNSAFE_FILENAME_CHARS.sub("-", name)
    # Collapse multiple consecutive hyphens
    sanitized = re.sub(r"-{2,}", "-", sanitized)
    # Remove trailing hyphens before extension
    base, ext = os.path.splitext(sanitized)
    return base.rstrip("-") + ext


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


def generate_variants(src_path: Path, dest_base: Path) -> list[str]:
    """
    Generate responsive image variants at multiple widths in WebP format.

    Args:
        src_path: Path to source JPEG
        dest_base: Base path for output (without extension)

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


def extract_cover_tag(keywords: list[str]) -> str | None:
    """Check if any keyword matches the cover tag pattern. Returns category if found."""
    for kw in keywords:
        match = COVER_TAG_PATTERN.match(kw)
        if match:
            category = match.group(1).lower()
            # Apply category name mapping (e.g., "retreat" -> "events")
            return COVER_TAG_CATEGORY_MAP.get(category, category)
    return None


def extract_testimonial_tag(keywords: list[str]) -> str | None:
    """Check if any keyword matches the testimonial tag pattern. Returns name if found."""
    for kw in keywords:
        match = TESTIMONIAL_TAG_PATTERN.match(kw)
        if match:
            return match.group(1).lower()
    return None


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


# ── Main ────────────────────────────────────────────────────────────────────

def sync_category(category: str, dry_run: bool = False, cover_tags: dict | None = None):
    """
    Sync a single category from SMB to public/media.

    Args:
        category: Category name (e.g., "portraits", "branding")
        dry_run: If True, only preview what would happen
        cover_tags: Dict mapping category -> image path for tagged covers
    """
    src = SOURCES.get(category)
    if not src:
        print(f"Unknown category: {category}")
        return {}

    if not src.exists():
        print(f"  Source not found (SMB not mounted?): {src}")
        return {}

    # Initialize return value for cover tags found in this category
    found_cover_tags = {}

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
    elif category == "testimonials":
        dest = MEDIA_DIR / "testimonials"
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
        return found_cover_tags

    print(f"  {len(files)} images -> {dest.relative_to(PROJECT_ROOT)}")

    all_tags: set[str] = set()
    image_data: list[dict] = []
    testimonial_mapping: dict[str, str] = {}  # name -> web_path

    processed = 0
    variants_generated = 0

    for f in files:
        safe_name = sanitize_filename(f.name)
        safe_stem = Path(safe_name).stem
        target = dest / safe_name
        if category == "logos":
            prefix = "site/logos"
        elif category == "headshots":
            prefix = "pages"
        elif category == "testimonials":
            prefix = "testimonials"
        elif is_gallery:
            prefix = f"portfolio/{category}"
        else:
            prefix = "mood"
        web_path = f"/media/{prefix}/{safe_name}"

        processed += 1

        if not dry_run:
            # For gallery JPEGs, we only need WebP variants (originals are 10-18MB and unused)
            # For non-gallery images (logos, mood, testimonials) or non-JPEGs, copy the original
            if not (is_gallery and f.suffix.lower() in (".jpg", ".jpeg")):
                shutil.copy2(f, target)

        # Generate responsive variants for gallery and mood images (not logos/headshots)
        if not dry_run and category not in ("logos", "headshots") and f.suffix.lower() in (".jpg", ".jpeg"):
            dest_base = dest / safe_stem
            variants = generate_variants(f, dest_base)
            variants_generated += len(variants)

        img_entry = {"src": web_path, "hidden": False}

        # Only extract metadata from JPEGs (not logos)
        if f.suffix.lower() in (".jpg", ".jpeg"):
            keywords = extract_keywords(f)

            # Check for cover tag (home-{category}-cover)
            cover_category = extract_cover_tag(keywords)
            if cover_category:
                found_cover_tags[cover_category] = web_path
                print(f"    Found cover tag: home-{cover_category}-cover -> {f.name}")

            # Check for testimonial tag
            if category == "testimonials":
                testimonial_name = extract_testimonial_tag(keywords)
                if testimonial_name:
                    testimonial_mapping[testimonial_name] = web_path
                    print(f"    Found testimonial tag: testimonial-{testimonial_name} -> {f.name}")

            # Filter out cover and testimonial tags from stored tags
            filtered_keywords = [
                kw for kw in keywords
                if not COVER_TAG_PATTERN.match(kw) and not TESTIMONIAL_TAG_PATTERN.match(kw)
            ]
            all_tags.update(filtered_keywords)

            # Extract date and hue for sorting
            img_entry["date_taken"] = extract_date_taken(f)
            img_entry["hue"] = extract_dominant_hue(f)
            # Extract dimensions and orientation for smart aspect ratio display
            dims = extract_dimensions(f)
            if dims:
                img_entry["width"], img_entry["height"], img_entry["orientation"] = dims
            # Store tags per-image for filtering
            if filtered_keywords:
                img_entry["tags"] = filtered_keywords

        image_data.append(img_entry)

    tags = sorted(all_tags)

    # Determine cover: use tagged cover if available, otherwise first image
    if cover_tags and category in cover_tags:
        cover = cover_tags[category]
        print(f"  Using tagged cover: {cover}")
    else:
        cover = image_data[0]["src"] if image_data else None

    if dry_run:
        print(f"  Would process: {processed}")
        print(f"  Tags: {tags}")
        print(f"  Cover: {cover}")
        print(f"  Images: {len(image_data)} total")
        # Show sample metadata
        if image_data and image_data[0].get("date_taken"):
            print(f"  Sample date: {image_data[0]['date_taken']}, hue: {image_data[0].get('hue')}")
        return found_cover_tags

    print(f"  Processed: {processed}")

    if is_gallery:
        md_path = CONTENT_DIR / f"{category}.md"
        if md_path.exists():
            ok = update_frontmatter(md_path, image_data, tags, cover)
            if ok:
                variant_msg = f", {variants_generated} variants" if variants_generated else ""
                print(f"  Updated {md_path.relative_to(PROJECT_ROOT)} ({len(image_data)} images, {len(tags)} tags{variant_msg})")
        else:
            print(f"  WARN: {md_path.name} not found - create it first")
    elif category == "logos":
        print(f"  Logos: {len(image_data)} files synced to {dest.relative_to(PROJECT_ROOT)}")
    elif category == "headshots":
        print(f"  Headshots: {len(image_data)} images synced to {dest.relative_to(PROJECT_ROOT)}")
    elif category == "testimonials":
        # Save testimonial mapping JSON for frontend lookup
        TESTIMONIAL_MAPPING_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(TESTIMONIAL_MAPPING_PATH, "w") as f_out:
            json.dump(testimonial_mapping, f_out, indent=2)
        print(f"  Testimonials: {len(image_data)} images synced")
        print(f"  Testimonial mapping saved: {TESTIMONIAL_MAPPING_PATH.relative_to(PROJECT_ROOT)}")
        if testimonial_mapping:
            for name, path in testimonial_mapping.items():
                print(f"    {name}: {path}")
    elif category == "mood":
        # Save mood metadata JSON for frontend session-aware selection
        mood_metadata = {}
        for img in image_data:
            # Extract image number from filename (e.g., "2026-mood-portfolio-01.jpg" -> 1)
            match = re.search(r"-(\d+)\.jpg", img["src"], re.IGNORECASE)
            if match:
                num = int(match.group(1))
                mood_metadata[str(num)] = {
                    "session": img.get("date_taken", f"unknown-{num}"),
                    "orientation": img.get("orientation", "unknown"),
                }
        MOOD_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MOOD_METADATA_PATH, "w") as f_out:
            json.dump(mood_metadata, f_out, indent=2)
        print(f"  Mood: {len(image_data)} images synced, metadata saved to {MOOD_METADATA_PATH.relative_to(PROJECT_ROOT)}")

    return found_cover_tags


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry_run = "--dry-run" in sys.argv

    categories = args if args else list(SOURCES.keys())

    if dry_run:
        print("DRY RUN - no files will be copied\n")

    # First pass: collect cover tags from all categories
    # We need to scan all images first to find cover tags before applying them
    print("=== Pass 1: Scanning for cover tags ===\n")
    all_cover_tags: dict[str, str] = {}

    for cat in categories:
        print(f"[{cat}]")
        found = sync_category(cat, dry_run=True)  # Always dry run first pass
        all_cover_tags.update(found)
        print()

    if all_cover_tags:
        print(f"Cover tags found: {all_cover_tags}\n")

    # Second pass: actually sync with cover tags applied
    print("=== Pass 2: Syncing with covers ===\n")

    for cat in categories:
        print(f"[{cat}]")
        sync_category(cat, dry_run=dry_run, cover_tags=all_cover_tags)
        print()

    print("Sync complete!")


if __name__ == "__main__":
    main()
