# Sol-web

Astro + pnpm + Tailwind + Cloudflare + shadcn + Sveltia CMS.

**Sveltia CMS:** Admin at `/admin`. Sveltia requires HTTPS — dev server runs at `https://localhost:4321`. Open `https://localhost:4321/admin` in Chrome/Edge/Brave. Auth via GitHub Personal Access Token — click "Sign In with Token" and paste a PAT with `Contents: Read and write` on this repo.

**Axon (code intelligence):** `pip install axoniq` → `axon analyze .` (use `--no-embeddings` for faster index) → run `pnpm dev:full` to keep index fresh. Claude/Cursor MCP config in `.claude/settings.json`.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`             | Starts dev server at `https://localhost:4321`    |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm lint`            | Run ESLint (also runs on pre-commit via husky)   |
| `pnpm dev:full`        | Astro + Axon watch (keeps code index fresh for MCP) |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
