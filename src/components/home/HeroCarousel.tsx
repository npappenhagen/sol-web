import type { CarouselImage } from '@/lib/carousel-images'
import { getVariantUrl, hasVariants, IMAGE_WIDTHS } from '@/lib/image-url'
import { useHeroSelection } from '@/hooks/useHeroSelection'
import { useHeroDisplay } from '@/hooks/useHeroDisplay'

/**
 * Convert image src to WebP variant for portfolio images.
 */
function getHeroSrc(src: string, width: 400 | 800 | 1200 | 1920 = 1920): string {
  if (src.endsWith('.webp')) return src
  return hasVariants(src) ? getVariantUrl(src, width) : src
}

/**
 * Generate srcset for hero images with multiple widths.
 */
function getHeroSrcSet(src: string): string {
  if (src.endsWith('.webp')) return ''
  if (!hasVariants(src)) return ''
  return IMAGE_WIDTHS
    .map((w) => `${getVariantUrl(src, w)} ${w}w`)
    .join(', ')
}

interface Props {
  slides: CarouselImage[]
  heading: string
  speedSeconds?: number
  fallbackFocalX?: number
  fallbackFocalY?: number
  variant?: 'home' | 'about' | 'portfolio'
  subcategoryHeroMap?: Record<string, CarouselImage[]>
  displayCount?: number
  usePreSelection?: boolean
  pageId?: string
}

/**
 * Get object-position from focal point coordinates.
 */
function getFocalPosition(
  slide: CarouselImage,
  fallbackX = 50,
  fallbackY = 50,
  xOffset = 0
): string {
  const x = slide.focal_x != null ? Number(slide.focal_x) : fallbackX
  const y = slide.focal_y != null ? Number(slide.focal_y) : fallbackY
  const adjustedX = Math.max(0, Math.min(100, x + xOffset))
  return `${adjustedX}% ${y}%`
}

/**
 * Asymmetric width patterns for visual rhythm.
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
  displayCount,
  usePreSelection = false,
  pageId = 'default',
}: Props) {
  // Slide selection (pre-selection, filtering, random selection)
  const { slides, displaySlides, activeFilter } = useHeroSelection({
    defaultSlides,
    usePreSelection,
    pageId,
    displayCount,
    subcategoryHeroMap,
  })

  // Display state and interactions
  const {
    isDesktop,
    isVisible,
    desktopReady,
    slideOrder,
    currentIndex,
    scrollRef,
    scrollToSlide,
    prev,
    next,
    handleTouchStart,
    handleTouchEnd,
    focalShift,
    isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  } = useHeroDisplay({
    displaySlides,
    defaultSlides,
    slides,
    usePreSelection,
  })

  const heightClass = variant === 'portfolio'
    ? 'h-[60vh] md:h-[70vh]'
    : 'h-screen'

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
        {displaySlides.map((slide, idx) => {
          const srcSet = getHeroSrcSet(slide.src)
          return (
            <div
              key={slide.src}
              className="snap-center shrink-0 w-full h-full relative"
            >
              <img
                src={getHeroSrc(slide.src)}
                srcSet={srcSet || undefined}
                sizes={srcSet ? '100vw' : undefined}
                alt=""
                width={1920}
                height={1080}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: getFocalPosition(slide, fallbackFocalX, fallbackFocalY),
                }}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding={idx === 0 ? 'sync' : 'async'}
                fetchPriority={idx === 0 ? 'high' : undefined}
              />
            </div>
          )
        })}
      </div>

      {/* Tablet+: Horizontal strip with asymmetric widths + peek interaction */}
      <div
        className="hidden md:flex h-full select-none"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: desktopReady ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {displaySlides.map((slide, idx) => {
          const srcSet = getHeroSrcSet(slide.src)
          const slideWidth = getSlideWidth(idx, displaySlides.length)
          return (
            <div
              key={slide.src}
              className="relative h-full shrink-0"
              style={{
                width: slideWidth,
                order: slideOrder[idx] ?? idx,
              }}
            >
              <img
                src={getHeroSrc(slide.src)}
                srcSet={srcSet || undefined}
                sizes={srcSet ? slideWidth : undefined}
                alt=""
                width={1920}
                height={1080}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  objectPosition: getFocalPosition(slide, fallbackFocalX, fallbackFocalY, focalShift),
                  transition: isDragging ? 'none' : 'object-position 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                loading="eager"
                decoding={idx === 0 ? 'sync' : 'async'}
                fetchPriority={idx === 0 ? 'high' : 'low'}
              />
              {idx < displaySlides.length - 1 && (
                <div className="absolute top-0 bottom-0 right-0 w-px bg-white/10" />
              )}
            </div>
          )
        })}
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
      {!isDesktop && displaySlides.length > 1 && (
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
      {!isDesktop && displaySlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {displaySlides.map((_, idx) => (
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
