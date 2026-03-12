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

### TD-001: Audit and consolidate lib/ utilities (medium)
**Category:** cleanup
**Location:** `src/lib/`
**Description:** Several utility files may have overlapping or unused functions. Run `axon_dead_code` to identify candidates for removal. Consolidate related utilities.
**Added:** 2026-03-12

### TD-002: Review image loading strategy (medium)
**Category:** performance
**Location:** `src/components/portfolio/GalleryGrid.tsx`, `src/components/home/HeroCarousel.tsx`
**Description:** Multiple image loading approaches exist (progressive load hook, lazy attributes, carousel config). Audit for consistency and potential simplification.
**Added:** 2026-03-12

### TD-003: Global CSS file size (low)
**Category:** performance
**Location:** `src/styles/global.css` (27KB)
**Description:** Largest file in src/. Review for unused styles, potential extraction, or Tailwind optimization.
**Added:** 2026-03-12

### TD-008: Button style inconsistency (medium)
**Category:** ux
**Location:** Various button components
**Description:** Round vs square vs text vs arrow buttons inconsistent across site. WORK WITH ME missing arrow like INQUIRE →. Standardize pattern.
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

<!--
Template for resolved items:

### TD-XXX: [Title]
**Resolution:** How it was fixed
**Resolved:** YYYY-MM-DD
-->
