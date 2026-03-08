/**
 * Shared navigation links used across Nav and Footer.
 * Single source of truth for site navigation structure.
 */

export interface NavLink {
  href: string
  label: string
  /** Force full page reload (used for hash links with View Transitions) */
  reload?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'HOME' },
  { href: '/about', label: 'ABOUT' },
  { href: '/portfolio', label: 'PORTFOLIO' },
  { href: '/services', label: 'SERVICES' },
  { href: '#inquiry', label: 'INQUIRE', reload: true },
]
