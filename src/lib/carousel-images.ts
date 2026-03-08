import { getCollection } from 'astro:content'
import fs from 'node:fs'
import path from 'node:path'

export interface CarouselImage {
  src: string
  focal_x?: number | string
  focal_y?: number | string
  /** Session identifier (date_taken) for grouping images from the same photo shoot */
  session?: string
}

/**
 * All available mood images (1-53).
 * These are lifestyle/atmosphere shots for heroes and backgrounds.
 */
const ALL_MOOD_IMAGES = Array.from({ length: 53 }, (_, i) => i + 1)

/**
 * Load mood metadata from the sync-generated JSON file.
 * Maps image numbers to their session (date_taken) values.
 */
function loadMoodMetadata(): Record<string, { session: string }> {
  try {
    const metadataPath = path.join(process.cwd(), 'public/media/mood/metadata.json')
    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Fall back to unique sessions if metadata unavailable
  }
  return {}
}

/**
 * Get ALL mood images for client-side random selection.
 * Returns all 53 mood images without any selection or shuffling.
 * The client picks which ones to display, so only selected images download.
 *
 * Note: Mood images only exist as WebP variants (no original JPGs).
 * We return the 1920w variant as it's the largest/best quality for heroes.
 * Session data comes from sync-photos.py extracted date_taken metadata.
 */
export function getAllMoodImages(): CarouselImage[] {
  const metadata = loadMoodMetadata()

  return ALL_MOOD_IMAGES.map((num) => ({
    src: `/media/mood/2026-mood-portfolio-${String(num).padStart(2, '0')}-1920w.webp`,
    focal_x: 50,
    focal_y: 40,
    // Use date_taken from metadata, fallback to unique key per image
    session: metadata[String(num)]?.session || `mood-${num}`,
  }))
}

/**
 * Get random mood images for hero/background contexts.
 * Uses stratified sampling to ensure variety - picks from different "buckets"
 * across the image range so we don't get clusters of similar images.
 *
 * Note: Mood images only exist as WebP variants (no original JPGs).
 */
export function getMoodImages(count = 3, shuffle = true): CarouselImage[] {
  const available = [...ALL_MOOD_IMAGES]

  const toCarouselImage = (num: number): CarouselImage => ({
    src: `/media/mood/2026-mood-portfolio-${String(num).padStart(2, '0')}-1920w.webp`,
    focal_x: 50,
    focal_y: 40,
  })

  if (!shuffle) {
    return available.slice(0, count).map(toCarouselImage)
  }

  // Stratified sampling: divide into buckets and pick one from each
  const bucketSize = Math.floor(available.length / count)
  const selected: number[] = []

  for (let i = 0; i < count; i++) {
    const bucketStart = i * bucketSize
    const bucketEnd = i === count - 1 ? available.length : (i + 1) * bucketSize
    const bucket = available.slice(bucketStart, bucketEnd)

    // Pick random item from this bucket
    const randomIdx = Math.floor(Math.random() * bucket.length)
    selected.push(bucket[randomIdx])
  }

  // Shuffle the final selection so order varies too
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[selected[i], selected[j]] = [selected[j], selected[i]]
  }

  return selected.map(toCarouselImage)
}

export interface GetCarouselImagesOptions {
  categories?: string[]
  count?: number
  shuffle?: boolean
  /**
   * Include portrait-only images suitable for carousel/hero contexts.
   * Filters for: orientation === 'portrait' OR hero_safe === true.
   * Defaults to true - carousels should never show landscape images.
   * Set to false ONLY for non-carousel contexts that can handle any orientation.
   */
  portraitOnly?: boolean
}

/**
 * Get ALL portrait images from specified categories for client-side random selection.
 * Returns all matching images without any count limit or shuffling.
 * Includes session (date_taken) for session-aware selection that prevents same-shoot adjacency.
 */
export async function getAllPortraitImages(
  categories?: string[]
): Promise<CarouselImage[]> {
  const portfolios = await getCollection('portfolio')

  // Filter by categories if specified
  const filtered = categories?.length
    ? portfolios.filter((p) => categories.includes(p.data.category))
    : portfolios

  // Extract all portrait/hero-safe images with session info
  return filtered.flatMap((p) =>
    (p.data.images ?? [])
      .filter((img) => {
        if (img.hidden) return false
        return img.orientation === 'portrait' || img.hero_safe === true
      })
      .map((img) => ({
        src: img.src,
        focal_x: undefined,
        focal_y: undefined,
        session: img.date_taken,
      }))
  )
}

/**
 * Auto-source carousel images from portfolio galleries.
 * Pulls non-hidden images from specified categories (or all if not specified).
 */
export async function getCarouselImages(
  options: GetCarouselImagesOptions = {}
): Promise<CarouselImage[]> {
  // portraitOnly defaults to true - carousels should never show landscape images
  const { categories, count = 8, shuffle = true, portraitOnly = true } = options

  const portfolios = await getCollection('portfolio')

  // Filter by categories if specified
  const filtered = categories?.length
    ? portfolios.filter((p) => categories.includes(p.data.category))
    : portfolios

  // Extract non-hidden images from each portfolio
  const images: CarouselImage[] = filtered.flatMap((p) =>
    (p.data.images ?? [])
      .filter((img) => {
        // Always exclude hidden images
        if (img.hidden) return false

        // Filter for portrait or hero_safe images (default behavior for carousels)
        if (portraitOnly) {
          return img.orientation === 'portrait' || img.hero_safe === true
        }

        return true
      })
      .map((img) => ({
        src: img.src,
        focal_x: undefined,
        focal_y: undefined,
      }))
  )

  // Shuffle if requested (build-time randomization)
  if (shuffle) {
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[images[i], images[j]] = [images[j], images[i]]
    }
  }

  return images.slice(0, count)
}
