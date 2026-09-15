/**
 * The selection the sweep deletes from.
 *
 * This is the half of #84 that had no test at all: four lines of shell in the
 * workflow, selecting over refs that were never fetched, printing "no merged
 * herd/ branches" to a remote it could not see. The shell is gone and the
 * answer comes from the same module the watchdog reads, so these cases pin
 * what both jobs mean by "ours" and "merged".
 *
 * Names go to stdout and commentary to stderr, because the caller passes the
 * output straight to delete-branches.mjs - a summary line mixed into it would
 * be read as a branch name.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeRepo, mergedBranch, openBranch } from './helpers/git-fixture.mjs';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.forgejo',
  'scripts',
  'list-merged-branches.mjs',
);

function list(repo) {
  repo.git('fetch', '-q', '--prune', 'origin');
  const stdout = execFileSync(process.execPath, [SCRIPT], {
    cwd: repo.work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stdout.split('\n').filter(Boolean);
}

test('a merged branch is listed', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/done', { tipHoursAgo: 5, landedHoursAgo: 4 });

  assert.deepEqual(list(repo), ['herd/done']);
});

test('an unmerged branch is not, however old', () => {
  const repo = makeRepo();
  openBranch(repo, 'herd/in-progress', { tipHoursAgo: 400 });

  assert.deepEqual(list(repo), [], 'deleting this would throw away the work on it');
});

test('a merged branch outside herd/ is not this job to delete', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'someone-elses/thing', { tipHoursAgo: 5, landedHoursAgo: 4 });

  assert.deepEqual(list(repo), []);
});

test('a nested herd/ name is found, which a single-star glob would miss', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/topic/deeper', { tipHoursAgo: 5, landedHoursAgo: 4 });

  assert.deepEqual(list(repo), ['herd/topic/deeper']);
});

test('a clean remote prints nothing at all on stdout', () => {
  const repo = makeRepo();

  assert.deepEqual(list(repo), [], 'the caller reads an empty string as "nothing to do"');
});

test('the summary stays off stdout, where it would be read as a branch name', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/done', { tipHoursAgo: 5, landedHoursAgo: 4 });
  openBranch(repo, 'herd/in-progress', { tipHoursAgo: 3 });

  const out = list(repo);
  assert.deepEqual(out, ['herd/done']);
  for (const line of out) {
    assert.doesNotMatch(line, /branch\(es\)|merged into main/);
  }
});

test('merged and unmerged together: only the merged one comes back', () => {
  const repo = makeRepo();
  mergedBranch(repo, 'herd/first', { tipHoursAgo: 40, landedHoursAgo: 30 });
  openBranch(repo, 'herd/open', { tipHoursAgo: 20 });
  mergedBranch(repo, 'herd/second', { tipHoursAgo: 10, landedHoursAgo: 5 });

  assert.deepEqual(list(repo).sort(), ['herd/first', 'herd/second']);
});
