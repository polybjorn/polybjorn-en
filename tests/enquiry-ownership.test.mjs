/**
 * The one dependency between two questions on the enquiry form: what you have
 * so far decides which answers to "who owns the design" can be true.
 *
 * The list itself lives in COPYRIGHT_BY_ORDER_TYPE, and these read it rather
 * than restating it - a test that repeats the map would only prove the map was
 * copied twice. What is worth holding down is the behaviour around it: that
 * nothing is filtered before an order type is picked, that an answer which no
 * longer fits is cleared rather than submitted from a control nobody can see,
 * and that the keyboard cannot land on an option that is off the list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COPYRIGHT_BY_ORDER_TYPE } from '../src/data/intakeForm.js';
import { PAGES, loadPage, settle } from './helpers/page.mjs';

const pick = (doc, value) => {
  const radio = doc.querySelector(`#intake-form input[name="orderType"][value="${value}"]`);
  assert.ok(radio, `the form still offers "${value}"`);
  radio.checked = true;
  radio.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
};

const onScreen = doc =>
  [...doc.querySelectorAll('#copyright-listbox .combo-option')]
    .filter(option => !option.hidden)
    .map(option => option.dataset.value);

const offered = doc =>
  [...doc.querySelectorAll('#copyright option')]
    .filter(option => option.value && !option.hidden && !option.disabled)
    .map(option => option.value);

for (const { path, lang } of PAGES) {
  const on = name => `${lang}: ${name}`;

  test(on('every ownership answer is offered until an order type is picked'), async () => {
    const doc = loadPage(path).window.document;
    assert.equal(onScreen(doc).length, 5);
    assert.equal(offered(doc).length, 5);
  });

  test(on('the order type takes away the answers it contradicts'), async () => {
    const doc = loadPage(path).window.document;

    for (const [orderType, allowed] of Object.entries(COPYRIGHT_BY_ORDER_TYPE)) {
      pick(doc, orderType);
      // The button's list and the select that actually submits have to agree,
      // or the form offers one set and accepts another.
      assert.deepEqual(onScreen(doc), allowed, orderType);
      assert.deepEqual(offered(doc), allowed, `${orderType} (native)`);
    }
  });

  test(on('an answer that no longer fits is cleared, not submitted unseen'), async () => {
    const dom = loadPage(path);
    const doc = dom.window.document;
    const select = doc.getElementById('copyright');
    const value = doc.querySelector('#copyright-button .combo-value');

    pick(doc, 'file');
    doc.querySelector('#copyright-listbox .combo-option[data-value="licensed"]').click();
    assert.equal(select.value, 'licensed');
    assert.ok(value.classList.contains('has-value'));

    // Nothing licensed exists when all you have is an idea. The answer has to
    // go with the question that allowed it, or it rides along invisibly.
    pick(doc, 'idea');
    await settle(dom.window);
    assert.equal(select.value, '');
    assert.equal(value.classList.contains('has-value'), false);
    assert.equal(doc.querySelectorAll('#copyright-listbox [aria-selected="true"]').length, 0);
  });

  test(on('an answer that still fits survives a change of order type'), async () => {
    const doc = loadPage(path).window.document;
    pick(doc, 'file');
    doc.querySelector('#copyright-listbox .combo-option[data-value="own"]').click();
    pick(doc, 'physical');
    assert.equal(doc.getElementById('copyright').value, 'own');
  });

  test(on('the keyboard cannot reach an answer that is off the list'), async () => {
    const doc = loadPage(path).window.document;
    const button = doc.getElementById('copyright-button');
    const press = key => button.dispatchEvent(
      new doc.defaultView.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

    pick(doc, 'sketch');
    press('ArrowDown');
    press('End');
    const active = doc.querySelector('#copyright-listbox .combo-option.is-active');
    assert.ok(active);
    assert.equal(active.hidden, false);
    assert.equal(active.dataset.value, COPYRIGHT_BY_ORDER_TYPE.sketch.at(-1));

    // Enter on it answers the question, so a hidden option here would be an
    // answer nobody could have read.
    press('Enter');
    assert.equal(doc.getElementById('copyright').value, COPYRIGHT_BY_ORDER_TYPE.sketch.at(-1));
  });
}
