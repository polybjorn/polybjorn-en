/**
 * The "work in progress" status on a project article.
 *
 * Three flags now describe a piece and they are deliberately orthogonal:
 * `draft` decides whether a route is built at all, `unlisted` decides whether
 * it appears on the listing, the feed and the sitemap, and `wip` decides what
 * a reader is told once they are looking at it. The case this exists for is
 * publishing something unfinished on purpose, which needs the third without
 * the first two.
 *
 * The badge is asserted in both places it appears, because they are separate
 * components with their own copies of the markup and the styling, and a change
 * to one has no way of reaching the other.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPage } from './helpers/page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'content', 'projects');

/** Slugs whose frontmatter sets wip, read from source rather than hardcoded. */
const wipSlugs = readdirSync(SRC)
  .filter(f => f.endsWith('.md'))
  .filter(f => /^wip:\s*true\s*$/m.test(readFileSync(join(SRC, f), 'utf8')))
  .map(f => f.replace(/\.md$/, ''));

/** Slugs kept off the listing, which changes what the listing test can assert. */
const unlisted = new Set(readdirSync(SRC)
  .filter(f => f.endsWith('.md'))
  .filter(f => /^unlisted:\s*true\s*$/m.test(readFileSync(join(SRC, f), 'utf8')))
  .map(f => f.replace(/\.md$/, '')));

test('a work-in-progress article says so under its title', () => {
  assert.ok(wipSlugs.length, 'no article sets wip, so this test proves nothing');

  for (const slug of wipSlugs) {
    const { window } = loadPage(`projects/${slug}/index.html`);
    const badge = window.document.querySelector('.meta .meta-wip');
    assert.ok(badge, `${slug}: no status in the article header`);
    assert.equal(badge.textContent.trim(), 'work in progress');
  }
});

test('an article that is not marked carries no status', () => {
  const all = readdirSync(SRC).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));
  const plain = all.filter(s => !wipSlugs.includes(s));
  assert.ok(plain.length, 'every article is a work in progress, so this proves nothing');

  for (const slug of plain) {
    const { window } = loadPage(`projects/${slug}/index.html`);
    assert.equal(window.document.querySelector('.meta-wip'), null, `${slug}: unexpected status`);
  }
});

test('the listing card carries the same status, when the piece is listed', () => {
  const { window } = loadPage('projects/index.html');
  const cards = [...window.document.querySelectorAll('li .card')];
  assert.ok(cards.length, 'the listing has no cards');

  for (const slug of wipSlugs) {
    const card = cards.find(c => c.getAttribute('href').endsWith(`/projects/${slug}`));

    // A plain build drops unlisted pieces from the listing, and npm test runs
    // a plain build, so the card is legitimately absent here. Rather than skip
    // and prove nothing, assert the pairing: off the listing only if unlisted,
    // and carrying the status whenever it is on. PREVIEW=1 lists everything,
    // which is the build that exercises the second half.
    if (!card) {
      assert.ok(unlisted.has(slug), `${slug}: missing from the listing without being unlisted`);
      continue;
    }

    const badge = card.querySelector('.meta .meta-wip');
    assert.ok(badge, `${slug}: on the listing with no status on its card`);
    assert.equal(badge.textContent.trim(), 'work in progress');
  }
});

/**
 * The separator's spacing has to survive the build.
 *
 * It was first written as `content: " \00b7 "`, which the minifier rewrote to
 * `content:" \00b7"`. The trailing space is not required to round-trip, so the
 * dot came out welded to the word after it and floating away from the one
 * before. Spacing on generated content belongs in a margin, where nothing is
 * entitled to drop it. This checks every middot separator in the build, not
 * just the two that exist now.
 */
test('every middot separator spaces itself with a margin', () => {
  const css = [
    ...readdirSync(join(ROOT, 'dist', '_astro'))
      .filter(f => f.endsWith('.css'))
      .map(f => readFileSync(join(ROOT, 'dist', '_astro', f), 'utf8')),
    ...['projects/index.html', 'projects/local-models-on-a-small-forge/index.html']
      .map(p => readFileSync(join(ROOT, 'dist', p), 'utf8')),
  ].join('\n');

  const blocks = css.match(/[^{}]*:before\{[^}]*\}/g) ?? [];
  const separators = blocks.filter(b => /content:\s*"[^"]*·/.test(b));
  assert.ok(separators.length, 'no middot separator in the build, so this proves nothing');

  for (const block of separators) {
    assert.match(block, /margin/, `separator relies on whitespace in content: ${block}`);
    assert.doesNotMatch(block, /content:\s*"\s+·|·\s+"/,
      `separator still pads inside content, which the minifier may strip: ${block}`);
  }
});
