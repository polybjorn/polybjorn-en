/**
 * The parts of the external link check that can be decided without asking the
 * network: which links get checked, what a response means, and when a quiet
 * run should be read as the checker having stopped working.
 *
 * Nothing here makes a request. The check itself is a scheduled job precisely
 * because its answers depend on other people's servers, and a test suite that
 * inherited that dependency would be the merge gate this design avoids.
 *
 * What that leaves untested is real: whether grabcad still accepts the user
 * agent, whether cloudinary still answers HEAD. Those were measured by hand on
 * 2026-09-14 and are recorded in the script's header; the weekly run is what
 * keeps them honest, and the ok-rate floor is what makes a run that stops
 * getting answers say so.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  OK_RATE_FLOOR,
  blindHosts,
  classify,
  extractLinks,
  intervalFor,
  isOwnHost,
  systemicFailure,
} from '../.forgejo/scripts/check-external-links.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

test('our own hostnames are not checked, subdomains included', () => {
  for (const host of ['polybjorn.com', 'www.polybjorn.com', 'polybjorn.no', 'www.polybjorn.no']) {
    assert.ok(isOwnHost(host), `${host} should be skipped`);
  }
  // The near-miss that a naive endsWith would wave through.
  assert.ok(!isOwnHost('notpolybjorn.com'));
  assert.ok(!isOwnHost('grabcad.com'));
});

test('only a real absence is dead', () => {
  assert.equal(classify({ status: 200 }), 'ok');
  assert.equal(classify({ status: 301 }), 'ok');
  assert.equal(classify({ status: 404 }), 'dead');
  assert.equal(classify({ status: 410 }), 'dead');
  assert.equal(classify({ errorCode: 'ENOTFOUND' }), 'dead');
});

test('a wall, a rate limit or their outage is never reported as a dead link', () => {
  // Each of these is a live measurement from this site's own links or an
  // obvious neighbour of one. Reporting any of them as dead is the failure
  // mode the three-verdict rule exists to prevent: grabcad alone would put 54
  // working links in the issue.
  for (const status of [400, 401, 403, 405, 429, 500, 503]) {
    assert.equal(classify({ status }), 'unknown', `HTTP ${status} is not proof of anything`);
  }
  for (const errorCode of ['ETIMEDOUT', 'ECONNRESET', 'ERR_TOO_MANY_REDIRECTS', 'TimeoutError']) {
    assert.equal(classify({ errorCode }), 'unknown', `${errorCode} is not proof of anything`);
  }
});

test('the hosts with many links are paced more slowly than the default', () => {
  assert.ok(intervalFor('grabcad.com') > intervalFor('example.com'));
  assert.equal(intervalFor('example.com'), intervalFor('some-other-host.test'));
});

test('a host is only blind when every link on it is unreadable', () => {
  const blind = blindHosts([
    { host: 'walled.test', verdict: 'unknown', status: 403 },
    { host: 'walled.test', verdict: 'unknown', status: 403 },
    { host: 'mixed.test', verdict: 'unknown', status: 429 },
    { host: 'mixed.test', verdict: 'ok', status: 200 },
  ]);
  assert.deepEqual(blind.map(b => b.host), ['walled.test']);
  assert.equal(blind[0].links, 2);
});

test('one permanently unreadable link does not open an issue every week', () => {
  // facebook.com answers 400 to everything and there is exactly one link to
  // it. Nobody can fix that, so it must not be reportable on its own.
  assert.deepEqual(blindHosts([{ host: 'facebook.com', verdict: 'unknown', status: 400 }]), []);
});

test('a run that mostly failed to get answers says so', () => {
  const runOf = (ok, total) =>
    Array.from({ length: total }, (_, i) => ({ verdict: i < ok ? 'ok' : 'unknown' }));

  assert.equal(systemicFailure(runOf(197, 199)), null, 'the real numbers from 2026-09-14');
  assert.equal(systemicFailure(runOf(180, 199)), null, 'a bad week is not a broken checker');

  const blind = systemicFailure(runOf(20, 199));
  assert.ok(blind, 'a run where almost nothing answered is about the checker');
  assert.ok(blind.rate < OK_RATE_FLOOR);

  // A --only or --limit run checks a handful and would trip the floor by
  // accident, so it is never called systemic.
  assert.equal(systemicFailure(runOf(0, 4)), null);
});

test('the built site yields external links, and none of them are ours', () => {
  const links = extractLinks(DIST);

  assert.ok(links.size > 50, `only ${links.size} external links found, which is itself suspicious`);
  for (const [url, { host, pages }] of links) {
    assert.ok(!isOwnHost(host), `${url} is one of ours and should have been skipped`);
    assert.ok(url.startsWith('http'), `${url} is not an absolute http(s) URL`);
    assert.ok(!url.includes('#'), `${url} kept a fragment no server is asked about`);
    assert.ok(pages.size > 0, `${url} is not attributed to any page`);
  }
});

test('a link is attributed to every page carrying it', () => {
  const links = extractLinks(DIST);
  // The site is bilingual, so at least one external link appears on both an
  // English and a Norwegian page. A report naming only one of them sends you
  // to fix half of it.
  const onSeveral = [...links.values()].filter(entry => entry.pages.size > 1);
  assert.ok(onSeveral.length > 0, 'no link was found on more than one page, which cannot be right');
});
