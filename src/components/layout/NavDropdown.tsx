import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface DropdownItem {
  href: string
  label: string
  indent?: boolean
}

interface Props {
  label: string
  href: string
  items: DropdownItem[]
  isActive: boolean
  currentUrl?: string
}

export default function NavDropdown({ label, items, isActive, currentUrl }: Props) {
  // Track current URL in state to handle View Transitions
  const [activeUrl, setActiveUrl] = useState(currentUrl ?? '')

  useEffect(() => {
    const syncUrl = () => {
      setActiveUrl(window.location.pathname + window.location.search)
    }

    // Sync on mount
    syncUrl()

    // Listen for Astro View Transition navigation
    document.addEventListener('astro:page-load', syncUrl)
    // Listen for browser back/forward
    window.addEventListener('popstate', syncUrl)
    // Listen for programmatic URL changes (filter buttons)
    window.addEventListener('urlchange', syncUrl)

    return () => {
      document.removeEventListener('astro:page-load', syncUrl)
      window.removeEventListener('popstate', syncUrl)
      window.removeEventListener('urlchange', syncUrl)
    }
  }, [])

  const isItemActive = (itemHref: string) => activeUrl === itemHref
  const baseClass = 'nav-link nav-link-expand text-sm tracking-widest font-sans transition-colors inline-flex items-center gap-0.5'
  const activeClass = isActive
    ? 'text-[var(--sol-caramel)] nav-link-active-pill'
    : 'text-[var(--sol-charcoal)] hover:text-[var(--sol-caramel)]'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${baseClass} ${activeClass} cursor-pointer`}
          aria-current={isActive ? 'page' : undefined}
        >
          {label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="bg-[var(--sol-cream)] border-[var(--sol-sage)]/40 min-w-[140px]"
      >
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <a
              href={item.href}
              className={`font-sans text-xs tracking-widest cursor-pointer ${
                item.indent ? 'pl-3 opacity-70' : ''
              } ${
                isItemActive(item.href)
                  ? 'text-[var(--sol-caramel)] bg-[var(--sol-sage)]/15 opacity-100'
                  : 'text-[var(--sol-charcoal)] hover:text-[var(--sol-caramel)] hover:bg-[var(--sol-sage)]/20 hover:opacity-100'
              }`}
            >
              {item.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
