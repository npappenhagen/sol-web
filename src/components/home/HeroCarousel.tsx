import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'

interface Props {
  slides: CarouselImage[]
  heading: string
  speedSeconds?: number
  fallbackFocalX?: number
  fallbackFocalY?: number
  variant?: 'home' | 'about' | 'portfolio'
  // Optional: pre-built hero images per sub-category filter (for portraits page)
  subcategoryHeroMap?: Record<string, CarouselImage[]>
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

export default function HeroCarousel({
  slides: defaultSlides,
  heading,
  fallbackFocalX = 50,
  fallbackFocalY = 50,
  variant = 'home',
  subcategoryHeroMap,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [focalShift, setFocalShift] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const dragStartX = useRef<number | null>(null)
  const prefersReducedMotion = useRef(false)

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

  // Pick slides based on active filter
  const slides = useMemo(() => {
    if (subcategoryHeroMap && activeFilter && subcategoryHeroMap[activeFilter]) {
      return subcategoryHeroMap[activeFilter]
    }
    return defaultSlides
  }, [defaultSlides, subcategoryHeroMap, activeFilter])

  // Detect tablet+ breakpoint (768px) and reduced motion preference
  // Switch to strip layout at md to prevent over-cropping on tablets
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
              src={slide.src}
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
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.src}
            className="relative h-full shrink-0"
            style={{ width: getSlideWidth(idx, slides.length) }}
          >
            <img
              src={slide.src}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: getFocalPosition(slide, fallbackFocalX, fallbackFocalY, focalShift),
                transition: isDragging ? 'none' : 'object-position 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              loading={idx === 0 ? 'eager' : 'lazy'}
              decoding={idx === 0 ? 'sync' : 'async'}
              fetchPriority={idx === 0 ? 'high' : undefined}
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
