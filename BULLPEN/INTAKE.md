# BULLPEN Intake — Unstructured Feedback → Actionable Plan

**Status:** Intake only. No implementation yet.

**Sources:** `backlog.md` (designer feedback), `WEBSITE WORK:.pdf.pdf` (client feedback)

**Delimiter convention:** 🦄 = already fixed (exclude from backlog) | 🚀 = to do

**Backlog verified:** All 10 designer items from `backlog.md` are mapped into INTAKE (nav, buttons, fonts, hero, services, portfolio).

**Constraint:** No debug data from Laurel's device. Sherlock from codebase only — evidence below is extracted from screenshots (images no longer needed).

---

## 0. 🔴 CRITICAL — Fix First

These block confidence in the site. Desktop works; mobile is the problem surface. **Constraint:** No debug data from Laurel's phone — investigate from codebase only (evidence in §5).

### 🦄 Laurel's device rendering bug (P0) — DONE

**Resolution:** Added `color-scheme: light only` to `:root` in global.css to prevent browser auto-dark mode. Added `overscroll-behavior: none` to body. Upgraded to Astro 6 ClientRouter. See TD-004.

**Resolved:** 2026-03-12

### 🦄 Mobile loading weirdness (P0) — DONE

**Resolution:** Root cause was Astro ViewTransitions calling `replaceState` on scroll, triggering mobile browser address bar show/hide. Upgraded to Astro 6 with new ClientRouter implementation. Added `overscroll-behavior: none` to prevent iOS bounce. See TD-006.

**Resolved:** 2026-03-12

### 🦄 Testimonials (P0) — DONE

**Resolution:** Added TestimonialsCarousel component to home page with 4 testimonials (Katie F., Natalie E., Maureen N., Jessica from Reclamation Retreat). CMS-editable via Sveltia at `/admin`. Auto-advances with pause on hover, crossfade transitions, dot navigation.

**Resolved:** 2026-03-12

### 🦄 "Event photography" in link preview (P0) — DONE

**Resolution:** Updated `SITE_DESCRIPTION` and `SERVICE_TYPES` in constants.ts, and JSON-LD in Layout.astro to say "retreat photography" instead of "event photography". See TD-005.

**Resolved:** 2026-03-12

---

## 1. Consolidated Feedback (Open Items)

### 🎯 Navigation & Links

| Item | Source | Notes |
|------|--------|-------|
| ~~Services → Branding anchor goes to bottom of page~~ | backlog | 🦄 FIXED via TD-007 |
| ~~Services → Portrait / Retreats in dropdown: anchor links broken~~ | backlog | 🦄 FIXED via TD-007 |
| ~~Portfolio → View All: goes to category picker, not grid~~ | backlog | 🦄 FIXED — removed redundant "View All" link from dropdown |
| ~~Remove links to gallery sections in service heading text~~ | backlog | 🦄 KEPT intentionally — clickable headings are good UX, View Portfolio button also exists |

### 🎨 Design & UX

| Item | Source | Notes |
|------|--------|-------|
| ~~Standardize button styles~~ | backlog | 🦄 FIXED via TD-008 — added arrow to INQUIRE |
| ~~WORK WITH ME button: add arrow like About "INQUIRE →"~~ | backlog | 🦄 FIXED via TD-008 |
| ~~Replace Montserrat~~ | backlog | 🦄 FIXED — swapped to DM Sans (cleaner, modern) |
| ~~Hero text over images: bigger, more impact~~ | backlog | 🦄 FIXED — bumped to text-6xl/8xl/9xl, raised bottom spacing |
| ~~Footer gradient: more padding~~ | backlog | 🦄 FIXED — increased `pb-20` to `pb-32` |
| ~~Menu on web view: nearly impossible to see~~ | PDF | 🦄 FIXED — nav now fully opaque (was 95%) |
| ~~Say Hello button covers "memory"~~ | PDF 60–61 | 🦄 FIXED — was symptom of rendering bug (TD-004) |

### 📱 Performance & Mobile

| Item | Source | Notes |
|------|--------|-------|
| ~~Not smooth scrolling on mobile~~ | PDF 60–61 | 🦄 FIXED via TD-006 (Astro 6 upgrade) |
| Some photos loaded slowly | PDF | TD-002 overlap |

### 📄 Services Page

| Item | Source | Notes |
|------|--------|-------|
| ~~View Portfolio vs Book Now: different heights~~ | backlog | 🦄 FIXED — both buttons now use `py-2.5` for consistent height |
| Curate galleries — feel too long on phone | backlog | **Needs design discussion.** Open conversation on curation approach. Option: Lightroom tags → photo sync → auto-include. Don't blindly implement. |

### 📄 Portfolio Page

| Item | Source | Notes |
|------|--------|-------|
| ~~View All~~ | backlog | 🦄 FIXED — removed redundant link from nav |

### 🦄 Likely Fixed (PDF — verify before skipping)

- Services: "every session custom designed" copy
- Portrait: remove "messy", 30min golden hour, rename half session, optional outfit change, remove print credits
- Branding: creators and artists first, 30min removed, half-day tier, "usable content" copy
- Portfolio: "presence and intention", retreats description

### 📝 Copy & Meta (PDF 27–30 — must do)

| Item | Source | Notes |
|------|--------|-------|
| ~~"Event photography" in link preview~~ | PDF 27–30 | 🦄 FIXED via TD-005 |
| ~~"Play" in copy~~ | PDF 27–30 | 🦄 FIXED — added to home intro: "make space for play. The light handles the rest." |

---

## 2. Sol-Web Maintainer Plan (Phases)

**Philosophy:** /antirez — minimal, local, one thing at a time.

### Phase 0: Critical (do first)

| Task | Action | Files (likely) |
|------|--------|----------------|
| Laurel's rendering bug (olive green) | Sherlock: theme-color, og:*, meta, prefers-color-scheme. No device debug. | `Layout.astro`, `global.css` |
| "Event photography" in link preview | Update og:description / meta description | `Layout.astro` |
| Mobile loading weirdness | Trace scroll, hydration, islands | `GalleryGrid`, `useProgressiveLoad`, `HeroCarousel` |
| Testimonials | Sveltia CMS + new page + nav + design | `config.yml`, new page, `Nav.astro` |

**Constraint:** No debug data from Laurel's phone. Infer from code only; evidence in §5.

**Commands:** `/sol-web understand "theme-color og meta"` and `"mobile scroll hydration"` before touching anything.

### Phase 1: Navigation & Links (high impact, low risk) — DONE

All items resolved:
- 🦄 Services dropdown anchors — FIXED via TD-007
- 🦄 Portfolio View All — FIXED (removed redundant link)
- 🦄 Service heading links — KEPT intentionally (good UX)

### Phase 2: Button & Layout Consistency (medium) — DONE

All items resolved:
- 🦄 Button styles standardized — TD-008
- 🦄 View Portfolio / Book Now height — both use `py-2.5`
- 🦄 WORK WITH ME arrow — TD-008

### Phase 3: Typography, Hero & Copy — DONE

All items resolved:
- 🦄 Montserrat replacement — swapped to DM Sans
- 🦄 Hero text size/margin — bumped to text-6xl/8xl/9xl with raised bottom spacing
- 🦄 "Play" in copy — FIXED: "make space for play. The light handles the rest."

### Phase 4: Footer & Menu Visibility — DONE

All items resolved:
- 🦄 Footer gradient — increased padding (`pb-32`)
- 🦄 Menu visibility — nav now fully opaque

### Phase 5: Performance & Mobile — MOSTLY DONE

- 🦄 Say Hello / memory overlap — FIXED via rendering bug fix (TD-004)
- 🦄 Smooth scrolling — FIXED via Astro 6 upgrade (TD-006)
- Photo load speed — **Open**: TD-002, progressive loading could be improved

### Phase 6: Content Curation (needs design)

| Task | Notes |
|------|-------|
| Gallery curation | **Needs Laurel input** — galleries feel long on mobile. Don't implement blindly. |

### Phase 7: SEO Enhancement — DONE

**Scope:** Improve structured data and local SEO for better search visibility.

**Phase 7a (quick wins) — DONE:**
- [x] Add Instagram/social links to JSON-LD `sameAs`
- [x] Enhance LocalBusiness schema (location: Guanacaste, CR)
- [x] Add AggregateRating from testimonials (5.0 stars, 4 reviews)
- [x] Add 24 service areas for local SEO (beach towns + resorts: Tamarindo, Playa Flamingo, Westin, Four Seasons, etc.)

**Phase 7b (page-specific schema) — DONE:**
- [x] ImageGallery schema on portfolio pages
- [x] Person schema on /about (Laurel)
- [x] Service schema on /services (per service)

**Phase 7c (polish) — DONE:**
- [x] Breadcrumb schema (all pages)
- [x] Alt text audit (GalleryGrid, CategoryGrid use title/tags)
- [x] Per-page OG images (portfolio covers, about headshot)

---

## 3. Tech Debt Overlap

Existing `docs/TECH_DEBT.md`:

- **TD-002** (image loading) — overlaps with "photos loaded slowly" and possibly mobile loading weirdness
- **TD-003** (global CSS) — may overlap with scroll/layout, theme-color, olive green bug

Consider adding P0 items to tech debt tracker for visibility.

---

## 4. Next Steps

**Phases 0-7 complete.**

1. 🦄 **"Play" in copy** — DONE: "make space for play. The light handles the rest."
2. 🦄 **Photo load speed (TD-002)** — DONE: CSS containment added
3. 🦄 **SEO Enhancement (Phase 7)** — DONE: Local SEO, page schemas, breadcrumbs, alt text, OG images
4. **Gallery curation** — needs Laurel input on curation approach, don't implement blindly

---

## 5. Screenshot Reference

| # | File | What it shows |
|---|------|---------------|
| 1 | `image-04142fb3...png` | Link preview when texting — dark green card, "event photography" in description |
| 2 | `image-fa5c511d...png` | Laurel's phone — olive green, "moments deserve to be held", "play" annotation |
| 3 | `image-2b06f99d...png` | Laurel's phone — olive green header, hamburger menu, golden-yellow line (scroll indicator?) |
| 4 | `image-22a13858...png` | **Correct** — cream/beige header, user's view |
| 5 | `image-80ddd177...png` | Say hello covers "memory" — layout bug (Laurel's rendering?) |
| 6 | `image-d14f6d7a...png` | **Correct** — Say hello does NOT cover memory, user's phone |

**Takeaway:** 4 and 6 = correct. 1, 2, 3, 5 = Laurel's device or link preview. Root cause likely in meta/theme/rendering.

---

## 6. Raw Extracts (Reference)

- `backlog.md` — designer feedback (full)
- `pdf_extracted.txt` — full PDF text (generated by intake script). **Key lines:** 27–30 (event photography, play), 60–61 (say hello, smooth scroll)
