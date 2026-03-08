#!/usr/bin/env node
/**
 * Process CMS-uploaded images: generate WebP variants and update frontmatter.
 *
 * This script is designed to run in GitHub Actions after images are uploaded
 * via Sveltia CMS. It can also be run locally via `make process-cms`.
 *
 * Usage:
 *   node scripts/process-cms-images.mjs              # process all missing variants
 *   node scripts/process-cms-images.mjs --dry-run    # preview without changes
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs"
import { basename, dirname, extname, join } from "path"
import { fileURLToPath } from "url"

// Sharp is installed on-demand in CI
let sharp
try {
  sharp = (await import("sharp")).default
} catch {
  console.error("Sharp not installed. Run: npm install sharp")
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")
const MEDIA_DIR = join(PROJECT_ROOT, "public", "media", "portfolio")
const CONTENT_DIR = join(PROJECT_ROOT, "src", "content", "portfolio")

const VARIANT_WIDTHS = [400, 800, 1200, 1920]
const WEBP_QUALITY = 80

const DRY_RUN = process.argv.includes("--dry-run")

/**
 * Find all JPEGs in portfolio directories missing the -400w.webp variant.
 */
function findUnprocessedImages() {
  const unprocessed = []

  if (!existsSync(MEDIA_DIR)) {
    console.log(`Media directory not found: ${MEDIA_DIR}`)
    return unprocessed
  }

  const categories = readdirSync(MEDIA_DIR).filter((d) => {
    const fullPath = join(MEDIA_DIR, d)
    return statSync(fullPath).isDirectory()
  })

  for (const category of categories) {
    const categoryPath = join(MEDIA_DIR, category)
    const files = readdirSync(categoryPath)

    for (const file of files) {
      const ext = extname(file).toLowerCase()
      if (ext !== ".jpg" && ext !== ".jpeg") continue

      const stem = basename(file, ext)
      const variant400 = `${stem}-400w.webp`

      if (!files.includes(variant400)) {
        unprocessed.push({
          category,
          filename: file,
          stem,
          fullPath: join(categoryPath, file),
        })
      }
    }
  }

  return unprocessed
}

/**
 * Generate WebP variants for an image.
 */
async function generateVariants(imagePath, stem, outputDir) {
  const generated = []

  try {
    const image = sharp(imagePath)
    const metadata = await image.metadata()
    const origWidth = metadata.width

    for (const width of VARIANT_WIDTHS) {
      if (width > origWidth) continue

      const variantPath = join(outputDir, `${stem}-${width}w.webp`)

      if (DRY_RUN) {
        console.log(`  Would create: ${basename(variantPath)}`)
        generated.push({ width, path: variantPath })
        continue
      }

      await sharp(imagePath)
        .resize(width)
        .webp({ quality: WEBP_QUALITY })
        .toFile(variantPath)

      generated.push({ width, path: variantPath })
      console.log(`  Created: ${basename(variantPath)}`)
    }

    return { metadata, generated }
  } catch (err) {
    console.error(`  Error processing ${basename(imagePath)}: ${err.message}`)
    return { metadata: null, generated: [] }
  }
}

/**
 * Extract dominant hue from image (simplified version).
 */
async function extractDominantHue(imagePath) {
  try {
    const { dominant } = await sharp(imagePath).resize(100, 100).stats()
    // Convert RGB to HSV and get hue
    const r = dominant.r / 255
    const g = dominant.g / 255
    const b = dominant.b / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    if (diff === 0) return 0

    let h
    if (max === r) {
      h = ((g - b) / diff) % 6
    } else if (max === g) {
      h = (b - r) / diff + 2
    } else {
      h = (r - g) / diff + 4
    }

    h = Math.round(h * 60)
    if (h < 0) h += 360

    return h
  } catch {
    return null
  }
}

/**
 * Update portfolio frontmatter with new image metadata.
 */
function updateFrontmatter(category, newImages) {
  const mdPath = join(CONTENT_DIR, `${category}.md`)
  if (!existsSync(mdPath)) {
    console.log(`  No frontmatter file: ${category}.md`)
    return
  }

  let content = readFileSync(mdPath, "utf-8")
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    console.log(`  No frontmatter in ${category}.md`)
    return
  }

  const body = content.slice(fmMatch[0].length)
  let frontmatter = fmMatch[1]

  // Parse existing images from frontmatter
  const imagesMatch = frontmatter.match(/^images:\s*\n((?:\s+-[\s\S]*?)?)(?=\n[a-z]|\n*$)/m)

  for (const img of newImages) {
    const webPath = `/media/portfolio/${category}/${img.filename}`

    // Check if image already exists in frontmatter
    if (frontmatter.includes(webPath)) {
      console.log(`  Already in frontmatter: ${img.filename}`)
      continue
    }

    // Build new image entry
    const entry = [
      `  - src: ${webPath}`,
      `    hidden: false`,
      img.dateTaken ? `    date_taken: "${img.dateTaken}"` : null,
      img.hue !== null ? `    hue: ${img.hue}` : null,
      img.width ? `    width: ${img.width}` : null,
      img.height ? `    height: ${img.height}` : null,
      img.orientation ? `    orientation: ${img.orientation}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    // Insert at end of images list
    if (imagesMatch) {
      const insertPoint = frontmatter.indexOf("images:") + "images:".length
      const afterImages = frontmatter.slice(insertPoint)
      const endOfImages = afterImages.search(/\n[a-z]/)

      if (endOfImages === -1) {
        frontmatter = frontmatter + "\n" + entry
      } else {
        const before = frontmatter.slice(0, insertPoint + endOfImages)
        const after = frontmatter.slice(insertPoint + endOfImages)
        frontmatter = before + "\n" + entry + after
      }
    } else {
      // No images block exists, create one
      frontmatter = frontmatter + "\nimages:\n" + entry
    }

    console.log(`  Added to frontmatter: ${img.filename}`)
  }

  if (!DRY_RUN) {
    writeFileSync(mdPath, `---\n${frontmatter}\n---${body}`)
  }
}

/**
 * Main processing function.
 */
async function main() {
  console.log("Scanning for unprocessed CMS images...\n")

  const unprocessed = findUnprocessedImages()

  if (unprocessed.length === 0) {
    console.log("All images have variants. Nothing to process.")
    return
  }

  console.log(`Found ${unprocessed.length} images needing variants:\n`)

  // Group by category
  const byCategory = {}
  for (const img of unprocessed) {
    if (!byCategory[img.category]) {
      byCategory[img.category] = []
    }
    byCategory[img.category].push(img)
  }

  // Process each category
  for (const [category, images] of Object.entries(byCategory)) {
    console.log(`[${category}]`)

    const processedImages = []

    for (const img of images) {
      console.log(`  Processing: ${img.filename}`)

      const { metadata, generated } = await generateVariants(
        img.fullPath,
        img.stem,
        dirname(img.fullPath)
      )

      if (generated.length > 0 && metadata) {
        const hue = await extractDominantHue(img.fullPath)
        const ratio = metadata.width / metadata.height

        processedImages.push({
          filename: img.filename,
          width: metadata.width,
          height: metadata.height,
          orientation: ratio > 1.1 ? "landscape" : ratio < 0.9 ? "portrait" : "square",
          hue,
          dateTaken: null, // EXIF extraction would require exif-reader
        })
      }
    }

    // Update frontmatter with new images
    if (processedImages.length > 0) {
      updateFrontmatter(category, processedImages)
    }

    console.log()
  }

  if (DRY_RUN) {
    console.log("DRY RUN complete. No files were modified.")
  } else {
    console.log("Processing complete.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
