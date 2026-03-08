import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { getVariantUrl, hasVariants } from '@/lib/image-url'
import { schedulePreloads } from '@/lib/image-preloader'
import { selectFromPool } from '@/lib/image-pool'

declare global {
  interface Window {
    __heroSelection?: CarouselImage[]
    __heroPageId?: string
  }
}

/**
 * Convert image src to WebP variant for portfolio images.
 * Non-portfolio images (pages, mood) are returned unchanged.
 * Already-converted WebP paths are returned unchanged.
 */
function getHeroSrc(src: string): string {
  // Skip if already a WebP variant
  if (src.endsWith('.webp')) return src
  return hasVariants(src) ? getVariantUrl(src, 1920) : src
}

interface Props {
  slides: CarouselImage[]
  heading: string
  speedSeconds?: number
  fallbackFocalX?: number
  fallbackFocalY?: number
  variant?: 'home' | 'about' | 'portfolio'
  // Optional: pre-built hero images per sub-category filter (for portraits page)
  subcategoryHeroMap?: Record<string, CarouselImage[]>
  // Number of slides to display (client picks randomly from pool)
  displayCount?: number
  // Use pre-selection from inline script (reads window.__heroSelection)
  usePreSelection?: boolean
  // Page identifier to ensure selection is page-specific
  pageId?: string
}

/**
 * Get object-position from focal point coordinates.
 * Optionally apply a horizontal offset from gesture interaction.
 */
function getFocalPosition(
  slide: CarouselImage,
  fallbackX = 50,
  fallbackY = 50,
  xOffset = 0
): string {
  const x = slide.focal_x != null ? Number(slide.focal_x) : fallbackX
  const y = slide.focal_y != null ? Number(slide.focal_y) : fallbackY
  // Clamp the offset so we don't go beyond image bounds
  const adjustedX = Math.max(0, Math.min(100, x + xOffset))
  return `${adjustedX}% ${y}%`
}

/**
 * Asymmetric width patterns for visual rhythm.
 * Each pattern totals ~100vw for the viewport.
 */
const widthPatterns = {
  3: ['38vw', '34vw', '28vw'],
  4: ['30vw', '26vw', '22vw', '22vw'],
  5: ['28vw', '22vw', '18vw', '16vw', '16vw'],
  6: ['24vw', '20vw', '16vw', '14vw', '14vw', '12vw'],
}

/**
 * Generate a shuffled order array for CSS flexbox ordering.
 * Returns [0,1,2,3...] shuffled, e.g., [2,0,3,1]
 */
function generateShuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/**
 * Randomly select `count` unique indices from a pool of `total` items.
 * Uses Fisher-Yates partial shuffle for efficiency.
 */
function generateRandomSelection(total: number, count: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i)
  const selected: number[] = []
  const selectCount = Math.min(count, total)

  for (let i = 0; i < selectCount; i++) {
    const randomIdx = i + Math.floor(Math.random() * (indices.length - i))
    ;[indices[i], indices[randomIdx]] = [indices[randomIdx], indices[i]]
    selected.push(indices[i])
  }

  return selected
}

export default function HeroCarousel({
  slides: defaultSlides,
  heading,
  fallbackFocalX = 50,
  fallbackFocalY = 50,
  variant = 'home',
  subcategoryHeroMap,
  displayCount,
  usePreSelection = false,
  pageId = 'default',
}: Props) {
  // Track pre-selected slides from inline script
  const [preSelectedSlides, setPreSelectedSlides] = useState<CarouselImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [focalShift, setFocalShift] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  // CSS order values for each slide - starts sequential, shuffles after hydration
  const [slideOrder, setSlideOrder] = useState<number[]>([])
  // Desktop images start hidden, shuffle while hidden, then fade in
  const [desktopReady, setDesktopReady] = useState(false)
  // Indices of slides selected for display (only used when NOT using pre-selection)
  const [selectedIndices, setSelectedIndices] = useState<Set<number> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const dragStartX = useRef<number | null>(null)
  const prefersReducedMotion = useRef(false)

  // Read pre-selected slides from window after hydration
  // Also re-read on View Transitions navigation
  useEffect(() => {
    if (!usePreSelection) return

    const readSelection = () => {
      // Check if selection exists and matches this page
      if (window.__heroSelection && window.__heroPageId === pageId) {
        setPreSelectedSlides(window.__heroSelection)
      } else {
        // Selection not ready yet or wrong page - try again shortly
        // This handles View Transitions timing where script may run after component mounts
        setTimeout(() => {
          if (window.__heroSelection && window.__heroPageId === pageId) {
            setPreSelectedSlides(window.__heroSelection)
          }
        }, 50)
      }
    }

    // Read immediately on mount
    readSelection()

    // Re-read on View Transitions navigation (inline script may have run with new selection)
    const handlePageLoad = () => {
      // Small delay to ensure inline script has executed
      setTimeout(readSelection, 10)
    }
    document.addEventListener('astro:page-load', handlePageLoad)

    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad)
    }
  }, [usePreSelection, pageId])

  // Sync filter from URL (for dynamic hero images on portraits page)
  useEffect(() => {
    if (!subcategoryHeroMap) return

    const syncFilter = () => {
      const params = new URLSearchParams(window.location.search)
      setActiveFilter(params.get('filter'))
    }

    syncFilter()
    document.addEventListener('astro:page-load', syncFilter)
    window.addEventListener('popstate', syncFilter)
    window.addEventListener('urlchange', syncFilter)

    return () => {
      document.removeEventListener('astro:page-load', syncFilter)
      window.removeEventListener('popstate', syncFilter)
      window.removeEventListener('urlchange', syncFilter)
    }
  }, [subcategoryHeroMap])

  // Re-select from subcategory pool when filter changes
  useEffect(() => {
    if (!usePreSelection || !subcategoryHeroMap || !activeFilter) return

    const pool = subcategoryHeroMap[activeFilter]
    if (!pool || pool.length === 0) return

    const count = displayCount ?? 4
    if (pool.length <= count) {
      // Pool is small enough to show all
      setPreSelectedSlides(pool)
      return
    }

    // Client-side selection from subcategory pool using pool scoring
    const selectedSrcs = selectFromPool(pool.map(s => s.src), count)
    const selectedSlides = pool.filter(s => selectedSrcs.includes(s.src))
    setPreSelectedSlides(selectedSlides)
  }, [activeFilter, subcategoryHeroMap, usePreSelection, displayCount])

  // Pick slides based on active filter or pre-selection
  const allSlides = useMemo(() => {
    // If using pre-selection, ONLY use pre-selected slides (even if empty)
    // This prevents falling back to defaultSlides (all 53 images) during SSR/early hydration
    if (usePreSelection) {
      return preSelectedSlides
    }
    if (subcategoryHeroMap && activeFilter && subcategoryHeroMap[activeFilter]) {
      return subcategoryHeroMap[activeFilter]
    }
    return defaultSlides
  }, [usePreSelection, preSelectedSlides, defaultSlides, subcategoryHeroMap, activeFilter])

  // Filter to only selected slides (for per-visit variety)
  // When using pre-selection or selectedIndices is null, show all slides
  const slides = useMemo(() => {
    if (usePreSelection || selectedIndices === null) {
      return allSlides
    }
    return allSlides.filter((_, idx) => selectedIndices.has(idx))
  }, [usePreSelection, allSlides, selectedIndices])

  // Detect tablet+ breakpoint (768px) and reduced motion preference
  // Switch to strip layout at md to prevent over-cropping on tablets
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Client-side random selection: pick which slides to display from the pool
  // Skip if using pre-selection (inline script already selected)
  useEffect(() => {
    if (usePreSelection) return // Pre-selection already handled
    if (displayCount == null || allSlides.length <= displayCount) {
      setSelectedIndices(null)
      return
    }
    const indices = generateRandomSelection(allSlides.length, displayCount)
    setSelectedIndices(new Set(indices))
  }, [usePreSelection, allSlides.length, displayCount])

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Desktop: shuffle order while hidden, then fade in (avoids visible reorder flash)
  useEffect(() => {
    // Shuffle immediately (images hidden via opacity 0)
    setSlideOrder(generateShuffledOrder(slides.length))
    // Small delay to ensure shuffle applied before fade-in
    const timer = setTimeout(() => setDesktopReady(true), 50)
    return () => clearTimeout(timer)
  }, [slides.length])

  // Schedule idle-time preloading of additional images for future navigations
  useEffect(() => {
    if (!usePreSelection) return
    if (slides.length === 0) return

    // Extract src URLs for preloader
    const poolSrcs = defaultSlides.map(s => s.src)
    const selectedSrcs = slides.map(s => s.src)

    schedulePreloads(poolSrcs, selectedSrcs)
  }, [usePreSelection, defaultSlides, slides])

  // Handle scroll snap detection (mobile only)
  useEffect(() => {
    if (isDesktop) return
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const slideWidth = container.offsetWidth
      const newIndex = Math.round(scrollLeft / slideWidth)
      setCurrentIndex(newIndex)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isDesktop])

  const scrollToSlide = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container) return
    const slideWidth = container.offsetWidth
    container.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
  }, [])

  const prev = useCallback(() => {
    const newIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1
    scrollToSlide(newIndex)
  }, [currentIndex, slides.length, scrollToSlide])

  const next = useCallback(() => {
    const newIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1
    scrollToSlide(newIndex)
  }, [currentIndex, slides.length, scrollToSlide])

  // Keyboard navigation (mobile only)
  useEffect(() => {
    if (isDesktop) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prev, next, isDesktop])

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) prev()
      else next()
    }
    touchStartX.current = null
  }

  // Desktop "peek" interaction - drag to shift focal point
  const MAX_SHIFT = 12 // Max ±12% focal point shift

  const handleDesktopDragStart = useCallback((clientX: number) => {
    if (prefersReducedMotion.current) return
    dragStartX.current = clientX
    setIsDragging(true)
  }, [])

  const handleDesktopDragMove = useCallback((clientX: number) => {
    if (dragStartX.current === null || prefersReducedMotion.current) return
    const delta = clientX - dragStartX.current
    // Convert pixel movement to focal shift (invert: drag right = shift left to reveal right side)
    const shift = -(delta / window.innerWidth) * 100
    setFocalShift(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift)))
  }, [])

  const handleDesktopDragEnd = useCallback(() => {
    dragStartX.current = null
    setIsDragging(false)
    // Spring back to center
    setFocalShift(0)
  }, [])

  // Mouse handlers for desktop
  const onMouseDown = (e: React.MouseEvent) => handleDesktopDragStart(e.clientX)
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleDesktopDragMove(e.clientX)
  }
  const onMouseUp = () => handleDesktopDragEnd()
  const onMouseLeave = () => {
    if (isDragging) handleDesktopDragEnd()
  }

  const heightClass = variant === 'portfolio'
    ? 'h-[60vh] md:h-[70vh]'
    : 'h-screen'

  // Loading state: when using pre-selection but slides not yet loaded
  // Show placeholder with heading to prevent layout shift
  if (usePreSelection && slides.length === 0) {
    return (
      <section className={`relative ${heightClass} overflow-hidden bg-[var(--sol-cream)]`}>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
        {/* Heading */}
        <div className="absolute inset-x-0 bottom-24 md:bottom-32 z-10 px-6 text-center">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light italic text-[var(--sol-charcoal)]/30 tracking-wide hero-headline">
            {heading}
          </h1>
        </div>
      </section>
    )
  }

  // Get width pattern based on slide count
  const getSlideWidth = (index: number, total: number): string => {
    const count = Math.min(total, 6) as keyof typeof widthPatterns
    const pattern = widthPatterns[count] || widthPatterns[4]
    return pattern[index % pattern.length]
  }

  return (
    <section className={`relative ${heightClass} overflow-hidden`}>
      {/* Mobile: Horizontal scroll, one image at a time */}
      <div
        ref={scrollRef}
        className="md:hidden flex snap-x snap-mandatory overflow-x-auto h-full scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.src}
            className="snap-center shrink-0 w-full h-full relative"
          >
            <img
              src={getHeroSrc(slide.src)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: getFocalPosition(slide, fallbackFocalX, fallbackFocalY),
              }}
              loading={idx === 0 ? 'eager' : 'lazy'}
              decoding={idx === 0 ? 'sync' : 'async'}
              fetchPriority={idx === 0 ? 'high' : undefined}
            />
          </div>
        ))}
      </div>

      {/* Tablet+: Horizontal strip with asymmetric widths + peek interaction */}
      <div
        className="hidden md:flex h-full select-none"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          // Start hidden, shuffle while hidden, fade in after reorder
          opacity: desktopReady ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.src}
            className="relative h-full shrink-0"
            style={{
              width: getSlideWidth(idx, slides.length),
              // CSS order shuffle - images already loaded, instant visual reorder
              order: slideOrder[idx] ?? idx,
            }}
          >
            <img
              src={getHeroSrc(slide.src)}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: getFocalPosition(slide, fallbackFocalX, fallbackFocalY, focalShift),
                transition: isDragging ? 'none' : 'object-position 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              // All desktop hero images are above-fold, eager load them all
              loading="eager"
              decoding="async"
            />
            {/* Subtle separator line */}
            {idx < slides.length - 1 && (
              <div className="absolute top-0 bottom-0 right-0 w-px bg-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent pointer-events-none" />

      {/* Heading */}
      <div
        className="absolute inset-x-0 bottom-24 md:bottom-32 z-10 px-6 text-center"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s',
        }}
      >
        {activeFilter && subcategoryHeroMap ? (
          <h1 className="font-display font-light italic tracking-wide hero-headline">
            <span className="block text-3xl md:text-5xl lg:text-6xl text-white ml-[5%] md:ml-[8%]">
              {activeFilter === 'family' && 'Family'}
              {activeFilter === 'couples' && 'Couples'}
              {activeFilter === 'maternity' && 'Maternity'}
            </span>
            <span className="block text-5xl md:text-7xl lg:text-8xl text-[var(--sol-cream)] -mt-2 md:-mt-3 mr-[5%] md:mr-[8%]">
              Portraits
            </span>
          </h1>
        ) : (
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light italic text-[var(--sol-cream)] tracking-wide hero-headline">
            {heading}
          </h1>
        )}
      </div>

      {/* Navigation arrows - mobile only */}
      {!isDesktop && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/60 hover:text-white transition-colors"
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-[1.5]" fill="none">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/60 hover:text-white transition-colors"
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-[1.5]" fill="none">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators - mobile only */}
      {!isDesktop && slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToSlide(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Scroll hint - mobile only, first slide */}
      {!isDesktop && currentIndex === 0 && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 scroll-indicator"
          style={{
            opacity: isVisible ? 0.5 : 0,
            transition: 'opacity 0.5s ease 1s',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-white"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none
        }
      `}</style>
    </section>
  )
}
