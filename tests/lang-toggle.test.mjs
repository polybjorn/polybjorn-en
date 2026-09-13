/**
 * The flag in the corner, on every page that has a counterpart to switch to.
 *
 * It is the only control for changing language on this site, and for a long
 * time the only thing naming it was a `title` on the link: the flag is an
 * inline SVG with no text, no role and no title of its own. A `title`
 * attribute is the last resort in the accessible name computation, honoured
 * unevenly, and there is no tooltip on a touch screen - which is most of the
 * traffic here. So the link carries its own name.
 *
 * The name is written in the language it leads to, which is the convention a
 * reader of that language recognises, and the link is marked `lang` and
 * `hreflang` so it is announced in that language rather than read as if it
 * were an English word. The visible `title` stays the short form and is
 * contained in the name, so the two do not contradict each other.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPage } from './helpers/page.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/** Every built page, so a new one cannot quietly ship without a named toggle. */
function pages(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return pages(full);
    return entry.name === 'index.html' ? [relative(DIST, full)] : [];
  });
}

const NAMES = {
  no: { title: 'Norsk', label: 'Bytt til norsk' },
  en: { title: 'English', label: 'Switch to English' },
};

const built = pages();

test('there are pages to check', () => {
  assert.ok(built.length > 0, 'nothing was built, so the rest proves nothing');
});

const withToggle = built.filter(page => loadPage(page).window.document.querySelector('.lang-toggle'));

test('the toggle is on the pages that come in two languages', () => {
  // Articles are English only and show the repository link in that corner
  // instead, so this is a subset - but not an empty one.
  assert.ok(withToggle.length > 0, 'no page has a language toggle any more');
});

for (const page of withToggle) {
  test(`${page}: the language toggle says where it goes`, () => {
    const toggle = loadPage(page).window.document.querySelector('.lang-toggle');
    const lang = toggle.getAttribute('lang');

    assert.ok(NAMES[lang], `an unexpected target language: ${lang}`);
    const { title, label } = NAMES[lang];

    assert.equal(toggle.getAttribute('aria-label'), label, 'the flag has no words of its own');
    assert.equal(toggle.getAttribute('hreflang'), lang, 'and the href is marked with the language it leads to');
    assert.equal(toggle.getAttribute('title'), title);
    assert.ok(label.toLowerCase().includes(title.toLowerCase()), 'the tooltip is part of the name, not a second one');

    // The flag is decoration behind that name. Exposed, it contributed a pile
    // of unnamed shapes to the link instead.
    const flag = toggle.querySelector('svg');
    assert.ok(flag, 'the flag is gone');
    assert.equal(flag.getAttribute('aria-hidden'), 'true');
    assert.equal(toggle.textContent.trim(), '', 'the toggle is a flag, not a worded link');
  });
}
