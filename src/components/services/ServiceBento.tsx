import { useState, useEffect, useRef, useCallback } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { getVariantUrl, hasVariants } from '@/lib/image-url'

interface Props {
  images: CarouselImage[]
  portfolioSlug: string
}

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

const IMAGES_PER_MODULE = 5
const LINK_HEIGHT = 44 // Height of "View full gallery" link

/**
 * Desktop bento grid that matches sibling content height.
 * Measures the adjacent content column and constrains itself to match.
 */
export default function ServiceBento({ images, portfolioSlug }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState<number | null>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(false)

  // Measure sibling content column and match its height
  const measureAndSetHeight = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // Find the parent grid, then the sibling content column
    const gridParent = wrapper.closest('.grid')
    if (!gridParent) return

    const columns = gridParent.children
    let contentColumn: Element | null = null

    for (const col of columns) {
      if (!col.contains(wrapper)) {
        contentColumn = col
        break
      }
    }

    if (contentColumn) {
      const contentHeight = contentColumn.getBoundingClientRect().height
      // Account for the "View full gallery" link height
      const bentoHeight = Math.max(300, contentHeight - LINK_HEIGHT)
      setContainerHeight(bentoHeight)
    }
  }, [])

  // Measure on mount and resize
  useEffect(() => {
    measureAndSetHeight()

    // Re-measure on resize
    const handleResize = () => measureAndSetHeight()
    window.addEventListener('resize', handleResize)

    // Also observe for layout shifts
    const observer = new ResizeObserver(measureAndSetHeight)
    const gridParent = wrapperRef.current?.closest('.grid')
    if (gridParent) {
      observer.observe(gridParent)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [measureAndSetHeight])

  // Check scroll state
  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer || containerHeight === null) return

    const checkScroll = () => {
      const hasOverflow = scrollContainer.scrollHeight > scrollContainer.clientHeight
      setCanScroll(hasOverflow)

      const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10
      setIsAtBottom(atBottom)
    }

    checkScroll()
    scrollContainer.addEventListener('scroll', checkScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', checkScroll)
  }, [containerHeight, images])

  if (images.length === 0) return null

  // Build modules from images
  const modules: CarouselImage[][] = []
  for (let i = 0; i < images.length; i += IMAGES_PER_MODULE) {
    const moduleImages = images.slice(i, i + IMAGES_PER_MODULE)
    if (moduleImages.length >= 2) {
      modules.push(moduleImages)
    }
  }

  return (
    <div ref={wrapperRef} className="flex flex-col">
      {/* Scrollable container - height matched to sibling */}
      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-lg bento-scroll relative"
        style={{ height: containerHeight ? `${containerHeight}px` : 'auto' }}
      >
        <div className="space-y-3 p-1">
          {modules.map((moduleImages, idx) => (
            <BentoModule
              key={idx}
              images={moduleImages}
              portfolioSlug={portfolioSlug}
              moduleIndex={idx}
            />
          ))}
        </div>

        {/* Bottom fade - shows when there's more to scroll */}
        {canScroll && !isAtBottom && (
          <div className="sticky bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--sol-cream)] to-transparent pointer-events-none" />
        )}
      </div>

      {/* "View full gallery" link - always visible */}
      <a
        href={`/portfolio/${portfolioSlug}`}
        className="block text-center py-3 text-sm font-sans tracking-wide text-[var(--sol-charcoal)]/50 hover:text-[var(--sol-caramel)] transition-colors flex-shrink-0"
      >
        View full gallery →
      </a>

      <style>{`
        .bento-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .bento-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .bento-scroll::-webkit-scrollbar-thumb {
          background: var(--sol-sage);
          border-radius: 2px;
        }
        .bento-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--sol-caramel);
        }
        .bento-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--sol-sage) transparent;
        }
      `}</style>
    </div>
  )
}
