import { useState, useEffect, useRef, useCallback } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { schedulePreloads } from '@/lib/image-preloader'

interface UseHeroDisplayOptions {
  displaySlides: CarouselImage[]
  defaultSlides: CarouselImage[]
  slides: CarouselImage[]
  usePreSelection: boolean
}

interface UseHeroDisplayResult {
  // Responsive state
  isDesktop: boolean
  isVisible: boolean
  desktopReady: boolean
  slideOrder: number[]

  // Mobile carousel state
  currentIndex: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  scrollToSlide: (index: number) => void
  prev: () => void
  next: () => void

  // Touch handlers
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void

  // Desktop drag interaction
  focalShift: number
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseUp: () => void
  onMouseLeave: () => void
}

/**
 * Hook for managing hero carousel display state and interactions.
 *
 * Handles:
 * - Responsive breakpoint detection (768px)
 * - Entrance animations
 * - CSS order shuffling for desktop strip
 * - Mobile scroll snap and navigation
 * - Desktop drag-to-peek interaction
 * - Idle-time image preloading
 */
export function useHeroDisplay({
  displaySlides,
  defaultSlides,
  slides,
  usePreSelection,
}: UseHeroDisplayOptions): UseHeroDisplayResult {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [slideOrder, setSlideOrder] = useState<number[]>([])
  const [desktopReady, setDesktopReady] = useState(false)
  const [focalShift, setFocalShift] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const dragStartX = useRef<number | null>(null)
  const prefersReducedMotion = useRef(false)

  // Detect tablet+ breakpoint (768px) and reduced motion preference
  // Filter to width-only changes — mobile address bar show/hide fires
  // resize events with height-only changes that we must ignore.
  useEffect(() => {
    let lastWidth = window.innerWidth
    setIsDesktop(lastWidth >= 768)
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const checkDesktop = () => {
      const newWidth = window.innerWidth
      if (Math.abs(newWidth - lastWidth) > 1) {
        lastWidth = newWidth
        setIsDesktop(newWidth >= 768)
      }
    }

    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Entrance animation - wait for first image to load before showing.
  // This prevents the per-image flash as images decode one by one.
  useEffect(() => {
    if (usePreSelection && slides.length === 0) {
      const fallbackTimer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(fallbackTimer)
    }

    // Wait for the first image to decode before revealing
    const firstSrc = displaySlides[0]?.src
    if (!firstSrc) {
      setIsVisible(true)
      return
    }

    let cancelled = false
    const img = new Image()
    img.src = firstSrc
    img.decode()
      .then(() => { if (!cancelled) setIsVisible(true) })
      .catch(() => { if (!cancelled) setIsVisible(true) })

    // Fallback: show after 800ms even if decode is slow
    const fallback = setTimeout(() => { if (!cancelled) setIsVisible(true) }, 800)
    return () => { cancelled = true; clearTimeout(fallback) }
  }, [usePreSelection, slides.length, displaySlides])

  // Desktop: shuffle order, then wait for first image before fade-in
  useEffect(() => {
    setSlideOrder(generateShuffledOrder(displaySlides.length))

    const firstSrc = displaySlides[0]?.src
    if (!firstSrc) {
      setDesktopReady(true)
      return
    }

    let cancelled = false
    const img = new Image()
    img.src = firstSrc
    img.decode()
      .then(() => { if (!cancelled) setDesktopReady(true) })
      .catch(() => { if (!cancelled) setDesktopReady(true) })

    const fallback = setTimeout(() => { if (!cancelled) setDesktopReady(true) }, 800)
    return () => { cancelled = true; clearTimeout(fallback) }
  }, [displaySlides])

  // Schedule idle-time preloading
  useEffect(() => {
    if (!usePreSelection) return
    if (slides.length === 0) return

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
    const newIndex = currentIndex === 0 ? displaySlides.length - 1 : currentIndex - 1
    scrollToSlide(newIndex)
  }, [currentIndex, displaySlides.length, scrollToSlide])

  const next = useCallback(() => {
    const newIndex = currentIndex === displaySlides.length - 1 ? 0 : currentIndex + 1
    scrollToSlide(newIndex)
  }, [currentIndex, displaySlides.length, scrollToSlide])

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
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) prev()
      else next()
    }
    touchStartX.current = null
  }, [prev, next])

  // Desktop drag-to-peek interaction
  const MAX_SHIFT = 12

  const handleDesktopDragStart = useCallback((clientX: number) => {
    if (prefersReducedMotion.current) return
    dragStartX.current = clientX
    setIsDragging(true)
  }, [])

  const handleDesktopDragMove = useCallback((clientX: number) => {
    if (dragStartX.current === null || prefersReducedMotion.current) return
    const delta = clientX - dragStartX.current
    const shift = -(delta / window.innerWidth) * 100
    setFocalShift(Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, shift)))
  }, [])

  const handleDesktopDragEnd = useCallback(() => {
    dragStartX.current = null
    setIsDragging(false)
    setFocalShift(0)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => handleDesktopDragStart(e.clientX), [handleDesktopDragStart])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleDesktopDragMove(e.clientX)
  }, [isDragging, handleDesktopDragMove])
  const onMouseUp = useCallback(() => handleDesktopDragEnd(), [handleDesktopDragEnd])
  const onMouseLeave = useCallback(() => {
    if (isDragging) handleDesktopDragEnd()
  }, [isDragging, handleDesktopDragEnd])

  return {
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
  }
}

/**
 * Generate a shuffled order array for CSS flexbox ordering.
 */
function generateShuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
