import { useState, useEffect, useMemo } from 'react'
import type { CarouselImage } from '@/lib/carousel-images'
import { selectFromPool } from '@/lib/image-pool'

declare global {
  interface Window {
    __heroSelection?: CarouselImage[]
    __heroPageId?: string
  }
}

interface UseHeroSelectionOptions {
  defaultSlides: CarouselImage[]
  usePreSelection: boolean
  pageId: string
  displayCount?: number
  subcategoryHeroMap?: Record<string, CarouselImage[]>
}

interface UseHeroSelectionResult {
  slides: CarouselImage[]
  displaySlides: CarouselImage[]
  activeFilter: string | null
}

/**
 * Hook for managing hero carousel slide selection.
 *
 * Handles:
 * - Reading pre-selected slides from window (set by inline script)
 * - URL filter synchronization for subcategory pages
 * - Client-side selection from pools
 * - View Transitions navigation events
 */
export function useHeroSelection({
  defaultSlides,
  usePreSelection,
  pageId,
  displayCount,
  subcategoryHeroMap,
}: UseHeroSelectionOptions): UseHeroSelectionResult {
  const [preSelectedSlides, setPreSelectedSlides] = useState<CarouselImage[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number> | null>(null)

  // Read pre-selected slides from window after hydration
  useEffect(() => {
    if (!usePreSelection) return

    const readSelection = () => {
      if (window.__heroSelection && window.__heroPageId === pageId) {
        setPreSelectedSlides(window.__heroSelection)
      } else {
        // Selection not ready yet - try again shortly
        setTimeout(() => {
          if (window.__heroSelection && window.__heroPageId === pageId) {
            setPreSelectedSlides(window.__heroSelection)
          }
        }, 50)
      }
    }

    readSelection()

    // Re-read on View Transitions navigation
    const handlePageLoad = () => setTimeout(readSelection, 10)
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
    if (usePreSelection) {
      return preSelectedSlides
    }
    if (subcategoryHeroMap && activeFilter && subcategoryHeroMap[activeFilter]) {
      return subcategoryHeroMap[activeFilter]
    }
    return defaultSlides
  }, [usePreSelection, preSelectedSlides, defaultSlides, subcategoryHeroMap, activeFilter])

  // Client-side random selection (when NOT using pre-selection)
  useEffect(() => {
    if (usePreSelection) return
    if (displayCount == null || allSlides.length <= displayCount) {
      setSelectedIndices(null)
      return
    }
    const indices = generateRandomSelection(allSlides.length, displayCount)
    setSelectedIndices(new Set(indices))
  }, [usePreSelection, allSlides.length, displayCount])

  // Filter to only selected slides
  const slides = useMemo(() => {
    if (usePreSelection || selectedIndices === null) {
      return allSlides
    }
    return allSlides.filter((_, idx) => selectedIndices.has(idx))
  }, [usePreSelection, allSlides, selectedIndices])

  // Fallback slides to prevent CLS during loading
  const displaySlides = slides.length > 0 ? slides : defaultSlides.slice(0, displayCount ?? 4)

  return { slides, displaySlides, activeFilter }
}

/**
 * Randomly select `count` unique indices from a pool of `total` items.
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
