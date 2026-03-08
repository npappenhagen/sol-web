// @ts-check
import { defineConfig } from 'astro/config'

import tailwindcss from '@tailwindcss/vite'

import cloudflare from '@astrojs/cloudflare'

import react from '@astrojs/react'

import mkcert from 'vite-plugin-mkcert'

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
// Use HTTP in dev when SKIP_HTTPS=1 (e.g. to debug "Failed to fetch" dynamic import)
const useHttps = process.env.SKIP_HTTPS !== '1'

export default defineConfig({
  site: 'https://solphotography.net',
  devToolbar: { enabled: false },
  vite: {
    server: { https: useHttps },
    plugins: [useHttps && mkcert(), tailwindcss()].filter(Boolean),
  },

  redirects: {
    '/portfolio/family': '/portfolio/portraits?filter=family',
    '/portfolio/couples': '/portfolio/portraits?filter=couples',
    '/portfolio/maternity': '/portfolio/portraits?filter=maternity',
  },

  adapter: cloudflare(),
  integrations: [react(), mdx(), sitemap()]
})