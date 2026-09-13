/**
 * The top right corner of a project article.
 *
 * Every page carries one link in that corner. On a page with a counterpart in
 * the other language it is the flag, and that is what articles used to show
 * too - pointing at a polybjorn.no path that is never built, so the flag took
 * the reader to a 404. Articles are English only, so the corner holds the
 * repository link instead, and the head no longer claims a Norwegian version.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPage } from './helpers/page.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/**
 * Astro compiles the layout's inline script into a module, and jsdom does not
 * execute those, so a scroll test against a freshly loaded page proves nothing.
 * This runs the one script that drives the corner as a classic script, then
 * scrolls. The flag test below is the control: if the harness stops working,
 * that is where it shows up.
 */
function scrollPast(page) {
  const { window } = loadPage(page);
  const script = [...window.document.querySelectorAll('script[type="module"]:not([src])')]
    .find(el => el.textContent.includes('corner-link'));

  assert.ok(script, 'the corner is no longer driven by an inline script');
  window.eval(script.textContent);
  Object.defineProperty(window, 'scrollY', { value: 400, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));

  return window.document.querySelector('.corner-link');
}

const articles = readdirSync(join(DIST, 'projects'), { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

test('there are articles to check', () => {
  assert.ok(articles.length > 0, 'no article was built, so the rest proves nothing');
});

for (const slug of articles) {
  const page = `projects/${slug}/index.html`;

  test(`${slug}: the corner link is the repository, not the flag`, () => {
    const doc = loadPage(page).window.document;
    const corner = doc.querySelectorAll('.corner-link');

    assert.equal(corner.length, 1, 'the corner holds one link or none, never two');
    assert.equal(doc.querySelectorAll('.lang-toggle').length, 0, 'the flag led to a page that is not built');
    assert.match(corner[0].href, /^https:\/\/github\.com\//);
    assert.equal(corner[0].target, '_blank');
    assert.ok(corner[0].getAttribute('aria-label'), 'an icon-only link needs a name');
  });

  test(`${slug}: the head does not point at a Norwegian version`, () => {
    const doc = loadPage(page).window.document;

    assert.equal(doc.querySelector('link[hreflang="no"]'), null);
    assert.match(doc.querySelector('link[rel="canonical"]').href, /^https:\/\/polybjorn\.com\//);
  });

  test(`${slug}: the repository button is gone from the bottom`, () => {
    const doc = loadPage(page).window.document;
    const buttons = [...doc.querySelectorAll('.link-buttons a')]
      .filter(a => /^https:\/\/github\.com\/polybjorn\//.test(a.href));

    // Prose is free to link the repository as many times as it reads well.
    // What moved into the corner is the button that used to close the page.
    assert.deepEqual(buttons.map(a => a.href), [], 'the button moved into the corner');
  });

  test(`${slug}: the corner link does not fade out on scroll`, () => {
    assert.equal(scrollPast(page).classList.contains('hidden'), false,
      'the flag hides once you read on, the repository link stays');
  });

  test(`${slug}: the corner link sits where the flag sat`, () => {
    const { window } = loadPage(page, { styles: true });
    const style = window.getComputedStyle(window.document.querySelector('.corner-link'));

    // The flag is 21px tall at top: 1rem, so its middle is 26.5px down. The
    // 28px-tall box centres a 24px icon on the same line.
    assert.equal(style.position, 'fixed');
    assert.equal(style.right, '16px');
    assert.equal(style.top, '12.5px');
    assert.equal(style.height, '28px');
  });
}

test('an article that still has other links keeps them at the bottom', () => {
  const doc = loadPage('projects/readest-highlights-plugin/index.html').window.document;
  const buttons = [...doc.querySelectorAll('.link-buttons a')];

  assert.deepEqual(
    buttons.map(a => a.href),
    ['https://community.obsidian.md/plugins/readest-highlights'],
    'only the repository link was meant to move',
  );
});

test('the flag is untouched on a page that has a Norwegian version', () => {
  const doc = loadPage('projects/index.html').window.document;
  const corner = doc.querySelector('.corner-link');

  assert.ok(corner.classList.contains('lang-toggle'));
  assert.ok(scrollPast('projects/index.html').classList.contains('hidden'),
    'and it still gets out of the way on scroll, which is what the article test is measured against');
  assert.equal(corner.getAttribute('href'), 'https://polybjorn.no/prosjekter');
  assert.ok(readFileSync(join(DIST, 'no/prosjekter/index.html'), 'utf8'), 'and it goes somewhere that is built');
});
