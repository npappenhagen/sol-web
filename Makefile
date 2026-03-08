.PHONY: help setup dev build lint preview deploy deploy-preview check-env check-secrets sync-photos sync-photos-force sync-photos-fresh sync-cleanup process-cms verify-images

REQUIRED_VARS := $(shell grep -oE '^[A-Z_]+=' .env.example | sed 's/=$$//')

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

check-env: ## Validate required env vars are set
	@test -f .env || (echo "Missing .env -- run: make setup" && exit 1)
	@missing=""; for v in $(REQUIRED_VARS); do \
		grep -qE "^$$v=.+" .env || missing="$$missing $$v"; \
	done; \
	if [ -n "$$missing" ]; then \
		echo "Missing env vars:$$missing"; echo "See .env.example"; exit 1; \
	fi

check-secrets: ## Scan staged files for leaked secrets
	@files=$$(git diff --cached --diff-filter=ACM --name-only 2>/dev/null); \
	if [ -n "$$files" ] && echo "$$files" | xargs grep -lE '(re_[A-Za-z0-9_]{20,}|sk_[a-z]+_[A-Za-z0-9]{20,})' 2>/dev/null; then \
		echo "ABORT: Possible API key in staged files"; exit 1; \
	fi

setup: ## Install deps + create .env + media dirs
	pnpm install
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example -- fill in your values")
	@mkdir -p public/media/portfolio/{portraits,family,maternity,couples,branding,events,architecture} public/media/{mood,pages,site}

dev: check-env ## Start dev server (Astro + Axon)
	pnpm dev

dev-http: check-env ## Start dev server over HTTP (use if dynamic imports fail over HTTPS)
	SKIP_HTTPS=1 pnpm dev

lint: ## Run linter
	pnpm lint

build: check-env ## Production build
	pnpm build

preview: build ## Preview production build locally
	pnpm preview

deploy: build ## Deploy to Cloudflare Pages (production)
	pnpm wrangler pages deploy dist --project-name sol-web

deploy-preview: build ## Deploy preview branch to Cloudflare Pages
	pnpm wrangler pages deploy dist --project-name sol-web --branch preview

sync-photos: ## Sync photos from SMB share → public/media + update frontmatter
	python3 scripts/sync-photos.py

sync-photos-force: ## Force reprocess all photos (ignores manifest)
	python3 scripts/sync-photos.py --force

sync-photos-fresh: ## DELETE all portfolio images and sync from scratch
	@echo "⚠️  This will DELETE all images in public/media/portfolio and resync from SMB"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Removing manifest..."
	rm -f public/media/.manifest.json
	@echo "Removing portfolio images..."
	rm -rf public/media/portfolio/portraits/*
	rm -rf public/media/portfolio/family/*
	rm -rf public/media/portfolio/maternity/*
	rm -rf public/media/portfolio/couples/*
	rm -rf public/media/portfolio/branding/*
	rm -rf public/media/portfolio/events/*
	rm -rf public/media/portfolio/architecture/*
	rm -rf public/media/mood/*
	@echo "Running fresh sync..."
	python3 scripts/sync-photos.py --force

sync-cleanup: ## Remove orphaned images where source no longer exists
	python3 scripts/sync-photos.py --cleanup

process-cms: ## Generate WebP variants for CMS-uploaded images
	node scripts/process-cms-images.mjs

verify-images: ## Check all portfolio JPEGs have WebP variants
	./scripts/verify-images.sh
