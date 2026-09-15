/**
 * The end-state check behind the branch-cleanup watchdog, driven against real
 * throwaway repositories rather than a fake git.
 *
 * git is the thing being asked here - what counts as merged, and when a branch
 * reached main - so a stub would be a stub of exactly the part that has to be
 * right. Each case below builds a bare "remote", clones it, and arranges the
 * history it needs with backdated commits.
 *
 * The case that matters most is the one that looks like a false alarm: a
 * branch opened weeks ago and merged a minute ago must not read as stuck. The
 * obvious clock (the tip commit's date) gets that wrong, and getting it wrong
 * means an issue opened against a cleanup that is working perfectly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeRepo, mergedBranch, openBranch } from './helpers/git-fixture.mjs';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.forgejo',
  'scripts',
  'check-stuck-branches.mjs',
);

function check(repo, extra = []) {
  repo.git('fetch', '-q', 'origin');
  const out = join(repo.dir, 'report.json');
  const stdout = execFileSync(process.execPath, [SCRIPT, '--json', out, ...extra], {
    cwd: repo.work, encoding: 'utf8',
  });
  return { stdout, report: JSON.parse(readFileSync(out, 'utf8')) };
}

test('a merged branch that outlived the threshold is reported', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/old-news', { tipHoursAgo: 80, landedHoursAgo: 72 });

  const { report, stdout } = check(repo);
  assert.deepEqual(report.stuck.map(b => b.name), ['herd/old-news']);
  assert.ok(report.stuck[0].ageHours > 70);
  assert.match(stdout, /1 branch\(es\) have outlived/);
});

test('a branch merged a minute ago is not stuck, however old its commits are', () => {
  const repo = makeRepo();
  // The false alarm this check has to avoid: three weeks of work, merged now.
  mergedBranch(repo, 'herd/long-running', { tipHoursAgo: 500, landedHoursAgo: 0.02 });

  const { report } = check(repo);
  assert.deepEqual(report.stuck, [], 'the clock starts when it landed, not when it was written');
  assert.equal(report.merged, 1, 'it is still seen and measured');
});

test('an unmerged branch is left alone however old it is', () => {
  const repo = makeRepo();
  openBranch(repo, 'herd/still-working', { tipHoursAgo: 400 });

  const { report, stdout } = check(repo);
  assert.deepEqual(report.stuck, []);
  assert.equal(report.merged, 0, 'nothing to clean up: it has not landed');
  assert.match(stdout, /1 herd\/ branch\(es\) on the remote, 0 already merged/);
});

test('a clean remote says so', () => {
  const repo = makeRepo();
  const { report, stdout } = check(repo);

  assert.deepEqual(report.branches, []);
  assert.match(stdout, /nothing has outlived/);
});

test('branches outside herd/ are not this job to clean', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'someone-elses/thing', { tipHoursAgo: 90, landedHoursAgo: 80 });

  const { report } = check(repo);
  assert.deepEqual(report.branches, []);
});

test('a nested herd/ name is found, which a single-star glob would miss', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/topic/deeper', { tipHoursAgo: 90, landedHoursAgo: 80 });

  const { report } = check(repo);
  assert.deepEqual(report.stuck.map(b => b.name), ['herd/topic/deeper']);
});

test('several stuck branches come back worst first', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/recent', { tipHoursAgo: 40, landedHoursAgo: 30 });
  mergedBranch(repo, 'herd/ancient', { tipHoursAgo: 190, landedHoursAgo: 180 });
  mergedBranch(repo, 'herd/fresh', { tipHoursAgo: 2, landedHoursAgo: 1 });

  const { report } = check(repo);
  assert.deepEqual(report.stuck.map(b => b.name), ['herd/ancient', 'herd/recent']);
  assert.equal(report.merged, 3);
});

test('the threshold is what decides, and it can be moved', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/borderline', { tipHoursAgo: 12, landedHoursAgo: 10 });

  assert.deepEqual(check(repo).report.stuck, [], 'ten hours is inside the default 26');
  assert.deepEqual(
    check(repo, ['--hours', '5']).report.stuck.map(b => b.name),
    ['herd/borderline'],
    'and outside a five-hour one',
  );
});
