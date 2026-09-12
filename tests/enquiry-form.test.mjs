/**
 * What the enquiry page does when someone presses Send.
 *
 * The endpoint has its own tests (workers/enquiry). These cover the half that
 * runs in the browser: that the right thing is posted, that a refusal is
 * explained in the language being read, and that the receipt says back what was
 * actually filled in.
 *
 * Every one of these started as a bug found by hand. Nothing here is a test
 * written for the sake of having one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fillSample, selectFirstOption } from '../src/dev/fill-sample.js';
import { PAGES, loadPage, settle, stubFetch, jsonResponse } from './helpers/page.mjs';

for (const { path, lang } of PAGES) {
  const on = name => `${lang}: ${name}`;

  const sent = async (response = jsonResponse(201, { ok: true, id: 'test' })) => {
    const dom = loadPage(path);
    const calls = stubFetch(dom.window, response);
    fillSample(dom.window.document);
    dom.window.document.getElementById('intake-form').requestSubmit();
    await settle(dom.window);
    return { doc: dom.window.document, calls, window: dom.window };
  };

  test(on('a complete form posts multipart to the endpoint'), async () => {
    const { calls, window } = await sent();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/enquiry');
    assert.equal(calls[0].init.method, 'POST');

    const body = calls[0].init.body;
    assert.ok(body instanceof window.FormData, 'a urlencoded body would drop every attachment');
    assert.equal(body.get('lang'), lang);
    assert.match(String(body.get('description')), /sensor/);
    assert.equal(body.get('contactName'), 'Kari Nordmann');
  });

  test(on('an incomplete form never reaches the network'), async () => {
    const dom = loadPage(path);
    const calls = stubFetch(dom.window, jsonResponse(201, { ok: true }));
    dom.window.document.getElementById('intake-form').requestSubmit();
    await settle(dom.window);

    assert.equal(calls.length, 0);
    assert.equal(dom.window.document.getElementById('submit-error').hidden, false);
  });

  test(on('a sent form is replaced by the confirmation'), async () => {
    const { doc } = await sent();
    assert.equal(doc.getElementById('intake-form').hidden, true);
    assert.equal(doc.getElementById('submit-done').hidden, false);
    assert.ok(doc.getElementById('sent-message').textContent.trim().length > 0);
  });

  test(on('the receipt says back what was filled in'), async () => {
    const { doc } = await sent();
    const receipt = doc.getElementById('sent-receipt');

    assert.match(receipt.textContent, /sensor/);
    assert.match(receipt.textContent, /Kari Nordmann/);
    assert.ok(receipt.querySelectorAll('.receipt-section').length > 1, 'grouped by section');

    // The label the visitor read, not the value the form posts. Taken from
    // .option-label rather than the whole <label>, which would drag the example
    // line in with it.
    const chosen = doc
      .querySelector('input[name="orderType"]:checked')
      .closest('label')
      .querySelector('.option-label')
      .textContent.trim();
    assert.match(receipt.textContent, new RegExp(chosen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test(on('an unanswered question is left out of the receipt'), async () => {
    const { doc } = await sent();
    // A select always has something selected, and on an untouched one that is
    // the placeholder - whose value is empty where its text is not. Every
    // dropdown reported its placeholder as an answer until this was fixed.
    const placeholder = doc.querySelector('#intake-form select option[value=""]');
    assert.ok(placeholder, 'the form still has a placeholder option to get wrong');
    assert.doesNotMatch(doc.getElementById('sent-receipt').textContent, new RegExp(placeholder.textContent.trim()));
  });

  test(on('an answered dropdown shows its label in the receipt'), async () => {
    const dom = loadPage(path);
    stubFetch(dom.window, jsonResponse(201, { ok: true, id: 'test' }));
    const doc = dom.window.document;
    fillSample(doc);
    selectFirstOption(doc);
    const expected = doc.querySelector('#intake-form select').selectedOptions[0].textContent.trim();
    doc.getElementById('intake-form').requestSubmit();
    await settle(dom.window);

    assert.match(doc.getElementById('sent-receipt').textContent, new RegExp(expected));
  });

  test(on('a refused file is named, and the form stays up'), async () => {
    const { doc } = await sent(jsonResponse(415, { ok: false, code: 'file-type', file: 'payload.zip' }));
    const error = doc.getElementById('submit-error');

    assert.equal(error.hidden, false);
    assert.match(error.textContent, /payload\.zip/);
    assert.equal(doc.getElementById('intake-form').hidden, false, 'nothing was sent, so nothing is replaced');

    const button = doc.querySelector('#intake-form button[type="submit"]');
    assert.equal(button.disabled, false, 'Send is usable again');
  });

  test(on('an unreachable endpoint offers the way round it'), async () => {
    const dom = loadPage(path);
    dom.window.fetch = async () => { throw new Error('offline'); };
    fillSample(dom.window.document);
    dom.window.document.getElementById('intake-form').requestSubmit();
    await settle(dom.window);

    const error = dom.window.document.getElementById('submit-error');
    assert.equal(error.hidden, false);
    // There is nothing on the page someone can fix, so the message has to carry
    // the other way of reaching us.
    assert.match(error.textContent, /post@polybjorn\.com/);
  });

  test(on('a body that is not JSON is not shown to anyone'), async () => {
    // A proxy, an error page, or the route not being deployed yet. None of them
    // are worth rendering verbatim.
    const { doc } = await sent({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
    const error = doc.getElementById('submit-error');
    assert.equal(error.hidden, false);
    assert.doesNotMatch(error.textContent, /<|\{/);
  });
}
