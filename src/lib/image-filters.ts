/**
 * Reusable image filtering utilities.
 * Consolidates common filtering patterns used across galleries and carousels.
 */

export interface FilterableImage {
  hidden?: boolean
  orientation?: 'portrait' | 'landscape' | 'square' | string
  hero_safe?: boolean
}

/**
 * Filter out hidden images.
 */
export function filterHidden<T extends FilterableImage>(images: T[]): T[] {
  return images.filter((img) => !img.hidden)
}

/**
 * Filter images by orientation.
 */
export function filterByOrientation<T extends FilterableImage>(
  images: T[],
  orientation: 'portrait' | 'landscape' | 'square'
): T[] {
  return images.filter((img) => img.orientation === orientation)
}

/**
 * Filter images that are safe for hero/full-bleed contexts.
 * Includes images with hero_safe=true OR portrait orientation.
 */
export function filterHeroSafe<T extends FilterableImage>(images: T[]): T[] {
  return images.filter(
    (img) => img.hero_safe === true || img.orientation === 'portrait'
  )
}

/**
 * Filter images suitable for carousel contexts.
 * Non-hidden images with portrait orientation or hero_safe flag.
 */
export function filterForCarousel<T extends FilterableImage>(images: T[]): T[] {
  return images.filter(
    (img) =>
      !img.hidden &&
      (img.orientation === 'portrait' || img.hero_safe === true)
  )
}

/**
 * Filter non-hidden portrait images.
 * Common pattern used in gallery hero slides.
 */
export function filterVisiblePortrait<T extends FilterableImage>(images: T[]): T[] {
  return images.filter((img) => !img.hidden && img.orientation === 'portrait')
}

/**
 * Deduplicate images by source path.
 */
export function deduplicateBySrc<T extends { src: string }>(images: T[]): T[] {
  const seen = new Set<string>()
  return images.filter((img) => {
    if (seen.has(img.src)) return false
    seen.add(img.src)
    return true
  })
}
