# Tech Debt Tracker

Track technical debt for the Sol Photography website (`src/` scope only).

## How to Use

**Add debt:** When you notice something that needs fixing but can't address now.
**Close debt:** When an item is fully resolved or no longer relevant.
**Review regularly:** Before starting new features, check if related debt should be addressed first.

## Priority Definitions

- **high** — Actively causing problems or blocking features
- **medium** — Should be fixed soon, degrades quality
- **low** — Nice to have, address when convenient

## Categories

- **cleanup** — Dead code, unused imports, redundant logic
- **performance** — Slow renders, large bundles, inefficient queries
- **ux** — User experience issues, accessibility gaps
- **architecture** — Structural issues, tight coupling, unclear boundaries
- **security** — Potential vulnerabilities, missing validation

---

## Open

### TD-003: Global CSS file size (low)
**Category:** performance
**Location:** `src/styles/global.css` (27KB)
**Description:** Largest file in src/. Review for unused styles, potential extraction, or Tailwind optimization.
**Added:** 2026-03-12

---

## Resolved

### TD-004: Laurel's device rendering bug — olive green instead of cream
**Resolution:** Added `color-scheme: light only` to `:root` in global.css to prevent browser auto-dark mode. Added `overscroll-behavior: none` to body. Upgraded to Astro 6 ClientRouter.
**Resolved:** 2026-03-12

### TD-005: "Event photography" in link preview — wrong copy
**Resolution:** Updated `SITE_DESCRIPTION` and `SERVICE_TYPES` in constants.ts, and JSON-LD in Layout.astro to say "retreat photography" instead of "event photography".
**Resolved:** 2026-03-12

### TD-006: Mobile scroll/loading weirdness
**Resolution:** Root cause was Astro ViewTransitions calling `replaceState` on scroll, triggering mobile browser address bar show/hide. Upgraded to Astro 6 with new ClientRouter implementation. Added `overscroll-behavior: none` to prevent iOS bounce.
**Resolved:** 2026-03-12

### TD-007: Services dropdown anchors broken
**Resolution:** Added `id` attributes to service section wrappers in services/index.astro with `scroll-mt-24` for nav offset. Anchors now work: `#portraits`, `#branding`, `#events`.
**Resolved:** 2026-03-12

### TD-008: Button style inconsistency
**Resolution:** Added arrow icon to INQUIRE link in Nav.astro (desktop and mobile) matching About page `cta-arrow` pattern. Increased footer padding from `pb-20` to `pb-32` for better spacing. Button variants (outlined, solid, gradient) kept distinct by purpose.
**Resolved:** 2026-03-12

### TD-009: Mobile scroll jank on services page (high)
**Resolution:** Removed `content-visibility: auto` from sections in global.css. This CSS property was causing the browser to defer rendering of off-screen sections, but when combined with React islands using `client:visible` (ServiceBento, ServiceCarousel), it created a chain reaction:
1. User scrolls and stops
2. Browser begins rendering deferred sections (shows loading bar in Chromium)
3. React islands hydrate and run ResizeObservers
4. Layout recalculation causes scroll position "jerk/magnet" effect

Also scoped `scroll-behavior: smooth` to only apply during anchor navigation (`:has(:target)`) to prevent interference with browser scroll restoration.

Native image `loading="lazy"` still handles image lazy loading. Gallery images retain `contain: layout style` for hover effects.
**Resolved:** 2026-03-13

### TD-002: Review image loading strategy
**Resolution:** Added CSS containment to `global.css` for scroll performance:
- `content-visibility: auto` on sections below fold (defers paint)
- `contain: layout style` on gallery images (prevents reflow cascades)
- `will-change` hints on scroll-animated elements (GPU acceleration)
- Lazy images get `content-visibility: auto` for paint containment

**Note:** `content-visibility: auto` on sections was later removed in TD-009 due to causing mobile scroll jank.
**Resolved:** 2026-03-12

### TD-001: Consolidate lib/ utilities
**Resolution:** Audited lib/ with Axon dead code analysis. Deleted 2 dead files:
- `gallery-layout.ts` — duplicate of GalleryGrid's internal `computeJustifiedLayout`
- `data-loaders.ts` — all exports (`loadPageEntry`, `loadPortfolioGallery`, etc.) never imported
Verified build passes after removal.
**Resolved:** 2026-03-12

<!--
Template for resolved items:

### TD-XXX: [Title]
**Resolution:** How it was fixed
**Resolved:** YYYY-MM-DD
-->
