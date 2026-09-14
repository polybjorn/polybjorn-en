/**
 * Whether the receipt's styling actually applies.
 *
 * This file exists because of a specific bug. Everything inside the receipt is
 * created by script at submit time, and a script-created node does not carry
 * Astro's scope attribute - so `.receipt-heading { }` in the component compiled
 * to `.receipt-heading[data-astro-cid-...]` and matched nothing on the page. It
 * shipped, and the receipt rendered as unstyled text.
 *
 * Nothing that reads the DOM can catch that: the markup is identical whether a
 * rule applied or never matched. These ask the cascade instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fillSample } from '../src/dev/fill-sample.js';
import { PAGES, loadPage, settle, stubFetch, jsonResponse } from './helpers/page.mjs';

const PAGE_BACKGROUND = 'rgb(35, 39, 46)';
const ACCENT = 'rgb(106, 174, 238)';
const DIMMED = 'rgb(154, 162, 173)';

async function sentPage(path) {
  const dom = loadPage(path, { styles: true });
  stubFetch(dom.window, jsonResponse(201, { ok: true, id: 'test' }));
  fillSample(dom.window.document);
  dom.window.document.getElementById('intake-form').requestSubmit();
  await settle(dom.window);
  const { window } = dom;
  return { window, doc: window.document, css: el => window.getComputedStyle(el) };
}

for (const { path, lang } of PAGES) {
  test(`${lang}: the receipt is one card in the page's own style`, async () => {
    const { doc, css } = await sentPage(path);
    const receipt = doc.getElementById('sent-receipt');

    assert.equal(css(receipt).backgroundColor, PAGE_BACKGROUND, 'the same card the form sections use');
    assert.ok(doc.querySelectorAll('#sent-receipt .receipt-section').length > 1, 'several sections inside it');

    const second = doc.querySelectorAll('#sent-receipt .receipt-section')[1];
    assert.equal(css(second).borderTopWidth, '1px', 'sections are divided by a rule, not by being separate cards');
  });

  test(`${lang}: answers lay out in columns, and a long one spans them`, async () => {
    const { doc, css } = await sentPage(path);

    const list = doc.querySelector('#sent-receipt .receipt-list');
    assert.equal(css(list).display, 'grid');

    // The description is always long enough to take the full width. If this
    // fails, the measurement in isWide() has drifted from the sample answer.
    const wide = doc.querySelector('#sent-receipt .receipt-item-wide');
    assert.ok(wide, 'the description should not be squeezed into a column');
    assert.equal(css(wide).gridColumn.replace(/\s+/g, ''), '1/-1');
  });

  test(`${lang}: headings, labels and values are styled`, async () => {
    const { doc, css } = await sentPage(path);

    const heading = doc.querySelector('#sent-receipt .receipt-heading');
    assert.equal(css(heading).textTransform, 'uppercase');
    assert.equal(css(heading).color, ACCENT);

    const term = doc.querySelector('#sent-receipt dt');
    assert.equal(css(term).color, DIMMED, 'a label reads quieter than its answer');

    const value = doc.querySelector('#sent-receipt dd');
    assert.equal(css(value).whiteSpace, 'pre-wrap', 'a description keeps its own line breaks');
    assert.equal(css(value).marginLeft, '0px', "the browser's default dd indent is off");
  });

  test(`${lang}: the confirmation is the heading, not a line under the old one`, async () => {
    const { doc, css } = await sentPage(path);

    // The status element keeps the text for a screen reader, because a changed
    // heading is announced to nobody - but it must not be a second visible copy
    // of what the h1 now says. That depends on a scoped class applying to it,
    // which is exactly the kind of thing that silently does not.
    const status = doc.getElementById('sent-message');
    assert.equal(css(status).position, 'absolute');
    assert.equal(css(status).width, '1px');
    assert.equal(doc.querySelector('.hero h1').textContent.trim(), status.textContent.trim());
  });

  test(`${lang}: the file field is named once on screen, twice underneath`, async () => {
    const dom = loadPage(path, { styles: true });
    const doc = dom.window.document;
    const field = doc.querySelector('[data-field="fileUpload"]');

    // The button is the only visible name: a heading above it saying the same
    // thing was the instruction twice.
    assert.ok(field.querySelector('.file-trigger').textContent.trim().length > 0);

    // The text survives, because the receipt reads .field-label for the
    // attachments row and a screen reader wants the heading too.
    const label = field.querySelector('.field-label');
    assert.ok(label, 'removing it would leave the attachments row unnamed');
    assert.equal(label.tagName, 'SPAN', 'a second <label for> would join the control name, where it was redundant');

    const style = dom.window.getComputedStyle(label);
    assert.equal(style.position, 'absolute');
    assert.equal(style.width, '1px');
  });

  test(`${lang}: the submit warning is centred, not pinned to Send`, async () => {
    const dom = loadPage(path, { styles: true });
    dom.window.fetch = async () => { throw new Error('offline'); };
    fillSample(dom.window.document);
    dom.window.document.getElementById('intake-form').requestSubmit();
    await settle(dom.window);

    const box = dom.window.document.getElementById('submit-error');
    const style = dom.window.getComputedStyle(box);
    assert.equal(box.hidden, false);
    assert.equal(style.marginLeft, 'auto');
    assert.equal(style.marginRight, 'auto');
    assert.equal(style.width, 'fit-content', 'centring only reads as centring while the box is its content width');
  });
}

/**
 * The contact block reads as two groups - who someone is, then how to reach
 * them - and reads the same way in the receipt as in the brief (#28).
 *
 * This is pinned because the two documents used to agree by coincidence. The
 * brief walks BASE_FIELDS; the receipt used to walk the DOM, and the DOM is a
 * two-column grid whose rows pair an identity field with a contact one. The
 * two orders happened to match, so nothing looked wrong - and reordering
 * either one alone would have silently desynced the copy a client keeps from
 * the brief filed against it.
 */
const CONTACT_ORDER = [
  'contactName',
  'contactCompany',
  'contactLocation',
  'contactPhone',
  'contactSignal',
  'contactEmail',
];

test('the declared field order is the grouped one, identity before contact methods', async () => {
  const { BASE_FIELDS } = await import('../src/data/intakeForm.js');
  const contact = BASE_FIELDS.map(field => field.id).filter(id => id.startsWith('contact'));
  assert.deepEqual(contact, CONTACT_ORDER);
});

for (const { path, lang } of PAGES) {
  test(`${lang}: the receipt lists the contact block in the declared order`, async () => {
    const { doc } = await sentPage(path);
    const { BASE_FIELDS } = await import('../src/data/intakeForm.js');

    const labelOf = id => BASE_FIELDS.find(field => field.id === id).label[lang];
    const shown = [...doc.querySelectorAll('#sent-receipt dt')].map(dt => dt.textContent.trim());
    const contactLabels = CONTACT_ORDER.map(labelOf);

    // Only the contact ones, in the order the receipt happens to print them.
    const printed = shown.filter(label => contactLabels.includes(label));
    assert.deepEqual(printed, contactLabels);
  });

  test(`${lang}: the form still pairs identity with contact method across each row`, async () => {
    // The order above moves the two documents, not the page. If this fails,
    // the grid has been reordered too and the layout argument on #28 - that
    // the two columns are what make the row order read correctly - no longer
    // holds.
    const dom = loadPage(path);
    const rows = [...dom.window.document.querySelectorAll('#stage-contact .field-row')]
      .map(row => [...row.querySelectorAll('[data-field]')].map(el => el.dataset.field))
      // The column-heading row carries no fields, and [].every() is true.
      .filter(row => row.length > 0 && row.every(id => id.startsWith('contact')));

    assert.deepEqual(rows, [
      ['contactName', 'contactPhone'],
      ['contactCompany', 'contactEmail'],
      ['contactLocation', 'contactSignal'],
    ]);
  });
}
