// Turns check-stuck-branches.mjs's JSON into one issue on this repo, and keeps
// that issue in step with reality on every later run.
//
// Usage: node report-stuck-branches.mjs <report.json>
//        node report-stuck-branches.mjs --probe
// Reads API (repo API base) and a token from the environment.
//
// **Why an issue.** Bjørn's call on #73, 2026-09-15, and the same shape #77
// already uses for dead links: a branch that survived the sweep is a thing to
// fix rather than an outage, and failing an unrelated merge red for it is how
// rovar-no's watchdog got muted after going red twice for branches nobody had
// lost.
//
// **One issue, reused.** The marker below identifies the one this job owns; it
// is edited in place while branches are stuck and closed when the remote comes
// back clean. A comment is only added when the set of branches changes, so a
// branch nobody has got round to deleting does not generate a notification on
// every merge.
//
// The token never reaches argv or a log line: it is read from the environment
// and only ever used as a header value.
import { readFileSync } from 'node:fs';

const MARKER = '<!-- stuck-branch-check -->';
const TITLE = 'ci: merged branches are surviving the sweep';

// Environment variables that might hold a usable credential, best first. The
// same three report-link-failures.mjs tries, for the same reason: none of them
// is assumed to work.
const TOKEN_NAMES = ['TOKEN', 'AUTOMATIC_TOKEN', 'FORGE_PR_TOKEN'];

const args = process.argv.slice(2);
const probeOnly = args[0] === '--probe';
const reportPath = probeOnly ? null : args[0];
const { API } = process.env;

if (!probeOnly && !reportPath) {
  console.log('usage: report-stuck-branches.mjs <report.json>');
  console.log('       report-stuck-branches.mjs --probe');
  process.exit(2);
}
if (!API) {
  console.log('API must be set');
  process.exit(2);
}

/**
 * The first credential in the environment that the forge actually accepts.
 * It makes a request rather than checking that a variable is non-empty:
 * FORGE_PR_TOKEN is scoped for pull requests and cannot touch issues at all,
 * and a credential check that does not use the credential proves only that a
 * variable is set.
 */
async function resolveToken() {
  for (const name of TOKEN_NAMES) {
    const value = process.env[name];
    if (!value) continue;
    const res = await fetch(`${API}/issues?state=open&type=issues&limit=1`, {
      headers: { Authorization: `token ${value}` },
    });
    // The length, never the value, and never the header it went in.
    console.log(`${name} (${value.length} characters) can read issues: HTTP ${res.status}`);
    if (res.ok) return value;
  }

  console.log('');
  console.log('No credential here can read issues on this repo, so a stuck branch');
  console.log('would be found and never reported. Stopping.');
  console.log(`Tried: ${TOKEN_NAMES.filter(n => process.env[n]).join(', ') || '(none were set)'}`);
  process.exit(1);
}

const token = await resolveToken();
if (probeOnly) process.exit(0);

const auth = { Authorization: `token ${token}`, 'Content-Type': 'application/json' };

/** Every call goes through here so a failure says what was attempted. */
async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: auth,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}\n${text}`);
  }
  return res.status === 204 ? null : res.json();
}

/** The issue this job owns, found by its marker rather than by its title. */
async function findIssue() {
  const open = await api('GET', '/issues?state=open&type=issues&limit=50');
  return open.find(issue => issue.body?.includes(MARKER)) ?? null;
}

function buildBody({ checkedAt, thresholdHours, stuck }) {
  return [
    MARKER,
    '',
    `${stuck.length} branch(es) merged into main are still on the remote and have`,
    `outlived the ${thresholdHours}h threshold, as of ${checkedAt}.`,
    '',
    '| branch | landed | age |',
    '| --- | --- | --- |',
    ...stuck.map(b => `| \`${b.name}\` | ${b.landedAt} | ${Math.round(b.ageHours)}h |`),
    '',
    'The daily sweep in `delete-merged-branch.yml` should have removed these. A',
    'branch listed here means the sweep has stopped running, or it ran and could',
    'not delete them - the sweep\'s own log says which, and #80 is what to read',
    'if a delete reported success over a branch that is still there.',
    '',
    'They can be removed by hand with `git push origin --delete <branch>`.',
    '',
    '---',
    '',
    'Opened and updated by `.forgejo/workflows/stuck-branches.yml`, which runs on',
    'every push to main. It closes itself when a run finds nothing, so editing',
    'this body by hand will not last.',
  ].join('\n');
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const { stuck } = report;
const existing = await findIssue();

if (!stuck.length) {
  if (!existing) {
    console.log('nothing stuck, and no open issue to close');
  } else {
    await api('POST', `/issues/${existing.number}/comments`, {
      body: `Clear as of ${report.checkedAt}: no merged \`herd/\` branch has outlived ${report.thresholdHours}h. Closing.`,
    });
    await api('PATCH', `/issues/${existing.number}`, { state: 'closed' });
    console.log(`closed #${existing.number}`);
  }
  process.exit(0);
}

const body = buildBody(report);

if (!existing) {
  const created = await api('POST', '/issues', { title: TITLE, body });
  console.log(`opened #${created.number} - ${stuck.length} stuck branch(es)`);
  process.exit(0);
}

// What changed since the last run, read out of the issue body that run wrote.
// The body carries the full list rather than a count because it is the only
// state this job keeps, and it lives on the forge rather than on the runner.
const previously = new Set(
  [...existing.body.matchAll(/^\| `(\S+)` \|/gm)].map(m => m[1]),
);
const now = new Set(stuck.map(b => b.name));
const appeared = [...now].filter(name => !previously.has(name));
const cleared = [...previously].filter(name => !now.has(name));

await api('PATCH', `/issues/${existing.number}`, { body });

if (!appeared.length && !cleared.length) {
  console.log(`#${existing.number} updated; same ${stuck.length} branch(es) as last run, no comment added`);
  process.exit(0);
}

const change = [`Changed since the last run (${report.checkedAt}):`, ''];
if (appeared.length) change.push(`**Newly stuck (${appeared.length})**`, '', ...appeared.map(n => `- \`${n}\``), '');
if (cleared.length) change.push(`**Gone since (${cleared.length})**`, '', ...cleared.map(n => `- \`${n}\``), '');

await api('POST', `/issues/${existing.number}/comments`, { body: change.join('\n') });
console.log(`#${existing.number} updated: ${appeared.length} new, ${cleared.length} cleared`);
