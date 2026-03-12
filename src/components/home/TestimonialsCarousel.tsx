import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Testimonial {
  quote: string
  author: string
  context?: string
}

interface Props {
  testimonials: Testimonial[]
  backgroundImages?: string[]
  autoPlayInterval?: number
}

export default function TestimonialsCarousel({
  testimonials,
  backgroundImages = [],
  autoPlayInterval = 8000,
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

  // Auto-advance
  useEffect(() => {
    if (isPaused || testimonials.length <= 1) return
    const timer = setInterval(goToNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [isPaused, goToNext, autoPlayInterval, testimonials.length])

  // Keyboard navigation
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

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext()
      } else {
        goToPrev()
      }
      setIsPaused(true)
    }
  }

  const current = testimonials[currentIndex]
  if (!current) return null

  // Each testimonial gets its own background image (cycling through available)
  const bgImage = backgroundImages.length > 0
    ? backgroundImages[currentIndex % backgroundImages.length]
    : null

  return (
    <section
      ref={containerRef}
      className="py-16 px-6"
      role="region"
      aria-label="Client testimonials"
      aria-roledescription="carousel"
    >
      {/* Constrained card container - matches ServicePreview grid width */}
      <div
        className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background image with overlay - crossfade between images */}
        <AnimatePresence mode="wait">
          <motion.div
            key={bgImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-0"
          >
            {bgImage ? (
              <>
                <img
                  src={bgImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[var(--sol-forest)]" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Quote */}
              <blockquote className="font-display text-lg md:text-2xl lg:text-3xl text-white leading-relaxed italic">
                &ldquo;{current.quote}&rdquo;
              </blockquote>

              {/* Author + context */}
              <footer className="mt-6">
                <p className="font-sans text-sm tracking-[0.15em] uppercase text-white/70">
                  &mdash; {current.author}
                  {current.context && (
                    <span className="block mt-1 text-xs tracking-[0.1em] uppercase text-white/50">
                      {current.context}
                    </span>
                  )}
                </p>
              </footer>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          {testimonials.length > 1 && (
            <div
              className="flex justify-center gap-2 mt-8"
              role="tablist"
              aria-label="Testimonial navigation"
            >
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index)
                    setIsPaused(true)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-white w-6'
                      : 'bg-white/30 hover:bg-white/50 w-1.5'
                  }`}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Testimonial ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
