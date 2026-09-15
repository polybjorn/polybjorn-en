/**
 * The branch cleanup, driven against a fake `git` rather than a real remote.
 *
 * The thing under test is not "does it call git" but whether it converges on a
 * forge that puts a deleted ref back. #80 measured that happening within two
 * seconds of the delete, so the interesting cases are the second delete and
 * the point at which the job is allowed to go red - neither of which can be
 * produced here by merging something, and both of which are exactly the cases
 * that get discovered by not happening.
 *
 * The fake is a `git` earlier on PATH than the real one, backed by a JSON file
 * holding the remote's refs, how many times the forge will restore each one,
 * and every command it was asked to run. A scenario that never restores and
 * one that always does are both in here, so a harness that has stopped
 * exercising the retry shows up as a passing test that should have failed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.forgejo',
  'scripts',
  'delete-branches.mjs',
);

const FAKE_GIT = `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.env.GIT_FAKE_STATE;
const s = JSON.parse(readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
s.calls.push(args.join(' '));
const ref = args[args.length - 1];
const branch = String(ref).replace(/^refs\\/heads\\//, '');
let out = '';
let err = '';
let code = 0;

if (args[0] === 'ls-remote') {
  if (s.lsRemoteFails > 0) {
    s.lsRemoteFails -= 1;
    code = 128;
    err = 'fatal: could not read from remote repository';
  } else if (s.refs[branch]) {
    out = s.refs[branch] + '\\t' + ref + '\\n';
  }
} else if (args[0] === 'push') {
  if (s.pushFails > 0) {
    s.pushFails -= 1;
    code = 1;
    err = 'remote: rejected';
  } else if (!s.refs[branch]) {
    code = 1;
    err = "error: unable to delete '" + branch + "': remote ref does not exist";
  } else {
    const sha = s.refs[branch];
    delete s.refs[branch];
    // The forge recreating the ref at its old sha, which is the whole point.
    if ((s.restore[branch] || 0) > 0) {
      s.restore[branch] -= 1;
      s.refs[branch] = sha;
    }
    out = ' - [deleted]         ' + branch + '\\n';
  }
} else {
  code = 1;
  err = 'fake git: unexpected subcommand ' + args[0];
}

writeFileSync(file, JSON.stringify(s));
if (out) process.stdout.write(out);
if (err) process.stderr.write(err + '\\n');
process.exit(code);
`;

/** A remote with the given branches, and a forge that restores some of them. */
function withFakeGit({ refs = {}, restore = {}, lsRemoteFails = 0, pushFails = 0 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'delete-branches-'));
  const bin = join(dir, 'git');
  writeFileSync(bin, FAKE_GIT);
  chmodSync(bin, 0o755);

  const state = join(dir, 'state.json');
  const refsWithShas = Object.fromEntries(
    Object.entries(refs).map(([b, sha]) => [b, sha === true ? 'a'.repeat(40) : sha]),
  );
  writeFileSync(state, JSON.stringify({
    refs: refsWithShas, restore, lsRemoteFails, pushFails, calls: [],
  }));

  return { dir, state };
}

/** Runs the script and reports what it said, what it returned, and what git saw. */
async function deleteBranches(fake, ...branches) {
  const env = {
    ...process.env,
    PATH: `${fake.dir}:${process.env.PATH}`,
    GIT_FAKE_STATE: fake.state,
    DELETE_WAIT_MS: '5',
  };
  // Deliberately no API or TOKEN: the script must not need either any more.
  delete env.API;
  delete env.TOKEN;

  let status = 0;
  let stdout = '';
  try {
    ({ stdout } = await run(process.execPath, [SCRIPT, ...branches], { env }));
  } catch (e) {
    status = e.code;
    stdout = e.stdout ?? '';
  }

  const after = JSON.parse(readFileSync(fake.state, 'utf8'));
  return {
    status,
    stdout,
    refs: after.refs,
    pushes: after.calls.filter(c => c.startsWith('push')),
    calls: after.calls,
  };
}

test('a branch that stays deleted is deleted once', async () => {
  const fake = withFakeGit({ refs: { 'herd/clean': true } });
  const res = await deleteBranches(fake, 'herd/clean');

  assert.equal(res.status, 0);
  assert.equal(res.pushes.length, 1, 'no retry when the first delete holds');
  assert.deepEqual(res.refs, {}, 'and the ref is gone');
  assert.match(res.stdout, /gone after 1 delete/);
});

test('a ref the forge puts back is deleted again, and the job stays green', async () => {
  const fake = withFakeGit({ refs: { 'herd/restored': true }, restore: { 'herd/restored': 1 } });
  const res = await deleteBranches(fake, 'herd/restored');

  assert.equal(res.status, 0, 'a branch nobody lost must not turn the job red');
  assert.equal(res.pushes.length, 2, 'the second delete is the one that sticks');
  assert.deepEqual(res.refs, {});
  assert.match(res.stdout, /gone after 2 deletes/);
});

test('a ref that survives four deletes is reported, loudly', async () => {
  const fake = withFakeGit({ refs: { 'herd/immortal': true }, restore: { 'herd/immortal': 99 } });
  const res = await deleteBranches(fake, 'herd/immortal');

  assert.equal(res.status, 1, 'this is the case red is reserved for');
  assert.equal(res.pushes.length, 4, 'bounded: it does not push forever');
  assert.match(res.stdout, /herd\/immortal is STILL on the remote after 4 deletes/);
});

test('a branch that is already gone is not pushed at all', async () => {
  const fake = withFakeGit({ refs: {} });
  const res = await deleteBranches(fake, 'herd/gone');

  assert.equal(res.status, 0);
  assert.equal(res.pushes.length, 0);
  assert.match(res.stdout, /herd\/gone is already gone/);
});

test('one stuck branch does not hide the state of the rest', async () => {
  const fake = withFakeGit({
    refs: { 'herd/immortal': true, 'herd/clean': true },
    restore: { 'herd/immortal': 99 },
  });
  const res = await deleteBranches(fake, 'herd/immortal', 'herd/clean');

  assert.equal(res.status, 1);
  assert.deepEqual(res.refs, { 'herd/immortal': 'a'.repeat(40) }, 'the good one still went');
  assert.match(res.stdout, /gone after 1 delete/);
  assert.match(res.stdout, /STILL on the remote/);
});

test('a remote that cannot be read is never reported as deleted', async () => {
  const fake = withFakeGit({ refs: { 'herd/unknown': true }, lsRemoteFails: 99 });
  const res = await deleteBranches(fake, 'herd/unknown');

  assert.equal(res.status, 1);
  assert.equal(res.pushes.length, 0, 'an answer nobody understood is not a reason to act');
  assert.match(res.stdout, /could not be read/);
});

test('a push that is refused is retried, and the failure carries the reason', async () => {
  const fake = withFakeGit({ refs: { 'herd/refused': true }, pushFails: 1 });
  const res = await deleteBranches(fake, 'herd/refused');

  assert.equal(res.status, 0, 'the second push succeeds');
  assert.equal(res.pushes.length, 2);
  assert.match(res.stdout, /exited 1: remote: rejected/);
});

test('it asks git for the answer, by full refname, and asks nothing else', async () => {
  const fake = withFakeGit({ refs: { 'herd/clean': true } });
  const res = await deleteBranches(fake, 'herd/clean');

  assert.deepEqual(res.calls, [
    'ls-remote --heads origin refs/heads/herd/clean',
    'push origin --delete refs/heads/herd/clean',
    'ls-remote --heads origin refs/heads/herd/clean',
  ]);
});
