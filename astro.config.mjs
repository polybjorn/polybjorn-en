import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';

export default defineConfig({
  site: 'https://polybjorn.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/gallery/'),
  })],
  vite: {
    plugins: [yaml()],
  },
});