import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ResponsiveImage from '@/components/shared/ResponsiveImage'

interface Testimonial {
  quote: string
  author: string
  context?: string
  image?: string
}

interface Props {
  testimonials: Testimonial[]
  backgroundImages?: string[]
  autoPlayInterval?: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export default function TestimonialsCarousel({
  testimonials,
  backgroundImages = [],
  autoPlayInterval = 10000,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLElement>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }, [testimonials.length])

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }, [testimonials.length])

  useEffect(() => {
    if (isPaused || testimonials.length <= 1) return
    const timer = setInterval(goToNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [isPaused, goToNext, autoPlayInterval, testimonials.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const inView = rect.top < window.innerHeight && rect.bottom > 0
      if (!inView) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
        setIsPaused(true)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
        setIsPaused(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrev])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext()
      else goToPrev()
      setIsPaused(true)
    }
  }

  const current = testimonials[currentIndex]
  if (!current) return null

  const bgImage =
    backgroundImages.length > 0 ? backgroundImages[currentIndex % backgroundImages.length] : null

  const categoryLabel = (current.context || 'Session').toUpperCase()
  const issueNumber = `№ ${pad2(currentIndex + 1)} / ${pad2(testimonials.length)}`

  return (
    <section
      ref={containerRef}
      className="py-10 md:py-14 px-6"
      role="region"
      aria-label="Client testimonials"
      aria-roledescription="carousel"
    >
      <div
        className="relative max-w-4xl mx-auto overflow-hidden rounded-sm"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mood background — full-bleed, real presence */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={bgImage}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              {bgImage ? (
                <ResponsiveImage
                  src={bgImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  sizes="hero"
                />
              ) : (
                <div className="absolute inset-0 bg-[var(--sol-forest)]" />
              )}
            </motion.div>
          </AnimatePresence>
          {/* Left-weighted dark scrim for text contrast; keeps right side photo-visible */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(20,26,22,0.78) 0%, rgba(20,26,22,0.55) 45%, rgba(20,26,22,0.15) 100%)',
            }}
          />
        </div>

        {/* Content grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-center px-6 md:px-10 pt-8 pb-14 md:pt-10 md:pb-14">
          {/* Portrait — rectangular editorial block, not a polaroid */}
          {current.image && (
            <div className="md:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`img-${currentIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="relative w-[160px] md:w-[200px] mx-auto md:mx-0"
                >
                  <div
                    className="relative overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
                    style={{ aspectRatio: '4 / 5' }}
                  >
                    <ResponsiveImage
                      src={current.image}
                      alt={current.author}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      sizes="(max-width: 768px) 200px, 260px"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Typography column */}
          <div className={current.image ? 'md:col-span-9' : 'md:col-span-12'}>
            {/* Metadata strip */}
            <div className="flex items-baseline gap-3 mb-5">
              <span
                className="font-sans text-[10px] md:text-[11px] text-white/60"
                style={{ letterSpacing: '0.32em' }}
              >
                {issueNumber}
              </span>
              <span className="h-px flex-1 bg-white/25" />
              <span
                className="font-sans text-[10px] md:text-[11px] text-white/60"
                style={{ letterSpacing: '0.32em' }}
              >
                {categoryLabel}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <blockquote
                  className="font-sans font-light text-white/95 text-[15px] md:text-base lg:text-[17px]"
                  style={{
                    maxWidth: '52ch',
                    lineHeight: 1.75,
                    letterSpacing: '0.005em',
                  }}
                >
                  {current.quote}
                </blockquote>

                <footer className="mt-8 md:mt-10 flex items-baseline gap-4">
                  <p
                    className="font-display italic text-white text-lg md:text-xl"
                  >
                    {current.author}
                  </p>
                  <span className="h-px flex-1 bg-white/25" />
                  {current.context && (
                    <p
                      className="font-sans text-[10px] text-white/55"
                      style={{ letterSpacing: '0.32em' }}
                    >
                      {current.context.toUpperCase()}
                    </p>
                  )}
                </footer>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination — hairline rule with progress + counter, tucked to bottom edge */}
        {testimonials.length > 1 && (
          <div className="absolute left-7 right-7 md:left-12 md:right-12 bottom-5">
            <div
              className="flex items-center gap-4 font-sans text-[10px] text-white/55"
              style={{ letterSpacing: '0.32em' }}
            >
              <button
                type="button"
                onClick={() => {
                  goToPrev()
                  setIsPaused(true)
                }}
                aria-label="Previous testimonial"
                className="hover:text-white transition-colors"
              >
                &larr;
              </button>
              <div className="h-px flex-1 bg-white/20 relative overflow-hidden">
                <motion.div
                  key={`progress-${currentIndex}-${isPaused ? 'p' : 'r'}`}
                  initial={{ width: '0%' }}
                  animate={{ width: isPaused ? undefined : '100%' }}
                  transition={{
                    duration: isPaused ? 0 : autoPlayInterval / 1000,
                    ease: 'linear',
                  }}
                  className="absolute inset-y-0 left-0 bg-[var(--sol-caramel)]"
                />
              </div>
              <span aria-live="polite" className="tabular-nums">
                {pad2(currentIndex + 1)} / {pad2(testimonials.length)}
              </span>
              <button
                type="button"
                onClick={() => {
                  goToNext()
                  setIsPaused(true)
                }}
                aria-label="Next testimonial"
                className="hover:text-white transition-colors"
              >
                &rarr;
              </button>
            </div>
            <div className="sr-only">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentIndex(i)
                    setIsPaused(true)
                  }}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-selected={i === currentIndex}
                  role="tab"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
