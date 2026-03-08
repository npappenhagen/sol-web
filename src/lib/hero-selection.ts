import type { CarouselImage } from './carousel-images'
import { generatePoolSelectionScript } from './image-pool'

declare global {
  interface Window {
    __heroSelection?: CarouselImage[]
    __heroPageId?: string
  }
}

/**
 * Generate the inline script that runs BEFORE React hydration.
 *
 * Uses pool-aware selection:
 * - Prefers images that were preloaded during idle time (faster load)
 * - Avoids images recently shown (more variety)
 * - Falls back to random if sessionStorage unavailable
 *
 * Stores selection in window.__heroSelection so React's first render
 * only creates the selected <img> tags.
 */
export function generateSelectionScript(poolId: string, count: number, pageId: string): string {
  return generatePoolSelectionScript(poolId, count, pageId)
}
