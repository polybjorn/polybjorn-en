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
  // Unlisted entries are named here rather than read from the content, because
  // the sitemap filter runs on URLs and has no access to frontmatter. One line
  // per unlisted slug; without it 'unlisted' would only mean 'not linked from
  // my own pages' while still being handed to search engines.
  integrations: [sitemap({
    filter: (page) => !page.includes('/gallery/')
      && !page.includes('/galleri/')
      && !page.includes('/projects/local-models-on-a-small-forge'),
  })],
  vite: {
    plugins: [yaml()],
  },
});