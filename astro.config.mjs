import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://polybjorn.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/gallery/'),
  })],
});