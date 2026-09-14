/**
 * Every link and button on every built page has a name.
 *
 * Two controls on this site were named by a `title` attribute and nothing
 * else - the home page's gallery arrow and the language toggle, both of them
 * an icon with no text. A `title` is the last resort in the accessible name
 * computation, honoured unevenly by screen readers and absent entirely on a
 * touch screen, which is most of the traffic here. Both were found by hand,
 * one at a time, months apart.
 *
 * This is that search done exhaustively and kept. It walks every page rather
 * than a named few, so the next icon-only control is caught when it is added
 * rather than when someone happens to look.
 *
 * Pages are loaded through the harness that runs their scripts, because at
 * least one link is filled in at runtime: the 404 page picks its language from
 * the hostname and writes its own text, so read statically it looks nameless
 * and is not.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPage } from './helpers/page.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function builtPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return builtPages(full);
    return entry.name.endsWith('.html') ? [relative(DIST, full)] : [];
  });
}

/**
 * What a screen reader would announce, in the order the accname computation
 * consults: aria-label, aria-labelledby, the element's own text, the alt text
 * of an image inside it, an SVG's own <title>. `title` is deliberately not in
 * this list - the point of the test is that it is not enough on its own.
 */
function accessibleName(el) {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  if (el.getAttribute('aria-labelledby')) return 'labelledby';
  if (el.textContent.trim()) return el.textContent.trim();
  const img = el.querySelector('img[alt]:not([alt=""])');
  if (img) return img.getAttribute('alt');
  const svgTitle = el.querySelector('svg title');
  if (svgTitle && svgTitle.textContent.trim()) return svgTitle.textContent.trim();
  return null;
}

const pages = builtPages();

test('there are pages to check', () => {
  assert.ok(pages.length > 0, 'nothing was built, so the rest proves nothing');
});

for (const page of pages) {
  test(`${page}: every control says what it does`, () => {
    const doc = loadPage(page).window.document;
    const controls = [...doc.querySelectorAll('a[href], button, [role="button"], input[type="submit"]')]
      .filter(el => el.getAttribute('aria-hidden') !== 'true');

    const unnamed = controls
      .filter(el => !accessibleName(el))
      .map(el => `<${el.tagName.toLowerCase()} class="${el.className}" title="${el.getAttribute('title') ?? ''}">`);

    assert.deepEqual(unnamed, [], `unnamed on ${page}`);
  });
}
