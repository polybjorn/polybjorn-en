/**
 * The vocabulary figure, which used to be an SVG and is now markup.
 *
 * The point of the change is that the words are real text: they reflow on a
 * phone, they can be selected and searched, and a screen reader reads the issue
 * in order rather than reading a caption about a picture. All of that only holds
 * if the spacing survives the build, and this site has been bitten there before
 * - the minifier welded a middot to the word after it when the space lived
 * inside a CSS `content` string. Here every space lives inside a span, which is
 * the shape that is safe from it, and this is what proves it stayed that way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const ARTICLE = 'projects/local-models-on-a-small-forge/index.html';
const doc = () => loadPage(ARTICLE).window.document;

test('the issue reads as a sentence, with single spaces between words', () => {
  const d = doc();
  assert.equal(d.querySelector('.vocab-title').textContent,
    'checks: service-state cannot see a StateDirectory from a packaged unit');
  assert.equal(d.querySelector('.vocab-body').textContent,
    'checks/service-state.nix cannot see a StateDirectory= that comes from a '
    + 'PACKAGED unit file, so the rowless-unit census #849 added asks its '
    + 'question of fewer units than the host has.');
});

test('every word carries exactly one rarity class', () => {
  const d = doc();
  const words = [...d.querySelectorAll('.vocab-title span, .vocab-body span')];
  assert.ok(words.length > 30, `only ${words.length} words, so the figure is not intact`);

  const inks = ['v-rare', 'v-mid', 'v-common', 'v-link'];
  for (const w of words) {
    const named = inks.filter(ink => w.classList.contains(ink));
    assert.equal(named.length, 1, `"${w.textContent}" carries ${named.length} inks: ${w.className}`);
  }
});

test('the key names every ink the text actually uses', () => {
  const d = doc();
  const used = new Set([...d.querySelectorAll('.vocab-title span, .vocab-body span')]
    .flatMap(w => [...w.classList]));
  const keyed = new Set([...d.querySelectorAll('.vocab-key .vocab-sw')]
    .flatMap(sw => [...sw.classList])
    .filter(c => c.startsWith('sw-'))
    .map(c => c.replace('sw-', 'v-')));

  assert.deepEqual([...used].sort(), [...keyed].sort(),
    'an ink in the text with no entry in the key is a colour nobody can read');
});

test('the article carries no image at all now', () => {
  // The whole figure was the last one. A regression here means the SVG came
  // back, and with it the 720px line breaks a phone cannot read.
  const d = doc();
  assert.equal(d.querySelectorAll('article img').length, 0);
  assert.equal(d.querySelectorAll('article .img-zoom').length, 0);
});
