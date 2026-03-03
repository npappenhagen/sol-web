# Sol Photography — AI Context

Photography portfolio + business site for Sol Photography.

**Domain:** `solphotography.net`

## Stack

- **Astro 5** — static output (default); individual routes opt into SSR with `export const prerender = false`
- **Tailwind CSS v4** + shadcn/ui (React islands for interactive components only)
- **pnpm**
- **Sveltia CMS** — admin at `/admin`, config in `public/admin/config.yml`, GitHub backend
- **TypeScript strict**
- **Cloudflare Pages** — static hosting at `solphotography.net`; SSR routes (contact API) run as Cloudflare Workers
- **Resend** — transactional email (contact form); domain `solphotography.net` verified

## Design System

### Fonts

| Role | Intended font | Web placeholder (fontsource) | CSS var |
|------|--------------|------------------------------|---------|
| Display / headings | The Seasons *(commercial — must purchase + self-host)* | Cormorant Garamond | `--font-display` |
| Subheadings / UI | Montserrat | Montserrat ✓ installed | `--font-sans` |
| Body copy | Kulachat Serif *(premium — must purchase + self-host)* | Lora | `--font-serif` |

Fonts are imported in `src/styles/global.css`. When The Seasons and Kulachat Serif font files are provided, add them as `@font-face` in global.css and update the CSS variable references. Do not change the variable names — only the fallback stack.

### Brand Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--sol-steel` | `#6B9CAC` | Primary accent, links |
| `--sol-sage` | `#A8C5C5` | Light accent, borders |
| `--sol-forest` | `#2D5A3D` | Dark headings, hover states |
| `--sol-blush` | `#C9968A` | Warm accent |
| `--sol-caramel` | `#8B5E3C` | Secondary warm, buttons |
| `--sol-cream` | `#F5F0E8` | Page background |
| `--sol-charcoal` | `#2A2A2A` | Body text |

Use via `var(--sol-*)` in CSS or mapped Tailwind theme tokens.

## Site Structure

| Route | Page | Nav label |
|-------|------|-----------|
| `/` | Home — hero, intro, service preview, stats | HOME |
| `/about` | About the photographer | ABOUT |
| `/portfolio` | Category index (full-bleed panels) | PORTFOLIO |
| `/portfolio/[slug]` | Individual gallery set + lightbox | — |
| `/services` | Services + pricing (portrait, branding, retreats, architecture) | SERVICES |
| `/contact` | Inquire / contact form (SSR → Resend via Cloudflare Worker) | INQUIRE |
| `/admin` | Sveltia CMS admin (noindex) | — |

## Portfolio Categories

```
portraits    — public gallery. Big bucket: family, maternity, couples (sub-tags from Lightroom)
branding     — public gallery. Standalone bucket.
events       — internal category name. Only "Retreats" surfaced on UI for now.
architecture — exists in schema but NOT surfaced on UI yet (no photos).
mood         — NOT a gallery. Internal image pool for heroes, banners, lifestyle flair.
```

Sub-tags on portraits (family, couples, maternity) are Lightroom keywords stored in an optional `tags` field on each portfolio `.md`. They enable future filtering but the gallery page is one unified "Portrait" page.

CategoryGrid and Nav show only: **Portrait**, **Branding**, **Retreats**.

## Sveltia CMS Strategy

**Rule: Layout = code. Copy + images = CMS.**

There is no journal or blog. Sveltia manages two kinds of content:

### 1. Page singletons (`files` collection)
One YAML file per page in `src/content/pages/`. Loaded in Astro with `getEntry('pages', 'home')`. Every headline, body paragraph, stat, and image path on static pages is editable here without touching code.

Files:
- `src/content/pages/home.yaml` — hero images, headings, intro copy, stats, featured gallery slugs
- `src/content/pages/about.yaml` — hero image, bio, headshot, subheading
- `src/content/pages/services.yaml` — list of services with images, copy, pricing notes

### 2. Portfolio galleries (`folder` collection)
One Markdown file per gallery set in `src/content/portfolio/`. Fields: title, category, cover, images[], tags[], date, featured.

Sveltia config lives in `public/admin/config.yml`. The `pages` collection uses `files:` type; `portfolio` uses `folder:` type.

### CMS Authentication

Auth method: **Personal Access Token**. Visit `/admin`, click "Sign In with Token", paste a GitHub PAT with `Contents: Read and write` scoped to `npappenhagen/sol-web`. The token is stored in browser local storage.

Access control: the repo is **private**. Only GitHub accounts with write access can use the CMS. No OAuth app, no proxy, no additional infra needed.

## Component Map

```
src/
  components/
    layout/
      Nav.astro          # split nav — left links, centered wordmark, right links
      Footer.astro       # social, copyright, site nav
    home/
      Hero.astro         # full-bleed image(s) with overlay heading
      IntroBlock.astro   # eyebrow label + heading + body ("WHY SOL")
      StatsBar.astro     # horizontal numbers row
      ServicePreview.astro  # 4-up service category grid → /services
    portfolio/
      CategoryGrid.astro # full-bleed clickable category panels (portraits, branding, retreats)
      GalleryGrid.tsx    # React island — masonry grid + lightbox
    shared/
      SectionLabel.astro # small uppercase tracking eyebrow label
  content/
    pages/               # data collections (type: 'data') — Sveltia singletons
      home.yaml
      about.yaml
      services.yaml
    portfolio/           # content collection (type: 'content') — folder of .md files
      portraits.md
      branding.md
      events.md
      architecture.md
  pages/
    index.astro          # composes home/* components
    about.astro
    portfolio/
      index.astro        # renders CategoryGrid
      [slug].astro       # renders GalleryGrid
    services/
      index.astro
    contact.astro
    api/
      contact.ts         # Resend email handler (prerender = false)
    admin/
      index.astro        # Sveltia CMS shell
  layouts/
    Layout.astro         # head, Nav, slot, Footer
  styles/
    global.css
scripts/
  sync-photos.py         # sync from SMB share → public/media + update frontmatter
```

## Image Organization

All images live in `public/media/` (gitignored) and are referenced as string paths (not Astro `image()` imports).

```
public/media/
  portfolio/
    portraits/       # 2026-portrait-portfolio-*.jpg (Lightroom filenames)
    branding/        # 2026-branding-portfolio-*.jpg
    events/          # 2026-retreat-portfolio-*.jpg
    architecture/    # future
  mood/              # 2026-mood-portfolio-*.jpg (internal use, not a gallery)
  pages/             # page-level: home-hero.jpg, about-hero.jpg, headshot.jpg, service-*.jpg
  site/              # og-image.jpg, brand assets
```

Portfolio `.md` frontmatter references images as `/media/portfolio/portraits/2026-portrait-portfolio-001.jpg`. Page YAML singletons reference `/media/pages/about-hero.jpg`. CategoryGrid uses the first image in each portfolio as the cover.

### Photo Sync Workflow

Source of truth: SMB share at `/Volumes/sol/`.

```
/Volumes/sol/
  portrait-portfolio/web size/   → public/media/portfolio/portraits/
  branding-portfolio/web size/   → public/media/portfolio/branding/
  retreat-portfolio/web size/    → public/media/portfolio/events/
  mood-portfolio/                → public/media/mood/
```

Workflow:
1. Export from Lightroom → SMB share (web-size JPEGs, Lightroom naming convention)
2. `make sync-photos` — copies files + reads XMP keywords → updates frontmatter images[] and tags[]
3. Open Sveltia CMS at `/admin` to reorder, remove, or pick a different cover
4. Commit + `make deploy`

The sync script (`scripts/sync-photos.py`) reads `dc:subject` XMP tags from each JPEG and stores them in the `tags` field, filtering out generic terms like "portfolio" and "portrait".

## SEO

- `@astrojs/sitemap` generates `sitemap-index.xml` at build
- `public/robots.txt` allows all crawlers, disallows `/admin`, points to sitemap
- `Layout.astro` includes: canonical URL, OG tags, Twitter Card, JSON-LD (`ProfessionalService`), `theme-color`
- Per-page OG image via `image` prop on `<Layout>`, falls back to `/media/site/og-image.jpg`

## Code Philosophy

- Boring > clever. Minimal files, no premature abstraction.
- Astro components (`.astro`) first. React only for interactive islands (lightbox, contact form).
- Use Astro's built-in `<Image>` for every locally-sourced image. CMS images (from `public/media/`) use plain `<img>` with `loading="lazy"`.
- Pages are static by default. Only `export const prerender = false` + API routes run as Workers.
- Tailwind utility classes + CSS vars. No inline styles, no CSS-in-JS.
- No `any` in TypeScript. Infer from Zod schemas when possible.

## Code Intelligence — Use Axon MCP First

When exploring the codebase, refactoring, or planning changes:

1. `axon_query` — search by name or concept
2. `axon_context` — full picture of a symbol (callers, callees, types)
3. `axon_impact` — blast radius before changing anything

Run `pnpm dev:full` (Astro + Axon watch). First time: `pip install axoniq && axon analyze .`
