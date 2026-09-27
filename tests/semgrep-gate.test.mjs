/**
 * The shape the static-analysis gate has to keep.
 *
 * Two of these are traps rather than preferences. The semgrep image is Alpine
 * and carries no node, so a step that reaches for actions/checkout dies with
 * `executable file node not found` - which is why every job on that label uses
 * the composite checkout instead. And semgrep-scan refuses to run anywhere it
 * cannot find /semgrep, so the job only works on the `semgrep` label.
 *
 * The third is the one that decides whether this is a gate at all: `fail-on`
 * set to `none` reports without ever failing, which looks identical to a clean
 * run on every tick it ever produces.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const jobs = parse(readFileSync(join(ROOT, '.forgejo', 'workflows', 'ci.yml'), 'utf8')).jobs;

const scan = Object.entries(jobs)
  .find(([, job]) => (job.steps ?? []).some(s => /semgrep-scan@/.test(s.uses ?? '')));

test('the scan runs on the semgrep label, which is the only place it works', () => {
  assert.ok(scan, 'no job runs semgrep-scan');
  assert.equal(scan[1]['runs-on'], 'semgrep');
});

test('nothing in that job reaches for a JavaScript action', () => {
  // The image has no node. actions/checkout, actions/setup-node and the rest
  // all fail the same way, so this checks the namespace rather than one name.
  for (const step of scan[1].steps) {
    assert.doesNotMatch(step.uses ?? '', /(^|\/)actions\//,
      `${step.uses} is a JavaScript action and the semgrep image has no node`);
  }
});

test('the gate actually fails on a finding', () => {
  const step = scan[1].steps.find(s => /semgrep-scan@/.test(s.uses ?? ''));
  assert.notEqual(step.with['fail-on'], 'none', 'fail-on: none reports without gating anything');
  assert.ok(['any', 'new'].includes(step.with['fail-on']),
    `fail-on is ${step.with['fail-on']}, which the action does not define`);

  // `new` is the action's default and needs a baseline commit; without one it
  // resolves nothing and the step's own refusal is the only thing standing
  // between that and a permanently green gate.
  if (step.with['fail-on'] === 'new') {
    assert.ok(step.with['baseline-commit'], 'fail-on: new needs a baseline-commit');
  }
});

test('the rulesets are the ones this tree has files for', () => {
  const step = scan[1].steps.find(s => /semgrep-scan@/.test(s.uses ?? ''));
  const named = String(step.with.rulesets).split(/\s+/).filter(Boolean);
  assert.deepEqual(named.sort(), ['javascript', 'typescript'],
    'this tree is .js/.mjs/.ts; python scans nothing and default is those three plus it');
});
