import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';

// A preview served from a subpath needs every URL in the build to carry that
// prefix. Astro handles the ones it emits itself (the _astro bundle, and the
// font URLs inside the CSS) from `base`; scripts/prepare-preview.mjs handles
// the ones written by hand. Unset, this is '/' and the build is unchanged.
const previewBase = process.env.PREVIEW_BASE;

export default defineConfig({
  site: 'https://polybjorn.com',
  base: previewBase ?? '/',
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