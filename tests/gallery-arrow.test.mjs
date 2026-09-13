/**
 * The arrow at the end of a row of examples, on both pages that print one.
 *
 * It is the same control twice on purpose: the home page taught the reader that
 * an arrow after the examples means the rest of them, and the 3D printing page
 * borrowed that rather than inventing a second way to say it. Two pages that
 * agree only by accident drift, so the agreement is asserted here.
 *
 * The name is the part worth guarding. The arrow has no text, and for a long
 * time the home page's copy carried a `title` and nothing else - which is the
 * last resort in the accessible name computation, honoured unevenly and absent
 * on a touch screen. An arrow with no words has to say where it goes some
 * other way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const PAGES = [
  { path: 'index.html', lang: 'en', page: 'home', gallery: '/gallery/made' },
  { path: 'no/index.html', lang: 'no', page: 'home', gallery: '/no/galleri/laget' },
  { path: '3d-printing/index.html', lang: 'en', page: '3d printing', gallery: '/gallery/made' },
  { path: 'no/3d-printing/index.html', lang: 'no', page: '3d printing', gallery: '/no/galleri/laget' },
];

for (const { path, lang, page, gallery } of PAGES) {
  test(`${lang}: the ${page} page's arrow goes to the gallery, and says so`, () => {
    const doc = loadPage(path).window.document;
    const arrows = [...doc.querySelectorAll('.more-arrow')];

    assert.equal(arrows.length, 1, 'one arrow, at the end of the examples');
    const [arrow] = arrows;
    assert.equal(arrow.getAttribute('href'), gallery);

    const name = arrow.getAttribute('aria-label');
    assert.ok(name, 'an arrow with no words still needs a name');
    assert.ok(name.trim().length > 0);

    // It is the last thing in the row of examples on both pages, which is what
    // makes "the rest of them" readable without a caption under it.
    assert.equal(arrow, arrow.parentElement.lastElementChild, 'in the last cell');
    assert.ok(arrow.previousElementSibling, 'after the examples it follows on from');
    assert.equal(arrow.textContent.trim(), '', 'and it is an arrow, not a worded link');
  });
}
