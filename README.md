# Sol Photography

Photography portfolio and business site for Sol Photography.

**Live:** [solphotography.net](https://solphotography.net)

## Stack

- **Astro 5** — Static-first with SSR for API routes
- **Tailwind CSS v4** + shadcn/ui — React islands for interactive components
- **TypeScript** — Strict mode
- **Cloudflare Pages** — Static hosting + Workers for SSR
- **Sveltia CMS** — Git-based content management
- **Resend** — Transactional email

## Quick Start

```bash
pnpm install
pnpm dev           # https://localhost:4321
```

## Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Start dev server (HTTPS) |
| `pnpm build` | Build production site |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `make sync-photos` | Sync photos from SMB share |
| `make deploy` | Build + deploy to Cloudflare |

## CMS

Admin at `/admin`. Auth via GitHub Personal Access Token with `Contents: Read and write` on this repo.

Sveltia CMS manages:
- **Page content:** `src/content/pages/*.yaml`
- **Portfolio galleries:** `src/content/portfolio/*.md`

## Development

See `CLAUDE.md` for AI context, architecture decisions, and detailed component documentation.

### Code Intelligence

```bash
# First-time setup
pip install axoniq
axon analyze .

# Keep index fresh during development
pnpm dev:full
```

Axon MCP tools are auto-configured via `.mcp.json`.

## Photo Workflow

1. Export from Lightroom to SMB share (`/Volumes/sol/`)
2. `make sync-photos` copies files + extracts metadata
3. Edit in CMS at `/admin` if needed
4. `make deploy`

## Project Structure

```
src/
  components/    # Astro + React components
  content/       # CMS content (pages, portfolio)
  hooks/         # React hooks
  lib/           # Utilities (constants, validation, filters)
  pages/         # Route files
  styles/        # Global CSS + Tailwind
public/
  admin/         # Sveltia CMS config
  media/         # Images (gitignored, synced from SMB)
scripts/
  sync-photos.py # Photo sync + metadata extraction
```
