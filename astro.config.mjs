// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

import mkcert from 'vite-plugin-mkcert';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://solphotography.net',
  devToolbar: { enabled: false },
  vite: {
    plugins: [mkcert(), tailwindcss()]
  },

  adapter: cloudflare(),
  integrations: [react(), mdx(), sitemap()]
});