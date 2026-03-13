/**
 * Hero Carousel Debug Logger
 *
 * Captures all state changes, renders, and timing to help diagnose flash issues.
 * Data is stored in localStorage and can be copied for debugging.
 *
 * Enable with: localStorage.setItem('HERO_DEBUG', 'true')
 * View logs: copy(JSON.parse(localStorage.getItem('HERO_DEBUG_LOG')))
 */

interface DebugEvent {
  ts: number        // timestamp (ms since page load)
  event: string     // event type
  data?: unknown    // event data
}

interface DebugState {
  enabled: boolean
  startTime: number
  events: DebugEvent[]
  renderCount: number
}

const state: DebugState = {
  enabled: false,
  startTime: 0,
  events: [],
  renderCount: 0,
}

export function initHeroDebug(): void {
  if (typeof window === 'undefined') return

  state.enabled = localStorage.getItem('HERO_DEBUG') === 'true'
  if (!state.enabled) return

  state.startTime = performance.now()
  state.events = []
  state.renderCount = 0

  log('debug_init', {
    userAgent: navigator.userAgent,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    url: window.location.href,
  })

  console.log('%c[HeroDebug] Enabled - events will be logged to localStorage', 'color: #00ff00; font-weight: bold')
}

export function log(event: string, data?: unknown): void {
  if (!state.enabled) return

  const entry: DebugEvent = {
    ts: Math.round(performance.now() - state.startTime),
    event,
    ...(data !== undefined && { data }),
  }

  state.events.push(entry)

  // Keep only last 200 events to avoid memory issues
  if (state.events.length > 200) {
    state.events = state.events.slice(-200)
  }

  // Save to localStorage
  try {
    localStorage.setItem('HERO_DEBUG_LOG', JSON.stringify({
      captured: new Date().toISOString(),
      events: state.events,
    }))
  } catch {
    // localStorage full, ignore
  }

  // Also log to console for real-time viewing
  console.log(`%c[Hero +${entry.ts}ms]%c ${event}`, 'color: #888', 'color: #fff', data ?? '')
}

export function logRender(component: string, props: Record<string, unknown>): void {
  if (!state.enabled) return

  state.renderCount++
  log(`render_${component}`, {
    renderNum: state.renderCount,
    ...props,
  })
}

export function logStateChange(hook: string, stateName: string, oldValue: unknown, newValue: unknown): void {
  if (!state.enabled) return

  // Simplify arrays to just show length and first item
  const simplify = (val: unknown): unknown => {
    if (Array.isArray(val)) {
      return {
        length: val.length,
        first: val[0]?.src?.split('/').pop() ?? null,
        items: val.map(v => v?.src?.split('/').pop() ?? String(v)).slice(0, 6),
      }
    }
    return val
  }

  log('state_change', {
    hook,
    state: stateName,
    from: simplify(oldValue),
    to: simplify(newValue),
  })
}

export function logImageLoad(src: string, success: boolean, loadTime?: number): void {
  if (!state.enabled) return

  log('image_load', {
    src: src.split('/').pop(),
    success,
    loadTime,
  })
}

export function logWindowState(): void {
  if (!state.enabled || typeof window === 'undefined') return

  log('window_state', {
    heroSelection: window.__heroSelection ? {
      length: window.__heroSelection.length,
      items: window.__heroSelection.map(s => s.src.split('/').pop()).slice(0, 6),
    } : null,
    heroPageId: (window as any).__heroPageId ?? null,
  })
}

export function getDebugReport(): string {
  if (typeof window === 'undefined') return '{}'

  const stored = localStorage.getItem('HERO_DEBUG_LOG')
  return stored ?? JSON.stringify({ events: state.events })
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Initialize on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroDebug)
  } else {
    initHeroDebug()
  }
}
