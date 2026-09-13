/**
 * The 3D printing page after the enquiry form took over the intake.
 *
 * Two things are being guarded here. One is the route into the form, which did
 * not exist for the first week the form did: the only way in was typing the URL.
 * The other is what survived the trim - the page used to explain in prose what
 * the form now asks, and the parts that no form can carry should not go with it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPage } from './helpers/page.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const PAGES = [
  { path: '3d-printing/index.html', lang: 'en', href: '/3d-printing/enquiry' },
  { path: 'no/3d-printing/index.html', lang: 'no', href: '/no/3d-printing/enquiry' },
];

for (const { path, lang, href } of PAGES) {
  test(`${lang}: the page links to the enquiry form once, at the foot`, () => {
    const doc = loadPage(path).window.document;
    const links = [...doc.querySelectorAll(`a[href="${href}"]`)];

    // One route to the form. The hero had a second copy - first as a button,
    // then as a plain link - and on a page this short both were in the viewport
    // together either way, so the same words asked twice. The button sits at
    // the foot, after the examples and the services and beside the phone
    // number, where the decision is actually made.
    assert.equal(links.length, 1, 'nothing linked to the form for the first week it existed');
    assert.ok(doc.querySelector('.contact-cta .enquiry-cta'), 'the button at the foot');
    assert.ok(!doc.querySelector('.hero a'), 'and the hero does not repeat it');
    assert.ok(links[0].textContent.trim().length > 0);
  });

  test(`${lang}: the gallery line stays with the pictures`, () => {
    const doc = loadPage(path).window.document;
    const more = doc.querySelector('.examples-more');

    // It describes the grid, and it spent a while rendered in a section of its
    // own below the contact block - which put an invitation to leave the site
    // after the last thing on the page asking you to stay.
    assert.ok(more, 'the way out to the gallery');
    assert.ok(more.closest('section').querySelector('.examples-grid'), 'in the images section');
    const contact = doc.querySelector('.contact-cta');
    assert.ok(more.compareDocumentPosition(contact) & 4, 'and above the contact block');
  });

  test(`${lang}: nothing is fenced off from the contact block`, () => {
    // The rule over the contact block drew a line between the services and the
    // one action on the page, which is the last place on this page that wants a
    // border. The padding does the separating now.
    const dom = loadPage(path, { styles: true });
    const contact = dom.window.document.querySelector('.contact-cta');
    const style = dom.window.getComputedStyle(contact);

    assert.equal(style.borderTopStyle, 'none');
    assert.notEqual(parseFloat(style.paddingTop), 0, 'the air it stood in stays');
  });

  test(`${lang}: the services are separated by rules, not by air`, () => {
    // The cards went because a fill means something can be pressed here, and
    // what replaced them was a wider gap - which reads as one loose block
    // rather than six. A hairline is the separator this page already owns.
    const dom = loadPage(path, { styles: true });
    const services = [...dom.window.document.querySelectorAll('.service')];
    const style = el => dom.window.getComputedStyle(el);

    assert.equal(services.length, 6);
    services.forEach((service, i) => {
      const { borderRightStyle, borderBottomStyle } = style(service);
      // Two columns, three rows: a rule between the columns and under every row
      // but the last. Nothing draws a box around the outside of the grid.
      assert.equal(borderRightStyle, i % 2 === 0 ? 'solid' : 'none', `right of ${i}`);
      assert.equal(borderBottomStyle, i < 4 ? 'solid' : 'none', `under ${i}`);
    });
  });

  test(`${lang}: the link goes to a page that is built`, () => {
    // A relative href is only as good as the file behind it, and these two paths
    // are rearranged at deploy time for the two-repo split.
    assert.ok(existsSync(join(DIST, href.replace(/^\//, ''), 'index.html')), `${href} is not in dist`);
  });

  test(`${lang}: the button is the only filled thing`, () => {
    // A fill on this page means something can be pressed. Everything below the
    // hero used to be a filled, rounded box - images, services and the contact
    // block, at two greys against a third - so nothing was lifted because
    // everything was. Keeping this true is a decision, not an accident.
    const dom = loadPage(path, { styles: true });
    const doc = dom.window.document;
    const fill = el => dom.window.getComputedStyle(el).backgroundColor;
    const unset = fill(doc.querySelector('.hero'));

    assert.notEqual(fill(doc.querySelector('.enquiry-cta')), unset, 'the one action is filled');
    for (const el of doc.querySelectorAll('.service, .examples-grid .example, .contact-cta')) {
      assert.equal(fill(el), unset, el.className + ' is not something you press');
    }
  });

  test(`${lang}: the direct contact methods are still offered`, () => {
    const doc = loadPage(path).window.document;

    // The form was added beside these, not instead of them. Someone who would
    // rather ring should not have to read a form to find out they can - and
    // "added beside" and "added instead of" look identical in a diff a year
    // from now.
    assert.ok(doc.querySelector('.contact-row'));
    // Phone and email are written in by script from base64 to keep them out of
    // the page source, so the containers are what there is to check for.
    assert.ok(doc.getElementById('phone'));
    assert.ok(doc.getElementById('email'));
    assert.ok(doc.querySelector('a[href*="signal.me"]'));
  });
}
