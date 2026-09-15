/**
 * The lifecycle of the issue that report-link-failures.mjs owns: opened when a
 * link dies, edited rather than duplicated while it stays dead, quiet when
 * nothing changed, and closed when the links come back.
 *
 * Driven against a stub forge rather than the real one. The script runs once a
 * week against a repo nobody is watching for it, so every one of these
 * transitions happens where no one is looking - "it opened an issue once" is
 * the easy half, and the expensive bugs are a job that opens a fifth copy
 * every Monday or one that never closes the issue it opened.
 *
 * The stub answers the three endpoints the script uses and records what it was
 * asked, which is also how the token is checked to stay out of the log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STUB_TOKEN as TOKEN, runAgainstForge, stubForge } from './helpers/stub-forge.mjs';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.forgejo',
  'scripts',
  'report-link-failures.mjs',
);
function run(report, forge, { env, args } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'link-report-'));
  const file = join(dir, 'report.json');
  writeFileSync(file, JSON.stringify({ checkedAt: '2026-09-14T20:00:00.000Z', total: 199, ...report }));
  return runAgainstForge(SCRIPT, args ?? [file], forge, env ?? { TOKEN });
}

const deadLink = {
  url: 'https://grabcad.com/library/gone-1',
  host: 'grabcad.com',
  status: 404,
  verdict: 'dead',
  pages: ['3d-printing/index.html', 'no/3d-printing/index.html'],
};
const clean = { dead: [], unknown: [], blind: [], systemic: null };

test('a dead link opens an issue carrying the url and the pages linking it', async () => {
  const forge = stubForge();
  const out = await run({ ...clean, dead: [deadLink] }, forge);

  const created = forge.calls.filter(c => c.method === 'POST' && c.path === '/issues');
  assert.equal(created.length, 1, 'exactly one issue');
  assert.match(created[0].payload.body, /grabcad\.com\/library\/gone-1/);
  assert.match(created[0].payload.body, /404/);
  // Without this the report is a puzzle rather than a task.
  assert.match(created[0].payload.body, /3d-printing\/index\.html/);
  assert.match(created[0].payload.body, /no\/3d-printing\/index\.html/);
  assert.match(out, /opened #101/);
});

test('a second run with the same dead link edits, and does not open or comment', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;
  const out = await run({ ...clean, dead: [deadLink] }, forge);

  assert.equal(forge.issues.length, 1, 'no second issue');
  assert.deepEqual(
    forge.calls.filter(c => c.method === 'POST').map(c => c.path),
    [],
    'nothing was posted: no new issue and no comment saying what everyone knows',
  );
  assert.ok(forge.calls.some(c => c.method === 'PATCH'), 'the body is still refreshed');
  assert.match(out, /no comment added/);
});

test('a link that newly dies comments on the issue that is already open', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;

  const second = { ...deadLink, url: 'https://example.test/also-gone', host: 'example.test' };
  await run({ ...clean, dead: [deadLink, second] }, forge);

  const comments = forge.calls.filter(c => c.path.endsWith('/comments'));
  assert.equal(comments.length, 1);
  assert.match(comments[0].payload.body, /Newly dead \(1\)/);
  assert.match(comments[0].payload.body, /example\.test\/also-gone/);
  assert.doesNotMatch(comments[0].payload.body, /gone-1/, 'the unchanged one is not re-announced');
});

test('a clean run closes the issue it opened', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;
  const out = await run(clean, forge);

  const patched = forge.calls.filter(c => c.method === 'PATCH');
  assert.equal(patched.at(-1).payload.state, 'closed');
  assert.equal(forge.issues[0].state, 'closed');
  assert.match(out, /closed #101/);
});

test('a clean run with no issue open does nothing at all', async () => {
  const forge = stubForge();
  const out = await run(clean, forge);

  assert.deepEqual(forge.calls.filter(c => c.method !== 'GET'), []);
  assert.match(out, /no dead links/);
});

test('a run that went blind is reported even with no dead link', async () => {
  // The case the whole ok-rate floor exists for: nothing to list, and that is
  // itself the finding. Reading this run as "all clear" is the bug.
  const forge = stubForge();
  await run({ ...clean, systemic: { ok: 20, total: 199, rate: 20 / 199 } }, forge);

  assert.equal(forge.issues.length, 1);
  assert.match(forge.issues[0].body, /could not get answers/i);
  assert.match(forge.issues[0].body, /report about/);
});

test('the token is never printed, and never reaches the command line', async () => {
  const forge = stubForge();
  const out = await run({ ...clean, dead: [deadLink] }, forge);
  assert.doesNotMatch(out, new RegExp(TOKEN), 'the token reached stdout');
});

test('--probe accepts a credential the forge answers, and writes nothing', async () => {
  const forge = stubForge();
  const out = await run(clean, forge, { args: ['--probe'] });

  assert.match(out, /can read issues: HTTP 200/);
  assert.deepEqual(forge.calls.filter(c => c.method !== 'GET'), [], 'a probe only reads');
});

test('a credential the forge refuses is passed over for one it accepts', async () => {
  // The real shape of this: FORGE_PR_TOKEN resolves, is 40 characters, and is
  // answered 403 "[read:issue]" because it is scoped for pull requests.
  const forge = stubForge([], ['the-one-that-works']);
  const out = await run(clean, forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only', AUTOMATIC_TOKEN: 'the-one-that-works' },
  });

  assert.match(out, /AUTOMATIC_TOKEN \(18 characters\) can read issues: HTTP 200/);
  assert.doesNotMatch(out, /the-one-that-works/, 'the value itself is never printed');
  assert.doesNotMatch(out, /scoped-for-pulls-only/);
});

test('no usable credential stops the run rather than sweeping and staying quiet', async () => {
  const forge = stubForge([], ['nothing-here-matches']);
  const failure = await run(clean, forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only' },
  }).then(
    () => null,
    error => error,
  );

  assert.ok(failure, 'the script must not exit 0 when it cannot reach issues');
  assert.equal(failure.code, 1);
  assert.match(failure.stdout, /would be found and never reported/);
});
