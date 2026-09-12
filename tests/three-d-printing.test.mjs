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
  test(`${lang}: the page links to the enquiry form`, () => {
    const doc = loadPage(path).window.document;
    const cta = doc.querySelector('.enquiry-cta');

    assert.ok(cta, 'nothing linked to the form for the first week it existed');
    assert.equal(cta.getAttribute('href'), href, 'and it stays in the language being read');
    assert.ok(cta.textContent.trim().length > 0);
  });

  test(`${lang}: the link goes to a page that is built`, () => {
    // A relative href is only as good as the file behind it, and these two paths
    // are rearranged at deploy time for the two-repo split.
    assert.ok(existsSync(join(DIST, href.replace(/^\//, ''), 'index.html')), `${href} is not in dist`);
  });

  test(`${lang}: the process is three steps, not two paragraphs`, () => {
    const doc = loadPage(path).window.document;
    const steps = doc.querySelectorAll('.steps .step');

    assert.equal(steps.length, 3);
    steps.forEach(step => {
      assert.ok(step.querySelector('h3').textContent.trim().length > 0);
      assert.ok(step.querySelector('p').textContent.trim().length > 0);
    });

    // The five-hour block is the distinctive promise on this page, and the
    // reason the middle section survives at all. Losing it in a future trim
    // should fail something.
    assert.match(doc.querySelector('.steps').textContent, /fem timer|five-hour/);
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
