import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseProgressiveLoadOptions {
  /** Initial number of items to render */
  initialCount?: number
  /** Number of items to add per batch */
  batchSize?: number
  /** Distance from edge (in px) to trigger loading more */
  threshold?: number
  /** Whether to use IntersectionObserver (for scroll containers) */
  useIntersectionObserver?: boolean
}

export interface UseProgressiveLoadResult<T> {
  /** Currently visible items */
  visibleItems: T[]
  /** Whether there are more items to load */
  hasMore: boolean
  /** Manually load more items */
  loadMore: () => void
  /** Current count of visible items */
  visibleCount: number
  /** Ref to attach to sentinel element for intersection observer */
  sentinelRef: React.RefObject<HTMLDivElement>
  /** Handle scroll event for scroll-triggered loading */
  handleScroll: () => void
}

/**
 * Hook for progressive loading of large lists.
 * Supports both scroll-based and intersection observer based loading.
 *
 * @example
 * // Scroll-based loading (for horizontal carousels)
 * const { visibleItems, hasMore, handleScroll } = useProgressiveLoad(images, {
 *   initialCount: 12,
 *   batchSize: 8,
 * })
 *
 * @example
 * // Intersection observer loading (for vertical grids)
 * const { visibleItems, sentinelRef, hasMore } = useProgressiveLoad(modules, {
 *   initialCount: 1,
 *   batchSize: 1,
 *   useIntersectionObserver: true,
 * })
 */
export function useProgressiveLoad<T>(
  items: T[],
  options: UseProgressiveLoadOptions = {}
): UseProgressiveLoadResult<T> {
  const {
    initialCount = 12,
    batchSize = 8,
    threshold = 200,
    useIntersectionObserver = false,
  } = options

  const [visibleCount, setVisibleCount] = useState(
    Math.min(initialCount, items.length)
  )
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  const hasMore = visibleCount < items.length
  const visibleItems = items.slice(0, visibleCount)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, items.length))
  }, [batchSize, items.length])

  // Reset visible count when items change significantly
  useEffect(() => {
    setVisibleCount(Math.min(initialCount, items.length))
  }, [items.length, initialCount])

  // Handle scroll-based loading
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || !hasMore) return

    const nearEnd =
      container.scrollLeft + container.clientWidth >
      container.scrollWidth - threshold

    if (nearEnd) {
      loadMore()
    }
  }, [hasMore, threshold, loadMore])

  // Intersection observer for sentinel-based loading
  useEffect(() => {
    if (!useIntersectionObserver) return

    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [useIntersectionObserver, hasMore, threshold, loadMore])

  return {
    visibleItems,
    hasMore,
    loadMore,
    visibleCount,
    sentinelRef,
    handleScroll,
  }
}
