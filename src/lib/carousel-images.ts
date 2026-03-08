import { getCollection } from 'astro:content'

export interface CarouselImage {
  src: string
  focal_x?: number | string
  focal_y?: number | string
}

/**
 * All available mood images (1-53).
 * These are lifestyle/atmosphere shots for heroes and backgrounds.
 */
const ALL_MOOD_IMAGES = Array.from({ length: 53 }, (_, i) => i + 1)

/**
 * Get random mood images for hero/background contexts.
 * Uses stratified sampling to ensure variety - picks from different "buckets"
 * across the image range so we don't get clusters of similar images.
 */
export function getMoodImages(count = 3, shuffle = true): CarouselImage[] {
  const available = [...ALL_MOOD_IMAGES]

  if (!shuffle) {
    return available.slice(0, count).map((num) => ({
      src: `/media/mood/2026-mood-portfolio-${String(num).padStart(2, '0')}.jpg`,
      focal_x: 50,
      focal_y: 40,
    }))
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

  return selected.map((num) => ({
    src: `/media/mood/2026-mood-portfolio-${String(num).padStart(2, '0')}.jpg`,
    focal_x: 50,
    focal_y: 40,
  }))
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
