import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getDefaultSrc, hasVariants } from '@/lib/image-url'
import { GALLERY_CONFIG } from '@/lib/constants'

const { SWIPE_THRESHOLD } = GALLERY_CONFIG

export interface LightboxImage {
  src: string
}

interface Props {
  images: LightboxImage[]
  currentIndex: number
  isLoading: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onLoadComplete: () => void
}

/**
 * Full-screen image lightbox with keyboard and touch navigation.
 * Renders via portal to document.body.
 */
export function Lightbox({
  images,
  currentIndex,
  isLoading,
  onClose,
  onPrev,
  onNext,
  onLoadComplete,
}: Props) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Keyboard navigation
  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onPrev, onNext])

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      const deltaX = e.changedTouches[0].clientX - touchStartX.current
      const deltaY = e.changedTouches[0].clientY - touchStartY.current

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
          onPrev()
        } else {
          onNext()
        }
      }

      touchStartX.current = null
      touchStartY.current = null
    },
    [onPrev, onNext]
  )

  const currentImage = images[currentIndex]
  if (!currentImage || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[9999] bg-[var(--sol-charcoal)]/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image counter */}
      <span className="absolute top-6 left-6 text-xs font-sans tracking-widest text-white/70">
        {currentIndex + 1} / {images.length}
      </span>

      {/* Previous arrow */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
        className="absolute left-0 md:left-4 p-6 md:p-4 text-white/60 hover:text-white transition-colors hidden md:block"
        aria-label="Previous image"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-[1]" fill="none">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Main image */}
      {hasVariants(currentImage.src) ? (
        <picture onClick={(e) => e.stopPropagation()}>
          <source
            type="image/webp"
            srcSet={getDefaultSrc(currentImage.src, 'lightbox')}
          />
          <img
            src={getDefaultSrc(currentImage.src, 'lightbox')}
            alt=""
            decoding="async"
            className={`max-h-[90vh] max-w-[90vw] object-contain select-none transition-opacity duration-200 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={onLoadComplete}
            draggable={false}
          />
        </picture>
      ) : (
        <img
          src={currentImage.src}
          alt=""
          decoding="async"
          className={`max-h-[90vh] max-w-[90vw] object-contain select-none transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
          onLoad={onLoadComplete}
          draggable={false}
        />
      )}

      {/* Next arrow */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        className="absolute right-0 md:right-4 p-6 md:p-4 text-white/60 hover:text-white transition-colors hidden md:block"
        aria-label="Next image"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-[1]" fill="none">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-5 md:p-4 text-white/50 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current stroke-[1]" fill="none">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Navigation hints */}
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-sans tracking-wider text-white/40 hidden md:block">
        Use arrow keys to navigate
      </span>
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-sans tracking-wider text-white/40 md:hidden">
        Swipe to navigate
      </span>
    </div>,
    document.body
  )
}
