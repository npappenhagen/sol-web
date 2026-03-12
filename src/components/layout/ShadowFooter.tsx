'use client'

import React, { type CSSProperties, type ReactNode } from 'react'

interface ShadowFooterProps {
  children: ReactNode
  color?: string
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
        zIndex: 10,
        ...style,
      }}
    >
      {/* Smoother top gradient fade - more color stops for natural blend */}
      <div
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            var(--sol-cream) 0%,
            var(--sol-cream) 10%,
            color-mix(in oklch, var(--sol-cream) 80%, var(--sol-charcoal) 20%) 30%,
            color-mix(in oklch, var(--sol-cream) 40%, var(--sol-charcoal) 60%) 60%,
            transparent 100%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Animated gradient layer 1 - slow drift */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none animate-gradient-drift-1"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 15% 80%, var(--sol-forest) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 85% 70%, var(--sol-steel) 0%, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Animated gradient layer 2 - counter drift */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none animate-gradient-drift-2"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 70% 55%, var(--sol-blush) 0%, transparent 45%),
            radial-gradient(ellipse 90% 45% at 25% 70%, var(--sol-caramel) 0%, transparent 40%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Animated gradient layer 3 - subtle breathing */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none animate-gradient-breathe"
        style={{
          background: `
            radial-gradient(ellipse 50% 70% at 50% 60%, var(--sol-sage) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Subtle noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      <style>{`
        @keyframes gradient-drift-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(2%, -1%) scale(1.02);
          }
          66% {
            transform: translate(-1%, 1%) scale(0.98);
          }
        }

        @keyframes gradient-drift-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-2%, 1.5%) scale(1.03);
          }
        }

        @keyframes gradient-breathe {
          0%, 100% {
            opacity: 0.15;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.1);
          }
        }

        .animate-gradient-drift-1 {
          animation: gradient-drift-1 20s ease-in-out infinite;
        }

        .animate-gradient-drift-2 {
          animation: gradient-drift-2 15s ease-in-out infinite;
        }

        .animate-gradient-breathe {
          animation: gradient-breathe 12s ease-in-out infinite;
        }
      `}</style>
    </footer>
  )
}
