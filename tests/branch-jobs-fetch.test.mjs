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
 * is the right blunt test: deleting the fetch step is the regression, and this
 * is what notices.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), '..', '.forgejo', 'workflows');

/** Jobs that read the remote's branch list, and the file each lives in. */
const SELECTORS = [
  { file: 'delete-merged-branch.yml', job: 'sweep' },
  { file: 'stuck-branches.yml', job: 'check' },
];

const stepsOf = (file, job) => parse(readFileSync(join(WORKFLOWS, file), 'utf8')).jobs[job].steps;

const isFetch = step => typeof step.run === 'string'
  && /git fetch\b/.test(step.run)
  && /refs\/heads\/\*/.test(step.run);

const isSelection = step => typeof step.run === 'string'
  && /(list-merged-branches|check-stuck-branches)\.mjs/.test(step.run);

for (const { file, job } of SELECTORS) {
  test(`${file}: ${job} fetches the branch refs before selecting from them`, () => {
    const steps = stepsOf(file, job);
    const fetchAt = steps.findIndex(isFetch);
    const selectAt = steps.findIndex(isSelection);

    assert.notEqual(selectAt, -1, 'this job is supposed to select branches');
    assert.notEqual(fetchAt, -1, 'without a fetch it selects from refs the checkout never brought');
    assert.ok(fetchAt < selectAt, 'the fetch has to come first to be of any use');
  });

  test(`${file}: ${job} prunes, so a deleted branch does not come back as a local ref`, () => {
    const fetch = stepsOf(file, job).find(isFetch);
    assert.match(fetch.run, /--prune/);
  });

  test(`${file}: ${job} checks out enough history to answer --is-ancestor`, () => {
    const checkout = stepsOf(file, job).find(s => (s.uses ?? '').startsWith('actions/checkout'));
    assert.equal(checkout.with['fetch-depth'], 0, 'a shallow clone can see one commit');
  });
}

test('the sweep no longer selects with git branch -r, which reads local refs only', () => {
  const raw = readFileSync(join(WORKFLOWS, 'delete-merged-branch.yml'), 'utf8');
  assert.doesNotMatch(raw, /git branch -r/);
});
