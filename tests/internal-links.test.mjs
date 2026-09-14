/**
 * Every root-relative link in the built site points at something that exists.
 *
 * This is the failure the corner link test was written for: articles carried
 * the language flag, which pointed at a polybjorn.no path that is never built,
 * so the flag took the reader to a 404. That was caught by hand and pinned
 * with a test about that one control on that one kind of page. The class is
 * wider than the instance - any href can name a route that no longer exists,
 * and nothing about the build objects.
 *
 * Static parse rather than the jsdom harness: this asks a question about the
 * file tree, not about the page's behaviour, and there are enough pages that
 * the difference is worth having.
 *
 * Scope is deliberately internal. External links rot too, but checking them
 * needs the network, and a gate that fails because someone else's server is
 * down is a gate people learn to ignore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function builtPages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return builtPages(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

/** A route resolves if it is a file, a directory with an index, or `x.html`. */
const resolves = href => {
  const path = href.replace(/\/$/, '');
  return [join(DIST, path), join(DIST, path, 'index.html'), join(DIST, `${path}.html`)]
    .some(existsSync);
};

const pages = builtPages();

test('there are pages to check', () => {
  assert.ok(pages.length > 0, 'nothing was built, so the rest proves nothing');
});

test('every internal link and asset resolves to a built file', () => {
  const dead = [];
  let checked = 0;

  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    // Root-relative only. `//example.com` is protocol-relative and external,
    // and a fragment or query says nothing about which file serves it.
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
      if (href.startsWith('//')) continue;
      checked++;
      if (!resolves(href)) dead.push(`${relative(DIST, file)} -> ${href}`);
    }
  }

  assert.ok(checked > 0, 'no internal links were found at all, which is itself wrong');
  assert.deepEqual([...new Set(dead)], []);
});
