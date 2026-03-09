import { useRef, useState, useEffect, useCallback } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { getVariantUrl, hasVariants } from '@/lib/image-url'
import { CAROUSEL_CONFIG } from '@/lib/constants'

interface Props {
  images: CarouselImage[]
  name: string
  portfolioSlug?: string
}

const { INITIAL_COUNT, BATCH_SIZE, LOAD_THRESHOLD } = CAROUSEL_CONFIG

function getObjPos(img: CarouselImage): string {
  const x = img.focal_x != null ? Number(img.focal_x) : 50
  const y = img.focal_y != null ? Number(img.focal_y) : 30
  return `${x}% ${y}%`
}

function getImageSrc(src: string): string {
  // Carousel thumbnails display at ~180-300px wide, so 400w gives crisp 2x DPR
  return hasVariants(src) ? getVariantUrl(src, 400) : src
}

export default function ServiceCarousel({ images, name, portfolioSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const dragStartX = useRef(0)
  const scrollStartX = useRef(0)

  // Fade-in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Progressive loading state
  const [visibleCount, setVisibleCount] = useState(Math.min(INITIAL_COUNT, images.length))
  const visibleImages = images.slice(0, visibleCount)
  const hasMore = visibleCount < images.length

  // Load more images when scrolled near the end
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || !hasMore) return

    const nearEnd = container.scrollLeft + container.clientWidth >
                    container.scrollWidth - LOAD_THRESHOLD

    if (nearEnd) {
      setVisibleCount(prev => Math.min(prev + BATCH_SIZE, images.length))
    }
  }, [hasMore, images.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    scrollStartX.current = containerRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const dx = e.clientX - dragStartX.current
    containerRef.current.scrollLeft = scrollStartX.current - dx
  }

  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => isDragging && setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return
    dragStartX.current = e.touches[0].clientX
    scrollStartX.current = containerRef.current.scrollLeft
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return
    const dx = e.touches[0].clientX - dragStartX.current
    containerRef.current.scrollLeft = scrollStartX.current - dx
  }

  if (images.length === 0) return null

  return (
    <div
      className="relative group/carousel"
      style={{
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.7s ease-out',
      }}
    >
      {/* Left edge fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--sol-cream)] to-transparent opacity-60 pointer-events-none z-10"
      />
      {/* Right edge fade - stronger when more content available */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--sol-cream)] to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
          hasMore ? 'opacity-80' : 'opacity-40'
        }`}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="flex gap-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {visibleImages.map((img, idx) => (
          <a
            key={`${img.src}-${idx}`}
            href={portfolioSlug ? `/portfolio/${portfolioSlug}` : undefined}
            className="flex-shrink-0 w-[42%] sm:w-[30%] snap-start"
            onClick={(e) => isDragging && e.preventDefault()}
            draggable={false}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-[var(--sol-sage)]/10">
              <img
                src={getImageSrc(img.src)}
                alt={idx === 0 ? name : ''}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: getObjPos(img) }}
                loading={idx < 6 ? 'eager' : 'lazy'}
                decoding={idx < 6 ? 'sync' : 'async'}
                draggable={false}
              />
            </div>
          </a>
        ))}
      </div>

    </div>
  )
}
