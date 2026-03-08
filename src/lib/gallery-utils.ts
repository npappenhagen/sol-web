import { getEntry } from 'astro:content'
import { getVariantUrl, hasVariants } from '@/lib/image-url'

/**
 * Sub-categories that redirect to portraits with filter.
 */
export const PORTRAIT_SUBCATEGORIES = ['family', 'couples', 'maternity'] as const
export type PortraitSubcategory = (typeof PORTRAIT_SUBCATEGORIES)[number]

export interface HeroSlide {
  src: string
  focal_x?: number | string
  focal_y?: number | string
  session?: string
}

export interface ImageData {
  src: string
  hidden?: boolean
  date_taken?: string
  hue?: number
  tags?: string[]
  width?: number
  height?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  category?: string
}

/**
 * Convert slide paths to WebP variants for pool JSON.
 */
export function toWebPSrc(src: string): string {
  if (src.endsWith('.webp')) return src
  return hasVariants(src) ? getVariantUrl(src, 1920) : src
}

/**
 * Process images from a collection entry into ImageData format.
 */
export function processImages(imgs: unknown[], categoryTag: string): ImageData[] {
  return (imgs ?? [])
    .filter((img: unknown) =>
      typeof img === 'string' ? true : !(img as ImageData).hidden,
    )
    .map((img: unknown) => {
      if (typeof img === 'string') {
        return { src: img, category: categoryTag }
      }
      const typed = img as ImageData
      return {
        src: typed.src,
        date_taken: typed.date_taken,
        hue: typed.hue,
        tags: typed.tags,
        width: typed.width,
        height: typed.height,
        orientation: typed.orientation,
        category: categoryTag,
      }
    })
}

interface RawImage {
  src: string
  hidden?: boolean
  orientation?: string
  date_taken?: string
  focal_x?: number | string
  focal_y?: number | string
}

/**
 * Build hero slides from gallery images based on carousel mode.
 */
export function buildHeroSlides(
  images: RawImage[] | undefined,
  heroImages: RawImage[] | undefined,
  coverSrc: string,
  coverFocalX: number | string | undefined,
  coverFocalY: number | string | undefined,
  carouselMode: 'auto' | 'manual',
  carouselCount: number
): { slides: HeroSlide[], usePreSelection: boolean } {
  if (carouselMode === 'auto' && images && images.length > 0) {
    const portraitImages = images
      .filter((img) => !img.hidden && img.orientation === 'portrait')
      .map((img) => ({
        src: toWebPSrc(img.src),
        session: img.date_taken,
      }))

    const slides = portraitImages.length > 0
      ? portraitImages
      : [{ src: toWebPSrc(coverSrc), focal_x: coverFocalX, focal_y: coverFocalY }]

    return {
      slides,
      usePreSelection: portraitImages.length > carouselCount,
    }
  }

  if (carouselMode === 'manual' && heroImages && heroImages.length > 0) {
    return {
      slides: heroImages.map((img) => ({
        src: toWebPSrc(img.src),
        focal_x: img.focal_x,
        focal_y: img.focal_y,
      })),
      usePreSelection: false,
    }
  }

  return {
    slides: [{
      src: toWebPSrc(coverSrc),
      focal_x: coverFocalX,
      focal_y: coverFocalY,
    }],
    usePreSelection: false,
  }
}

/**
 * Build subcategory hero map for portraits page.
 */
export async function buildSubcategoryHeroMap(
  defaultSlides: HeroSlide[]
): Promise<Record<string, HeroSlide[]>> {
  const heroMap: Record<string, HeroSlide[]> = {}

  for (const subcat of PORTRAIT_SUBCATEGORIES) {
    const subcatEntry = await getEntry('portfolio', subcat)
    if (subcatEntry?.data.images) {
      const portraitImages = (subcatEntry.data.images as RawImage[])
        .filter((img) => !img.hidden && img.orientation === 'portrait')
        .map((img) => ({
          src: toWebPSrc(img.src),
          session: img.date_taken,
        }))
      heroMap[subcat] = portraitImages.length > 0
        ? portraitImages
        : defaultSlides.map((s) => ({ ...s, src: toWebPSrc(s.src) }))
    }
  }

  return heroMap
}

/**
 * Load all gallery images for portraits page (base + subcategories).
 */
export async function loadPortraitsGalleryImages(
  baseImages: unknown[]
): Promise<ImageData[]> {
  let galleryImages = processImages(baseImages ?? [], 'portraits')

  for (const subcat of PORTRAIT_SUBCATEGORIES) {
    const subcatEntry = await getEntry('portfolio', subcat)
    if (subcatEntry?.data.images) {
      const subcatImages = processImages(subcatEntry.data.images, subcat)
      galleryImages = galleryImages.concat(subcatImages)
    }
  }

  return galleryImages
}
