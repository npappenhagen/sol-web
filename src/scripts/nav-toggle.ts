/**
 * Mobile navigation toggle functionality.
 * Handles hamburger menu animation, backdrop, and View Transitions re-init.
 */

function initMobileMenu(): void {
  const toggle = document.getElementById('nav-toggle')
  const menu = document.getElementById('mobile-menu')
  const backdrop = document.getElementById('mobile-backdrop')
  const bar1 = document.getElementById('bar1') as HTMLElement | null
  const bar2 = document.getElementById('bar2') as HTMLElement | null
  const bar3 = document.getElementById('bar3') as HTMLElement | null

  if (!toggle || !menu) return

  // Reset menu state on page navigation
  let open = false
  menu.classList.add('hidden')
  menu.classList.remove('mobile-menu-open')
  backdrop?.classList.add('hidden')
  toggle.setAttribute('aria-expanded', 'false')
  if (bar1) bar1.style.transform = ''
  if (bar2) bar2.style.opacity = ''
  if (bar3) bar3.style.transform = ''

  // Clone to remove any existing listeners, then re-query
  const freshToggle = toggle.cloneNode(true) as HTMLElement
  toggle.parentNode?.replaceChild(freshToggle, toggle)
  const newToggle = document.getElementById('nav-toggle')

  const closeMenu = (): void => {
    open = false
    menu.classList.add('hidden')
    menu.classList.remove('mobile-menu-open')
    backdrop?.classList.add('hidden')
    newToggle?.setAttribute('aria-expanded', 'false')
    if (bar1) bar1.style.transform = ''
    if (bar2) bar2.style.opacity = ''
    if (bar3) bar3.style.transform = ''
  }

  newToggle?.addEventListener('click', () => {
    open = !open
    menu.classList.toggle('hidden', !open)
    menu.classList.toggle('mobile-menu-open', open)
    backdrop?.classList.toggle('hidden', !open)
    newToggle.setAttribute('aria-expanded', String(open))
    if (open) {
      if (bar1) bar1.style.transform = 'rotate(45deg) translateY(4px)'
      if (bar2) bar2.style.opacity = '0'
      if (bar3) bar3.style.transform = 'rotate(-45deg) translateY(-4px)'
    } else {
      if (bar1) bar1.style.transform = ''
      if (bar2) bar2.style.opacity = ''
      if (bar3) bar3.style.transform = ''
    }
  })

  // Close menu when clicking backdrop
  backdrop?.addEventListener('click', closeMenu)

  // Close menu when any link inside mobile menu is clicked
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu)
  })
}

// Run on initial load
initMobileMenu()

// Re-run after View Transitions navigation
document.addEventListener('astro:page-load', initMobileMenu)
