/**
 * The ring around the winning row of the methods chart.
 *
 * The chart shows one measure at a time and sorts inside each group, never
 * across them, so the best row is not the top row on screen - and the two views
 * do not agree on which row it is. Counting words plus the links already there
 * wins on quality; the shortest run is untuned BM25, twenty points off the top.
 * A ring that failed to move would therefore be a claim about the data rather
 * than a decoration, which is what these check.
 *
 * jsdom has no Web Animations API, so the page's own `still()` is true here and
 * the ring is drawn synchronously, unanimated. That is the same path a reader
 * who asked for less motion gets, and it is the only one a test can see.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const ARTICLE = 'projects/local-models-on-a-small-forge/index.html';
const EN = 'https://polybjorn.com/projects/local-models-on-a-small-forge/';

const article = () => loadPage(ARTICLE, { url: EN, runModules: true }).window.document;

/** The one row a ring is drawn inside, and the number it rings. */
const ringed = (doc) => {
  const rings = [...doc.querySelectorAll('.mchart svg.rough-annotation')];
  assert.equal(rings.length, 1, `${rings.length} rings on the chart, not one`);
  const row = rings[0].closest('.mchart-row');
  return {
    row,
    ring: rings[0],
    label: row.querySelector('.mchart-label').textContent.trim(),
    value: row.querySelector('.mchart-val').textContent.trim(),
  };
};

const press = (doc, mode) => doc.querySelector(`.mchart-modes button[data-mode="${mode}"]`).click();

const highest = (doc) => [...doc.querySelectorAll('.mchart-row[data-recall]')]
  .sort((one, two) => Number(two.dataset.recall) - Number(one.dataset.recall))[0];
const quickest = (doc) => [...doc.querySelectorAll('.mchart-row[data-secs]')]
  .sort((one, two) => Number(one.dataset.secs) - Number(two.dataset.secs))[0];

test('the quality view rings the highest recall', () => {
  const doc = article();
  const marked = ringed(doc);
  assert.equal(marked.row, highest(doc), `the ring sits on ${marked.label}`);
  assert.equal(marked.value, '67.2%');
});

test('the speed view rings the shortest run, which is a different row', () => {
  const doc = article();
  press(doc, 'speed');
  const marked = ringed(doc);
  assert.equal(marked.row, quickest(doc), `the ring sits on ${marked.label}`);
  assert.equal(marked.value, '0.2 s');
  assert.notEqual(marked.row, highest(doc),
    'the two views would agree, so the ring proves nothing by moving');
});

test('switching back and forth leaves one ring, on the row the view is showing', () => {
  // The ring is redrawn rather than moved, and the old one goes with the text of
  // the cell it was drawn in. A leak here would stack a ring per press.
  const doc = article();
  for (const mode of ['speed', 'recall', 'speed', 'recall']) press(doc, mode);
  assert.equal(ringed(doc).row, highest(doc));
  press(doc, 'speed');
  assert.equal(ringed(doc).row, quickest(doc));
});

test('the number inside the ring is still the number', () => {
  // It is drawn on a span the script wraps around the text, so the cell has to
  // read the same to anything that reads text - a screen reader, a search, a
  // reader selecting it.
  const doc = article();
  const val = ringed(doc).row.querySelector('.mchart-val');
  assert.equal(val.textContent, '67.2%');
  assert.equal(val.querySelector('span').textContent, '67.2%');
});

test('the ring is decorative, and says so', () => {
  const doc = article();
  const marked = ringed(doc);
  assert.equal(marked.ring.getAttribute('aria-hidden'), 'true');
  assert.equal(marked.ring.querySelector('path').getAttribute('stroke'), '#4CAF82',
    'the ring is drawn in the green the site already uses');
});
