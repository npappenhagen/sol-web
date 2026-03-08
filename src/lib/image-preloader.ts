/**
 * Idle-time image preloading.
 *
 * After page load settles, preloads additional images from the pool
 * so they're in HTTP cache for future navigations.
 *
 * Uses requestIdleCallback to avoid blocking main thread.
 */

import { getPoolState, updatePoolState } from './image-pool'
import { getVariantUrl, hasVariants } from './image-url'

const PRELOAD_COUNT = 6
const PRELOAD_STAGGER_MS = 500

/**
 * Schedule preloading of additional images during browser idle time.
 *
 * Picks images not yet shown or preloaded, then injects <link rel="preload">
 * elements staggered to avoid network burst.
 *
 * @param pool - Full pool of available image URLs
 * @param alreadySelected - Images already selected for current page (skip these)
 */
export function schedulePreloads(pool: string[], alreadySelected: string[]): void {
  if (typeof window === 'undefined') return
  if (!('requestIdleCallback' in window)) return

  const state = getPoolState()
  const skip = new Set([...state.preloaded, ...state.shown, ...alreadySelected])

  // Pick random images we haven't shown or preloaded yet
  const toPreload = pool
    .filter(src => !skip.has(src))
    .sort(() => Math.random() - 0.5)
    .slice(0, PRELOAD_COUNT)

  if (toPreload.length === 0) return

  // Use requestIdleCallback to avoid blocking main thread
  window.requestIdleCallback(
    () => {
      const preloaded: string[] = []

      toPreload.forEach((src, i) => {
        setTimeout(() => {
          const link = document.createElement('link')
          link.rel = 'preload'
          link.as = 'image'
          // Use WebP variant for portfolio images, original for others
          link.href = hasVariants(src) ? getVariantUrl(src, 1920) : src
          document.head.appendChild(link)
          preloaded.push(src)

          // Update state after all preloads queued
          if (preloaded.length === toPreload.length) {
            updatePoolState({
              preloaded: [...state.preloaded, ...preloaded].slice(-20),
            })
          }
        }, i * PRELOAD_STAGGER_MS)
      })
    },
    { timeout: 3000 }
  )
}
