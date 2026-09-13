/**
 * The contact row, on every page that has one.
 *
 * Two pages print the same three ways to reach him, and for a day they printed
 * them in two different orders - the 3D printing page was left alone while the
 * key was added to the home page, and nothing said the two had to agree. The
 * order here is phone, Signal, email: the two that hang off a phone number
 * first, then the mailbox with its key at the end of the row, where there is
 * nothing after it for the key to look like it belongs to.
 *
 * The rest of this file is where the PGP key sits.
 *
 * It used to be a peer of Signal in the home page's contact row, which framed
 * it as a way to get in touch. Nobody gets in touch by PGP: the key is a
 * property of the address next to it, so it hangs off the email item and goes
 * wherever that address goes. The 3D printing page prints the address too and
 * had no key at all.
 *
 * The other half of the decision is that it stays visible. Hiding it behind
 * :hover was considered and refused - there is no hover on a phone, and this
 * is a phone-heavy page - so a build where the key is only revealed on hover
 * should fail here rather than ship looking fine on a desktop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadPage } from './helpers/page.mjs';

const PAGES = [
  { path: 'index.html', lang: 'en', page: 'home' },
  { path: 'no/index.html', lang: 'no', page: 'home' },
  { path: '3d-printing/index.html', lang: 'en', page: '3d printing' },
  { path: 'no/3d-printing/index.html', lang: 'no', page: '3d printing' },
];

// Phone and email are written in by script from base64, so the containers are
// what identifies them. Signal is a plain link.
const KIND = item =>
  item.querySelector('#phone') ? 'phone'
  : item.querySelector('#email') ? 'email'
  : item.querySelector('a[href*="signal.me"]') ? 'signal'
  : 'unknown';

for (const { path, lang, page } of PAGES) {
  test(`${page} ${lang}: the contact row is in the agreed order`, () => {
    const doc = loadPage(path).window.document;
    // The row holding the phone number, not the GitHub and music row further
    // down the home page.
    const row = doc.getElementById('phone').closest('.contact-row');

    assert.deepEqual([...row.querySelectorAll('.contact-item')].map(KIND), ['phone', 'signal', 'email']);
  });

  test(`${page} ${lang}: the key hangs off the email address`, () => {
    const doc = loadPage(path).window.document;
    const key = doc.querySelector('a[href="/pubkey.asc"]');

    assert.ok(key, 'the key is offered wherever the address is');
    const item = key.closest('.contact-item');
    assert.ok(item, 'and it is inside a contact item');
    assert.ok(item.querySelector('#email'), 'the email one, not one of its own');
  });

  test(`${page} ${lang}: the key is visible without hovering`, () => {
    const dom = loadPage(path, { styles: true });
    const key = dom.window.document.querySelector('.pgp');
    const style = dom.window.getComputedStyle(key);

    // jsdom never hovers, so this is the state a phone gets.
    assert.notEqual(style.display, 'none');
    assert.notEqual(style.visibility, 'hidden');
    assert.notEqual(style.opacity, '0');
  });
}
