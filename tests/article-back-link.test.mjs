/**
 * The back arrow on an article remembers which site the reader came from.
 *
 * Project articles are built only on polybjorn.com - src/components/ProjectsPage.astro
 * points the Norwegian cards at polybjorn.com/projects/<slug> - so one HTML file
 * serves a reader from either site and the arrow says /projects in the markup.
 * Following it from the Norwegian listing therefore landed on the English one.
 *
 * The referrer is what fixes it, and the cases below are the ones that decide
 * whether that is safe: an absent referrer has to leave the English link alone,
 * and a lookalike host must not be able to aim it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const ARTICLE = 'projects/local-models-on-a-small-forge/index.html';
const EN = 'https://polybjorn.com/projects/local-models-on-a-small-forge/';

/** The arrow's href after the page's own script has run. */
const backHref = (referrer) => loadPage(ARTICLE, { url: EN, referrer, runModules: true })
  .window.document.querySelector('.back-home').getAttribute('href');

test('arriving from the Norwegian listing sends the arrow back there', () => {
  assert.equal(backHref('https://polybjorn.no/prosjekter/'), 'https://polybjorn.no/prosjekter');
});

test('the origin alone is enough, which is all a cross-site referrer carries', () => {
  // Under the default referrer policy a cross-origin navigation sends the
  // origin and nothing else, so this is the shape the browser actually gives.
  assert.equal(backHref('https://polybjorn.no/'), 'https://polybjorn.no/prosjekter');
});

test('no referrer leaves the English link', () => {
  assert.equal(backHref(undefined), '/projects');
  assert.equal(backHref(''), '/projects');
});

test('arriving from the English site leaves the English link', () => {
  assert.equal(backHref('https://polybjorn.com/projects/'), '/projects');
});

test('a lookalike host cannot aim the arrow', () => {
  // A prefix test on the referrer string would hand this one the link.
  assert.equal(backHref('https://polybjorn.no.example.com/prosjekter/'), '/projects');
  assert.equal(backHref('http://polybjorn.no/prosjekter/'), '/projects');
});

test('the harness really is running the page script', () => {
  // Without this the tests above would pass on a page whose script never ran,
  // since the unchanged href is also the expected answer in three of them.
  //
  // The scroll handler, not the lightbox: that was the guard until this article
  // stopped carrying an image, and a guard that only holds while a page happens
  // to have a zoomable figure is not one. This handler is registered
  // unconditionally by the same script the arrow depends on.
  const { window } = loadPage(ARTICLE, { url: EN, runModules: true });
  const arrow = window.document.querySelector('.back-home');
  assert.equal(arrow.classList.contains('hidden'), false, 'the arrow starts visible');

  window.scrollY = 120;
  window.dispatchEvent(new window.Event('scroll'));
  assert.ok(arrow.classList.contains('hidden'),
    'the page script did not run, so the assertions above prove nothing');
});
