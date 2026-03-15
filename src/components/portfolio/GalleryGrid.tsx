import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getSrcSet, getSizes, getDefaultSrc, hasVariants } from '@/lib/image-url'
import { GALLERY_CONFIG, PORTRAIT_SUBCATEGORIES } from '@/lib/constants'
import { Lightbox } from './Lightbox'

interface ImageData {
  src: string
  date_taken?: string
  hue?: number
  tags?: string[]
  width?: number
  height?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  category?: string
}

interface Props {
  images: ImageData[]
  title: string
  sortMode?: 'manual' | 'date_desc' | 'rainbow_reverse' | 'random' | 'session_spread' | 'color_spread'
  category?: string
  initialFilter?: string | null
}

// Destructure gallery config for local use
const {
  TARGET_ROW_HEIGHT_MOBILE,
  TARGET_ROW_HEIGHT_DESKTOP,
  BREAKPOINT_DESKTOP,
  ROW_HEIGHT_TOLERANCE,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
} = GALLERY_CONFIG

// Filter tags for portraits sub-categories
const PORTRAIT_FILTERS = [...PORTRAIT_SUBCATEGORIES]

// Simple string hash for seeded random
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Seeded Fisher-Yates shuffle - consistent per gallery
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const shuffled = [...arr]
  let hash = hashString(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    const j = hash % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Time-based seed that changes every hour (24 variations per day)
function getTimeSeed(galleryTitle: string): string {
  const now = new Date()
  return `${galleryTitle}-${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`
}

// Group by photo session (same date or adjacent days), then interleave
// Uses time-based entropy to vary session order throughout the day
function sessionSpread(images: ImageData[], galleryTitle: string): ImageData[] {
  const sessions: Map<string, ImageData[]> = new Map()

  // Sort by date descending first
  const sorted = [...images].sort((a, b) => {
    const dateA = a.date_taken || '0000-00-00'
    const dateB = b.date_taken || '0000-00-00'
    return dateB.localeCompare(dateA)
  })

  // Group images by date
  for (const img of sorted) {
    const date = img.date_taken || 'unknown'
    if (!sessions.has(date)) sessions.set(date, [])
    sessions.get(date)!.push(img)
  }

  // Shuffle session order using time-based seed for controlled entropy
  const timeSeed = getTimeSeed(galleryTitle)
  const sessionArrays = seededShuffle(Array.from(sessions.values()), timeSeed)

  // Round-robin from each session to spread subjects
  const result: ImageData[] = []
  let added = true
  while (added) {
    added = false
    for (const session of sessionArrays) {
      if (session.length > 0) {
        result.push(session.shift()!)
        added = true
      }
    }
  }
  return result
}

// Distribute colors evenly using interleave pattern
function colorSpread(images: ImageData[]): ImageData[] {
  const sorted = [...images].sort((a, b) => (a.hue ?? 30) - (b.hue ?? 30))
  const passes = 4 // Creates 4 interleaved color waves
  const result: ImageData[] = []
  for (let offset = 0; offset < passes; offset++) {
    for (let i = offset; i < sorted.length; i += passes) {
      result.push(sorted[i])
    }
  }
  return result
}

function sortImages(images: ImageData[], mode: string, seed?: string): ImageData[] {
  if (mode === 'manual' || !mode) {
    return images
  }

  const sorted = [...images]

  if (mode === 'date_desc') {
    sorted.sort((a, b) => {
      const dateA = a.date_taken || '0000-00-00'
      const dateB = b.date_taken || '0000-00-00'
      return dateB.localeCompare(dateA)
    })
  } else if (mode === 'rainbow_reverse') {
    const HUE_BUCKET_SIZE = 30

    sorted.sort((a, b) => {
      const dateA = a.date_taken || '0000-00'
      const dateB = b.date_taken || '0000-00'
      const monthA = dateA.slice(0, 7)
      const monthB = dateB.slice(0, 7)

      if (monthA !== monthB) {
        return monthB.localeCompare(monthA)
      }

      const hueA = a.hue ?? 30
      const hueB = b.hue ?? 30
      const bucketA = Math.floor(hueA / HUE_BUCKET_SIZE)
      const bucketB = Math.floor(hueB / HUE_BUCKET_SIZE)

      if (bucketA !== bucketB) {
        return bucketB - bucketA
      }

      const dateCompare = dateB.localeCompare(dateA)
      if (dateCompare !== 0) return dateCompare

      return hueB - hueA
    })
  } else if (mode === 'random') {
    return seededShuffle(images, seed || 'gallery')
  } else if (mode === 'session_spread') {
    return sessionSpread(images, seed || 'gallery')
  } else if (mode === 'color_spread') {
    return colorSpread(images)
  }

  return sorted
}

interface RowImage extends ImageData {
  displayWidth: number
  displayHeight: number
  originalIndex: number
}

interface Row {
  images: RowImage[]
  height: number
}

/**
 * Justified layout algorithm (Flickr-style)
 * Groups images into rows where each row fills the container width
 * while maintaining aspect ratios and consistent row heights
 */
function computeJustifiedLayout(
  images: ImageData[],
  containerWidth: number,
  targetHeight: number,
  spacing: number
): Row[] {
  if (containerWidth <= 0 || images.length === 0) return []

  const rows: Row[] = []
  let currentRow: RowImage[] = []
  let currentRowAspectSum = 0

  images.forEach((img, idx) => {
    const w = img.width || DEFAULT_WIDTH
    const h = img.height || DEFAULT_HEIGHT
    const aspect = w / h

    currentRow.push({
      ...img,
      displayWidth: 0,
      displayHeight: 0,
      originalIndex: idx,
    })
    currentRowAspectSum += aspect

    // Calculate what height this row would have if we used all images so far
    const totalSpacing = (currentRow.length - 1) * spacing
    const rowHeight = (containerWidth - totalSpacing) / currentRowAspectSum

    // If row height is within tolerance of target, finalize this row
    if (rowHeight <= targetHeight * (1 + ROW_HEIGHT_TOLERANCE)) {
      // Finalize row with calculated dimensions
      const finalHeight = rowHeight
      currentRow.forEach((rowImg) => {
        const imgW = rowImg.width || DEFAULT_WIDTH
        const imgH = rowImg.height || DEFAULT_HEIGHT
        const aspect = imgW / imgH
        rowImg.displayHeight = finalHeight
        rowImg.displayWidth = finalHeight * aspect
      })

      rows.push({ images: [...currentRow], height: finalHeight })
      currentRow = []
      currentRowAspectSum = 0
    }
  })

  // Handle remaining images in incomplete row
  if (currentRow.length > 0) {
    // For incomplete rows, use target height to avoid super-wide images
    const finalHeight = Math.min(
      targetHeight,
      (containerWidth - (currentRow.length - 1) * spacing) / currentRowAspectSum
    )

    currentRow.forEach((rowImg) => {
      const imgW = rowImg.width || DEFAULT_WIDTH
      const imgH = rowImg.height || DEFAULT_HEIGHT
      const aspect = imgW / imgH
      rowImg.displayHeight = finalHeight
      rowImg.displayWidth = finalHeight * aspect
    })

    rows.push({ images: currentRow, height: finalHeight })
  }

  return rows
}

export default function GalleryGrid({
  images,
  title,
  sortMode = 'manual',
  category,
  initialFilter = null,
}: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [lightboxLoading, setLightboxLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(initialFilter)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { SPACING } = GALLERY_CONFIG

  // Helper to extract filter from URL
  const getFilterFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const filter = params.get('filter')
    return filter && PORTRAIT_FILTERS.includes(filter) ? filter : null
  }, [])

  // Sync filter with URL on mount and navigation (handles View Transitions)
  useEffect(() => {
    const syncFilter = () => {
      const urlFilter = getFilterFromUrl()
      setActiveFilter(urlFilter)
    }

    // Sync on mount
    syncFilter()

    // Listen for Astro View Transition navigation
    document.addEventListener('astro:page-load', syncFilter)
    // Listen for browser back/forward
    window.addEventListener('popstate', syncFilter)

    return () => {
      document.removeEventListener('astro:page-load', syncFilter)
      window.removeEventListener('popstate', syncFilter)
    }
  }, [getFilterFromUrl])

  // Measure container width - ONLY on width changes, not height
  // Mobile address bars cause constant height changes (90px oscillation)
  // that trigger scroll jank if we react to them
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let lastWidth = container.offsetWidth
    setContainerWidth(lastWidth)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const newWidth = entry.contentRect.width
      // CRITICAL: Only update state if WIDTH changed, ignore height-only changes
      // This prevents mobile address bar show/hide from causing layout thrash
      if (Math.abs(newWidth - lastWidth) > 1) {
        lastWidth = newWidth
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
        resizeTimeoutRef.current = setTimeout(() => {
          setContainerWidth(newWidth)
        }, 100)
      }
    })

    observer.observe(container)

    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      observer.disconnect()
    }
  }, [])

  // Collect all unique categories from images for filtering
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>()
    images.forEach(img => {
      if (img.category && PORTRAIT_FILTERS.includes(img.category)) {
        catSet.add(img.category)
      }
    })
    return catSet
  }, [images])

  // Show filters for portraits page if we have sub-category images loaded
  const hasFilters = category === 'portraits' && availableCategories.size > 0
  const availableFilters = hasFilters ? PORTRAIT_FILTERS.filter(f => availableCategories.has(f)) : []

  // Sort images based on mode
  const sortedImages = useMemo(() => sortImages(images, sortMode, title), [images, sortMode, title])

  // Filter images based on active filter (using category field for multi-source portraits)
  const displayImages = useMemo(() => {
    // For portraits gallery with multi-source images, filter by category field
    if (category === 'portraits') {
      if (!activeFilter) {
        // "Portraits" filter: show only base portraits images (not subcategories)
        return sortedImages.filter(img => img.category === 'portraits')
      }
      // Sub-category filter: show only images from that category
      return sortedImages.filter(img => img.category === activeFilter)
    }
    // For other galleries, use tag-based filtering (original behavior)
    if (!activeFilter) return sortedImages
    return sortedImages.filter(img =>
      img.tags?.some(t => t.toLowerCase() === activeFilter.toLowerCase())
    )
  }, [sortedImages, activeFilter, category])

  // Compute responsive target row height based on viewport
  const targetRowHeight = containerWidth >= BREAKPOINT_DESKTOP
    ? TARGET_ROW_HEIGHT_DESKTOP
    : TARGET_ROW_HEIGHT_MOBILE

  // Compute justified layout
  const rows = useMemo(() => {
    return computeJustifiedLayout(displayImages, containerWidth, targetRowHeight, SPACING)
  }, [displayImages, containerWidth, targetRowHeight])

  const prev = useCallback(
    () => {
      setLightboxLoading(true)
      setLightbox(i => (i !== null ? (i - 1 + displayImages.length) % displayImages.length : null))
    },
    [displayImages.length],
  )
  const next = useCallback(
    () => {
      setLightboxLoading(true)
      setLightbox(i => (i !== null ? (i + 1) % displayImages.length : null))
    },
    [displayImages.length],
  )
  const close = useCallback(() => setLightbox(null), [])

  // Set loading state when lightbox changes
  useEffect(() => {
    if (lightbox !== null) {
      setLightboxLoading(true)
    }
  }, [lightbox])

  // Update filter and URL together
  const handleFilterChange = useCallback((filter: string | null) => {
    setActiveFilter(filter)
    // Update URL without full page reload
    const url = new URL(window.location.href)
    if (filter) {
      url.searchParams.set('filter', filter)
    } else {
      url.searchParams.delete('filter')
    }
    window.history.pushState({}, '', url.toString())
    // Notify nav components about URL change
    window.dispatchEvent(new CustomEvent('urlchange'))
  }, [])

  return (
    <>
      {/* Filter toggles for portraits */}
      {hasFilters && availableFilters.length > 0 && (
        <div className="pt-8 px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleFilterChange(null)}
              className="filter-pill"
              data-active={activeFilter === null}
            >
              Portraits
            </button>
            {availableFilters.map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                className="filter-pill"
                data-active={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Justified photo gallery */}
      <div ref={containerRef} className="px-6 py-12 max-w-7xl mx-auto">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex justify-start"
            style={{ marginBottom: SPACING, gap: SPACING }}
          >
            {row.images.map((img) => (
              <button
                key={img.src}
                type="button"
                onClick={() => setLightbox(img.originalIndex)}
                className="relative overflow-hidden rounded bg-[var(--sol-sage)]/10 gallery-image-lift cursor-zoom-in flex-shrink-0"
                style={{
                  width: img.displayWidth,
                  height: img.displayHeight,
                }}
                aria-label={`Open ${title} image ${img.originalIndex + 1}`}
              >
                {hasVariants(img.src) ? (
                  <picture>
                    <source
                      type="image/webp"
                      srcSet={getSrcSet(img.src)}
                      sizes={getSizes('gallery')}
                    />
                    <img
                      src={getDefaultSrc(img.src, 'gallery')}
                      width={img.width || DEFAULT_WIDTH}
                      height={img.height || DEFAULT_HEIGHT}
                      alt={img.tags?.length ? `${img.tags.join(', ')} - ${title}` : `${title} photography`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </picture>
                ) : (
                  <img
                    src={img.src}
                    width={img.width || DEFAULT_WIDTH}
                    height={img.height || DEFAULT_HEIGHT}
                    alt={img.tags?.length ? `${img.tags.join(', ')} - ${title}` : `${title} photography`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {lightbox !== null && (
        <Lightbox
          images={displayImages}
          currentIndex={lightbox}
          isLoading={lightboxLoading}
          onClose={close}
          onPrev={prev}
          onNext={next}
          onLoadComplete={() => setLightboxLoading(false)}
        />
      )}
    </>
  )
}
