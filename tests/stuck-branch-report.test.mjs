/**
 * The lifecycle of the issue that report-stuck-branches.mjs owns: opened when
 * the sweep leaves a merged branch behind, edited rather than duplicated while
 * it stays behind, quiet when nothing changed, and closed when the remote comes
 * back clean.
 *
 * This runs on every push to main, which is the reason the quiet case has a
 * test of its own: a branch nobody has got round to deleting must not produce a
 * comment per merge. The opposite failure is worse and also covered - a second
 * branch going stuck has to say so, or the issue quietly understates what is
 * wrong.
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
  'report-stuck-branches.mjs',
);

const branch = (name, ageHours) => ({
  name,
  landedAt: new Date(Date.now() - ageHours * 3_600_000).toISOString(),
  ageHours,
  stuck: true,
});

function run(stuck, forge, { env, args } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'stuck-report-'));
  const file = join(dir, 'report.json');
  writeFileSync(file, JSON.stringify({
    checkedAt: '2026-09-15T15:00:00.000Z',
    thresholdHours: 26,
    merged: stuck.length,
    branches: stuck,
    stuck,
  }));
  return runAgainstForge(SCRIPT, args ?? [file], forge, env ?? { TOKEN });
}

test('a stuck branch opens an issue naming it, when it landed and how long ago', async () => {
  const forge = stubForge();
  const out = await run([branch('herd/forgotten', 70)], forge);

  const created = forge.calls.filter(c => c.method === 'POST' && c.path === '/issues');
  assert.equal(created.length, 1, 'exactly one issue');
  assert.match(created[0].payload.body, /`herd\/forgotten`/);
  assert.match(created[0].payload.body, /70h/);
  // Without the command the report is a complaint rather than a task.
  assert.match(created[0].payload.body, /git push origin --delete/);
  assert.match(out, /opened #101/);
});

test('a second run with the same branch edits, and does not open or comment', async () => {
  const forge = stubForge();
  await run([branch('herd/forgotten', 70)], forge);
  forge.calls.length = 0;
  const out = await run([branch('herd/forgotten', 94)], forge);

  assert.equal(forge.issues.length, 1, 'no second issue');
  assert.deepEqual(
    forge.calls.filter(c => c.method === 'POST').map(c => c.path),
    [],
    'a branch nobody has deleted yet must not comment on every merge',
  );
  assert.ok(forge.calls.some(c => c.method === 'PATCH'), 'the age is still refreshed');
  assert.match(out, /no comment added/);
});

test('a second branch going stuck is said out loud', async () => {
  const forge = stubForge();
  await run([branch('herd/first', 70)], forge);
  forge.calls.length = 0;
  const out = await run([branch('herd/first', 94), branch('herd/second', 30)], forge);

  const comments = forge.calls.filter(c => c.method === 'POST' && c.path.endsWith('/comments'));
  assert.equal(comments.length, 1);
  assert.match(comments[0].payload.body, /Newly stuck \(1\)/);
  assert.match(comments[0].payload.body, /herd\/second/);
  assert.doesNotMatch(comments[0].payload.body, /Newly stuck[\s\S]*herd\/first/);
  assert.match(out, /1 new, 0 cleared/);
});

test('one branch cleared while another stays reports the change, not a close', async () => {
  const forge = stubForge();
  await run([branch('herd/first', 70), branch('herd/second', 30)], forge);
  forge.calls.length = 0;
  const out = await run([branch('herd/first', 94)], forge);

  const comments = forge.calls.filter(c => c.method === 'POST' && c.path.endsWith('/comments'));
  assert.equal(comments.length, 1);
  assert.match(comments[0].payload.body, /Gone since \(1\)[\s\S]*herd\/second/);
  assert.equal(forge.issues[0].state, 'open', 'one still stuck means it stays open');
  assert.match(out, /0 new, 1 cleared/);
});

test('a clean remote closes the issue and says why', async () => {
  const forge = stubForge();
  await run([branch('herd/forgotten', 70)], forge);
  forge.calls.length = 0;
  const out = await run([], forge);

  const comments = forge.calls.filter(c => c.method === 'POST' && c.path.endsWith('/comments'));
  assert.equal(comments.length, 1);
  assert.match(comments[0].payload.body, /Clear as of/);
  assert.equal(forge.issues[0].state, 'closed');
  assert.match(out, /closed #101/);
});

test('a clean remote with nothing open touches nothing', async () => {
  const forge = stubForge();
  const out = await run([], forge);

  assert.deepEqual(
    forge.calls.filter(c => c.method !== 'GET').map(c => c.method),
    [],
    'no issue is opened just to say everything is fine',
  );
  assert.match(out, /nothing stuck, and no open issue to close/);
});

test('the token never reaches stdout', async () => {
  const forge = stubForge();
  const out = await run([branch('herd/forgotten', 70)], forge);

  assert.doesNotMatch(out, new RegExp(TOKEN), 'the token reached stdout');
  assert.match(out, /TOKEN \(\d+ characters\) can read issues: HTTP 200/);
});

test('a credential the forge refuses is stepped over, not trusted for being set', async () => {
  // The real shape: FORGE_PR_TOKEN is set, is a plausible length, and cannot
  // touch issues at all - so a check that only asks whether it is set passes
  // and the run dies later with nowhere to report.
  const forge = stubForge([], ['the-one-that-works']);
  const out = await run([branch('herd/forgotten', 70)], forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only', AUTOMATIC_TOKEN: 'the-one-that-works' },
  });

  assert.match(out, /AUTOMATIC_TOKEN \(18 characters\) can read issues: HTTP 200/);
  assert.match(out, /opened #101/);
});

test('no usable credential stops the run rather than finding and forgetting', async () => {
  const forge = stubForge([], ['nothing-here-matches']);
  const failure = await run([branch('herd/forgotten', 70)], forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only' },
  }).then(() => null, e => e);

  assert.ok(failure, 'it must not exit 0 having reported nothing');
  assert.equal(failure.code, 1);
  assert.match(failure.stdout, /would be found and never reported/);
});
