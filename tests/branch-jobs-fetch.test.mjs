/**
 * Every job that selects branches must fetch them first.
 *
 * This is the one assertion that would have caught #84, and it cannot be made
 * from behaviour: a job selecting over refs that are not there does not fail,
 * it reports an empty remote and exits 0. The bug was invisible for two months
 * because the sweep's "no merged herd/ branches" is exactly what a working
 * sweep prints on a clean remote.
 *
 * So the shape of the workflow is asserted directly. It is a blunt test and it
 * is the right blunt test: losing the refs is the regression, and this is what
 * notices.
 *
 * The two jobs bring them in differently now, so each is held to its own shape
 * rather than to a rule that either could satisfy. The sweep keeps the explicit
 * step - it stays on actions/checkout, because persist-credentials is what
 * authenticates its delete push. The check takes bjorn/ci-actions/checkout@v1
 * at depth 0, whose fetch IS `+refs/heads/*:refs/remotes/origin/*`, so the step
 * would be a second copy of it (bjorn/nixfleet#1000).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), '..', '.forgejo', 'workflows');

/** Jobs that read the remote's branch list, the file each lives in, and how
 *  each one gets the refs there. */
const SELECTORS = [
  { file: 'delete-merged-branch.yml', job: 'sweep', brings: 'fetch-step' },
  { file: 'stuck-branches.yml', job: 'check', brings: 'depth-0' },
];

const stepsOf = (file, job) => parse(readFileSync(join(WORKFLOWS, file), 'utf8')).jobs[job].steps;

const isFetch = step => typeof step.run === 'string'
  && /git fetch\b/.test(step.run)
  && /refs\/heads\/\*/.test(step.run);

const isSelection = step => typeof step.run === 'string'
  && /(list-merged-branches|check-stuck-branches)\.mjs/.test(step.run);

const isCheckout = step => /checkout@/.test(step.uses ?? '');

// fetch-depth is actions/checkout's spelling, depth is the composite's, and the
// composite takes a string because an action input is always one.
const depthOf = step => step.with?.['fetch-depth'] ?? step.with?.depth;

const isFullCheckout = step => isCheckout(step) && Number(depthOf(step)) === 0;

for (const { file, job, brings } of SELECTORS) {
  const arrival = brings === 'fetch-step' ? isFetch : isFullCheckout;

  test(`${file}: ${job} has the branch refs before selecting from them`, () => {
    const steps = stepsOf(file, job);
    const bringsAt = steps.findIndex(arrival);
    const selectAt = steps.findIndex(isSelection);

    assert.notEqual(selectAt, -1, 'this job is supposed to select branches');
    assert.notEqual(bringsAt, -1, brings === 'fetch-step'
      ? 'without a fetch it selects from refs the checkout never brought'
      : 'without depth 0 the checkout brings one ref and the selection is empty');
    assert.ok(bringsAt < selectAt, 'the refs have to arrive before anything selects from them');
  });

  // Only the explicit fetch can leave a stale ref behind. The composite starts
  // from git init, so there is nothing there to prune.
  if (brings === 'fetch-step') {
    test(`${file}: ${job} prunes, so a deleted branch does not come back as a local ref`, () => {
      const fetch = stepsOf(file, job).find(isFetch);
      assert.match(fetch.run, /--prune/);
    });
  }

  test(`${file}: ${job} checks out enough history to answer --is-ancestor`, () => {
    const checkout = stepsOf(file, job).find(isCheckout);
    assert.equal(Number(depthOf(checkout)), 0, 'a shallow clone can see one commit');
  });
}

test('the sweep no longer selects with git branch -r, which reads local refs only', () => {
  const raw = readFileSync(join(WORKFLOWS, 'delete-merged-branch.yml'), 'utf8');
  assert.doesNotMatch(raw, /git branch -r/);
});
