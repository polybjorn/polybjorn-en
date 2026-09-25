/**
 * The sitemap has to agree with the `unlisted` flag.
 *
 * `unlisted` lives in frontmatter, and @astrojs/sitemap's filter is handed a
 * URL with no access to it, so the exclusion is a hardcoded slug in
 * astro.config.mjs. Nothing keeps the two in step, and the failure is silent in
 * the direction that matters: publishing a piece by flipping the flag leaves it
 * on the listing and in the feed while still hidden from search engines, and
 * every page you look at says it worked.
 *
 * So this asserts the agreement rather than the config: every listed article is
 * in the sitemap, and every unlisted one is absent. Drafts are not built at all
 * and so cannot be asserted either way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'content', 'projects');

const flag = (body, name) => new RegExp(`^${name}:\\s*true\\s*$`, 'm').test(body);

const articles = readdirSync(SRC)
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const body = readFileSync(join(SRC, f), 'utf8');
    return { slug: f.replace(/\.md$/, ''), unlisted: flag(body, 'unlisted'), draft: flag(body, 'draft') };
  })
  .filter(a => !a.draft);

test('the sitemap lists exactly the articles that are not unlisted', () => {
  const xml = readFileSync(join(ROOT, 'dist', 'sitemap-0.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(locs.length, 'the sitemap has no entries');

  for (const { slug, unlisted } of articles) {
    const present = locs.some(l => l.includes(`/projects/${slug}`));
    if (unlisted) {
      assert.equal(present, false,
        `${slug} is unlisted but in the sitemap: add it back to the filter in astro.config.mjs`);
    } else {
      assert.equal(present, true,
        `${slug} is published but absent from the sitemap: drop its line from the filter in astro.config.mjs`);
    }
  }
});
