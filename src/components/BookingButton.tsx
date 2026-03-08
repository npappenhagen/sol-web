import { Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

// Map portfolio slugs to Cal.com event type slugs
const eventTypeMap: Record<string, string> = {
  portraits: 'portrait-session-90m',
  branding: 'branding-session-120-min',
  events: 'retreat-session-custom-size',
}

// Friendly names for prefill notes
const serviceNames: Record<string, string> = {
  portraits: 'Portrait Session',
  branding: 'Branding Session',
  events: 'Retreat Photography',
}

interface Props {
  portfolioSlug?: string
  buttonText?: string
  variant?: 'solid' | 'premium'
  className?: string
}

/**
 * BookingButton triggers Cal.com modal for scheduling.
 * Requires CalProvider to be mounted in the layout for proper initialization.
 *
 * Variants:
 *   - solid: Classic filled button (default)
 *   - premium: Modern gradient with glow animation (use for primary CTAs)
 */
export default function BookingButton({
  portfolioSlug,
  buttonText = 'Book Now',
  variant = 'solid',
  className,
}: Props) {
  const eventType = portfolioSlug ? eventTypeMap[portfolioSlug] : undefined
  const calLink = eventType
    ? `sol-photography-w6wuoc/${eventType}`
    : 'sol-photography-w6wuoc'

  // Prefill note so photographer knows where booking came from
  const serviceName = portfolioSlug ? serviceNames[portfolioSlug] : undefined
  const prefillNotes = serviceName
    ? `Interested in: ${serviceName}`
    : undefined

  // Cal.com config for the modal
  const calConfig = JSON.stringify({
    layout: 'month_view',
    ...(prefillNotes && { notes: prefillNotes }),
  })

  // Premium variant - modern gradient with glow
  if (variant === 'premium') {
    return (
      <motion.button
        data-cal-link={calLink}
        data-cal-config={calConfig}
        className={`
          group relative inline-flex items-center gap-2.5
          px-7 py-3 rounded-full
          font-sans text-xs tracking-widest uppercase
          bg-gradient-to-r from-[var(--sol-caramel)] via-[var(--sol-blush)] to-[var(--sol-caramel)]
          bg-[length:200%_100%]
          text-white
          shadow-lg shadow-[var(--sol-caramel)]/25
          cursor-pointer
          overflow-hidden
          ${className ?? ''}
        `}
        initial={{ backgroundPosition: '0% 50%' }}
        whileHover={{
          backgroundPosition: '100% 50%',
          boxShadow: '0 10px 40px -10px rgba(139, 94, 60, 0.5)',
        }}
        whileTap={{ scale: 0.98 }}
        transition={{
          backgroundPosition: { duration: 0.5, ease: 'easeInOut' },
          boxShadow: { duration: 0.3 },
          scale: { duration: 0.1 },
        }}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <Calendar className="h-4 w-4 relative z-10" strokeWidth={1.5} />
        <span className="relative z-10">{buttonText}</span>
      </motion.button>
    )
  }

  // Solid variant (default) - modern with subtle animation
  return (
    <motion.button
      data-cal-link={calLink}
      data-cal-config={calConfig}
      className={`
        group relative inline-flex items-center gap-2
        px-6 py-2.5 rounded-md
        font-sans text-xs tracking-widest uppercase
        bg-[var(--sol-caramel)] text-[var(--sol-cream)]
        shadow-md shadow-[var(--sol-caramel)]/20
        cursor-pointer
        overflow-hidden
        ${className ?? ''}
      `}
      whileHover={{
        y: -2,
        boxShadow: '0 8px 25px -8px rgba(139, 94, 60, 0.4)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <span className="absolute inset-0 bg-[var(--sol-forest)] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      <Calendar className="h-3.5 w-3.5 relative z-10" strokeWidth={1.5} />
      <span className="relative z-10">{buttonText}</span>
    </motion.button>
  )
}
