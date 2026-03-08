import { useEffect, useState } from 'react'
import { getCalApi } from '@calcom/embed-react'

/**
 * CalProvider initializes Cal.com embed globally with brand theming
 * and handles booking events (success notifications, analytics, etc.)
 *
 * Mount this once at the app level (in Layout).
 */
export default function CalProvider() {
  const [bookingConfirmed, setBookingConfirmed] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const cal = await getCalApi()

      // Initialize with Sol Photography brand styling
      cal('ui', {
        theme: 'light',
        cssVarsPerTheme: {
          light: {
            'cal-brand': '#8B5E3C',           // --sol-caramel
            'cal-brand-emphasis': '#2D5A3D',  // --sol-forest
            'cal-brand-text': '#F5F0E8',      // --sol-cream
            'cal-text': '#2A2A2A',            // --sol-charcoal
            'cal-text-emphasis': '#2A2A2A',
            'cal-text-muted': 'rgba(42, 42, 42, 0.7)',
            'cal-border': '#A8C5C5',          // --sol-sage
            'cal-border-emphasis': '#6B9CAC', // --sol-steel
            'cal-bg': '#F5F0E8',              // --sol-cream
            'cal-bg-emphasis': '#FFFFFF',
          },
        },
        hideEventTypeDetails: false,
        layout: 'month_view',
      })

      // Listen for booking confirmations
      cal('on', {
        action: 'bookingSuccessful',
        callback: (e) => {
          const data = e.detail?.data
          const eventTitle = data?.eventType?.title || 'Session'
          setBookingConfirmed(eventTitle)

          // Auto-dismiss after 5 seconds
          setTimeout(() => setBookingConfirmed(null), 5000)
        },
      })

      // Track when modal opens (for analytics if needed later)
      cal('on', {
        action: 'linkReady',
        callback: () => {
          // Modal is ready - could track this event
        },
      })
    })()
  }, [])

  // Booking confirmation toast
  if (bookingConfirmed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-24 right-6 z-50"
        style={{
          animation: 'slideInUp 0.3s ease-out',
        }}
      >
        <div className="flex items-center gap-3 rounded-lg border border-[var(--sol-sage)]/50 bg-[var(--sol-cream)] px-5 py-4 shadow-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sol-forest)]/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--sol-forest)]"
            >
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <div>
            <p className="font-display text-base text-[var(--sol-charcoal)]">
              Booking confirmed
            </p>
            <p className="font-serif text-sm text-[var(--sol-charcoal)]/70">
              {bookingConfirmed} — check your email for details
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBookingConfirmed(null)}
            className="ml-2 rounded p-1 text-[var(--sol-charcoal)]/40 hover:bg-[var(--sol-sage)]/20 hover:text-[var(--sol-charcoal)] transition-colors"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}
