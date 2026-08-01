import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';

export default defineConfig({
  site: 'https://polybjorn.com',
  // Astro 7 defaults this to 'jsx', which strips whitespace between adjacent
  // inline elements and silently changes rendered text. Keep the pre-7
  // behaviour; the same change closed the gaps around a separator in rovar-no
  // without failing the build.
  compressHTML: true,
  integrations: [sitemap({
    filter: (page) => !page.includes('/gallery/') && !page.includes('/galleri/'),
  })],
  vite: {
    plugins: [yaml()],
  },
});