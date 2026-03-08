import { useState, useEffect, useRef } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { getVariantUrl, hasVariants } from '@/lib/image-url'

interface Props {
  images: CarouselImage[]
  portfolioSlug: string
  isEven?: boolean
}

// Each bento module: 1 hero + 4 grid = 5 images
const IMAGES_PER_MODULE = 5
const INITIAL_MODULES = 1
const LOAD_THRESHOLD = 400 // px from bottom to trigger load

function getObjPos(img: CarouselImage): string {
  const x = img.focal_x != null ? Number(img.focal_x) : 50
  const y = img.focal_y != null ? Number(img.focal_y) : 30
  return `${x}% ${y}%`
}

function getImageSrc(src: string, isHero = false): string {
  const width = isHero ? 1200 : 800
  return hasVariants(src) ? getVariantUrl(src, width) : src
}

/**
 * Bento module component - 1 hero + 4 grid images
 */
function BentoModule({
  images,
  portfolioSlug,
  moduleIndex,
}: {
  images: CarouselImage[]
  portfolioSlug: string
  moduleIndex: number
}) {
  const [heroImage, ...gridImages] = images

  return (
    <div className="service-bento-grid">
      {/* Hero image - spans full width */}
      <a
        href={`/portfolio/${portfolioSlug}`}
        className="relative overflow-hidden bg-[var(--sol-sage)]/10 group"
      >
        <img
          src={getImageSrc(heroImage.src, true)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          style={{ objectPosition: getObjPos(heroImage) }}
          loading={moduleIndex === 0 ? 'eager' : 'lazy'}
          decoding={moduleIndex === 0 ? 'sync' : 'async'}
        />
        <div className="absolute inset-0 bg-[var(--sol-charcoal)]/0 group-hover:bg-[var(--sol-charcoal)]/10 transition-colors duration-500" />
      </a>

      {/* Grid images - 2x2 layout */}
      {gridImages.map((img, idx) => (
        <a
          key={`${img.src}-${idx}`}
          href={`/portfolio/${portfolioSlug}`}
          className="relative overflow-hidden bg-[var(--sol-sage)]/10 group"
        >
          <img
            src={getImageSrc(img.src)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            style={{ objectPosition: getObjPos(img) }}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[var(--sol-charcoal)]/0 group-hover:bg-[var(--sol-charcoal)]/10 transition-colors duration-500" />
        </a>
      ))}
    </div>
  )
}

/**
 * Desktop bento grid with contained scroll for services page.
 * Each module: 1 large hero + 4 smaller grid images
 * Contained scroll area - user can explore more if they want, or scroll past.
 * All images link to the portfolio gallery.
 */
export default function ServiceBento({ images, portfolioSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Calculate total possible modules
  const totalModules = Math.ceil(images.length / IMAGES_PER_MODULE)

  // Progressive loading state
  const [visibleModules, setVisibleModules] = useState(INITIAL_MODULES)
  const hasMore = visibleModules < totalModules

  // Slice images into modules
  const modules: CarouselImage[][] = []
  for (let i = 0; i < visibleModules; i++) {
    const start = i * IMAGES_PER_MODULE
    const end = start + IMAGES_PER_MODULE
    const moduleImages = images.slice(start, end)
    // Only add module if it has at least 2 images (hero + 1 grid)
    if (moduleImages.length >= 2) {
      modules.push(moduleImages)
    }
  }

  // IntersectionObserver for loading more modules (within container)
  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = containerRef.current
    if (!sentinel || !container || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleModules(prev => Math.min(prev + 1, totalModules))
        }
      },
      {
        root: container, // Observe within the container, not the viewport
        rootMargin: `${LOAD_THRESHOLD}px`
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, totalModules])

  if (images.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="max-h-[80vh] overflow-y-auto scrollbar-hide rounded-sm"
    >
      <div className="space-y-4">
        {modules.map((moduleImages, idx) => (
          <BentoModule
            key={idx}
            images={moduleImages}
            portfolioSlug={portfolioSlug}
            moduleIndex={idx}
          />
        ))}

        {/* Sentinel for loading more modules */}
        {hasMore && (
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
