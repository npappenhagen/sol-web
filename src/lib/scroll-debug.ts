/**
 * Scroll Debug Utility
 *
 * Logs ResizeObserver, scroll events, and render counts for diagnosing
 * mobile scroll jank. Only active when ?debug=scroll is in the URL.
 *
 * Persists to localStorage for post-jank review.
 */

interface ScrollEvent {
  type: 'resize' | 'scroll' | 'render' | 'viewport_change'
  component: string
  timestamp: number
  data?: Record<string, unknown>
}

interface ScrollDebugState {
  enabled: boolean
  events: ScrollEvent[]
  counts: Record<string, number>
}

const STORAGE_KEY = 'sol-scroll-debug'
const MAX_EVENTS = 500

// Module-level state
const state: ScrollDebugState = {
  enabled: false,
  events: [],
  counts: {},
}

// Check if debug mode is enabled via URL param
export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('debug') === 'scroll'
}

// Initialize debug mode (call once on app start)
export function initScrollDebug(): void {
  if (typeof window === 'undefined') return

  state.enabled = isDebugEnabled()

  if (state.enabled) {
    // Load previous events from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        state.events = parsed.events || []
        state.counts = parsed.counts || {}
      }
    } catch {
      // Ignore parse errors
    }

    // Track viewport changes (address bar hide/show)
    let lastHeight = window.visualViewport?.height ?? window.innerHeight

    const trackViewport = () => {
      const currentHeight = window.visualViewport?.height ?? window.innerHeight
      if (Math.abs(currentHeight - lastHeight) > 10) {
        logEvent('viewport_change', 'window', {
          from: lastHeight,
          to: currentHeight,
          delta: currentHeight - lastHeight,
        })
        lastHeight = currentHeight
      }
    }

    window.visualViewport?.addEventListener('resize', trackViewport)
    window.addEventListener('resize', trackViewport)
  }
}

// Log a debug event
export function logEvent(
  type: ScrollEvent['type'],
  component: string,
  data?: Record<string, unknown>
): void {
  if (!state.enabled) return

  const event: ScrollEvent = {
    type,
    component,
    timestamp: performance.now(),
    data,
  }

  // Add to events array (FIFO with max limit)
  state.events.push(event)
  if (state.events.length > MAX_EVENTS) {
    state.events = state.events.slice(-MAX_EVENTS)
  }

  // Update counts
  const key = `${type}:${component}`
  state.counts[key] = (state.counts[key] || 0) + 1

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      events: state.events,
      counts: state.counts,
    }))
  } catch {
    // Ignore storage errors
  }

  // Console log for real-time debugging
  console.debug(`[scroll-debug] ${type} @ ${component}`, data)
}

// Get current debug state (for overlay)
export function getDebugState(): ScrollDebugState {
  return { ...state }
}

// Clear all debug data
export function clearDebugData(): void {
  state.events = []
  state.counts = {}
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

// Export events as JSON (for sharing)
export function exportDebugData(): string {
  return JSON.stringify({
    events: state.events,
    counts: state.counts,
    exported: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  }, null, 2)
}
