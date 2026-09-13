/**
 * Where the PGP key sits, on every page that prints the email address.
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

for (const { path, lang, page } of PAGES) {
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
