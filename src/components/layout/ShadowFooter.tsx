'use client'

import React, { type CSSProperties, type ReactNode } from 'react'

interface ShadowFooterProps {
  children: ReactNode
  sizing?: 'fill' | 'stretch'
  color?: string
  animation?: { scale: number, speed: number }
  noise?: { opacity: number, scale: number }
  style?: CSSProperties
  className?: string
}

export default function ShadowFooter({
  children,
  color = 'var(--sol-charcoal)',
  style,
  className,
}: ShadowFooterProps) {
  return (
    <footer
      className={className}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        backgroundColor: color,
        zIndex: 10, // Below lightbox (z-50) but above normal content
        ...style,
      }}
    >
      {/* Top gradient fade from cream to transparent */}
      <div
        className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, var(--sol-cream) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle color depth with static radial gradients */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 70%, var(--sol-forest) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, var(--sol-steel) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Warm accent layer for depth */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 60% 50%, var(--sol-blush) 0%, transparent 50%),
            radial-gradient(ellipse 70% 40% at 35% 65%, var(--sol-caramel) 0%, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </footer>
  )
}
