/**
 * Which of the chart's labels wears the accent.
 *
 * The figure used to invert what the prose above it teaches: `article a` is
 * blue and underlined, and inside the chart the blue sat on the terms that only
 * explain themselves while the real links wore plain body ink. This is the flip
 * held in place.
 *
 * It is a cascade question, so it is asked of the built page with the
 * stylesheets inlined. The labels come out of the article's markdown, which is
 * markup the component does not render itself - the exact case where an Astro
 * scoped selector silently matches nothing and the rule reads correct in the
 * source while the page ignores it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const ARTICLE = 'projects/local-models-on-a-small-forge/index.html';
const ACCENT = 'rgb(106, 174, 238)';   // #6AAEEE
const INK = 'rgb(221, 225, 231)';      // #dde1e7

const inks = () => {
  const dom = loadPage(ARTICLE, { styles: true });
  const { document } = dom.window;
  const ink = (selector) => dom.window.getComputedStyle(document.querySelector(selector));
  return {
    prose: ink('article > p a'),
    link: ink('.mchart-label a'),
    tip: ink('.mchart-tip'),
  };
};

test('a link in the chart is the same blue as a link in the prose', () => {
  const { prose, link } = inks();
  assert.equal(prose.color, ACCENT, 'the article link colour moved, so this test is measuring the wrong thing');
  assert.equal(link.color, ACCENT);
});

test('a term that only explains itself does not dress as a link', () => {
  const { tip } = inks();
  assert.equal(tip.color, INK);
  assert.notEqual(tip.color, ACCENT);
  assert.equal(tip.cursor, 'help');
});

test('neither carries a resting underline, which is what stacked rows cannot take', () => {
  // The links get one back on hover and keyboard focus, which jsdom cannot
  // reach. The tips carry a dotted rule instead: it is the only thing saying
  // there is an explanation here to a reader who never hovers.
  const { link, tip } = inks();
  assert.equal(link.textDecoration, 'none');
  assert.match(tip.textDecoration, /dotted/);
});
