// Turns check-external-links.mjs's JSON into one issue on this repo, and keeps
// that issue in step with reality on every later run.
//
// Usage: node report-link-failures.mjs <report.json>
// Reads API (repo API base) and TOKEN from the environment.
//
// **Why an issue and not a notification.** The fleet's other scheduled checks
// ping ntfy, and that was this check's first design too. Two things moved it:
// ntfy.pebblecove.xyz is a tailnet address and the runner is a docker
// container, so that reach is unverified and would need a secret to use; and a
// dead GrabCAD link is a content edit rather than an outage, so it belongs on
// the list of things waiting to be fixed rather than on a phone. Bjørn's call,
// 2026-09-14, on #75.
//
// **One issue, reused.** A weekly job that opens a fresh issue per run buries
// the repo in a month. The marker below identifies the one this job owns; it
// is edited in place while something is wrong and closed when nothing is. A
// comment is only added when the set of dead links actually changes, so a
// problem that sits unfixed for six weeks does not generate six notifications
// saying the same thing.
//
// The token never reaches argv or a log line: it is read from the environment
// and only ever used as a header value, and no error path here prints the
// request it came from.
import { readFileSync } from 'node:fs';

const MARKER = '<!-- external-link-check -->';
// Kept in step with check-external-links.mjs by hand rather than imported: the
// two scripts run as separate steps and this one is only ever handed the JSON.
const OK_RATE_FLOOR = 0.8;
const TITLE = 'ci: external links are failing';

// Environment variables that might hold a usable credential, best first.
// TOKEN is what a person running this by hand sets; the other two are what the
// workflow has. None of them is assumed to work - see resolveToken.
const TOKEN_NAMES = ['TOKEN', 'AUTOMATIC_TOKEN', 'FORGE_PR_TOKEN'];

const args = process.argv.slice(2);
const probeOnly = args[0] === '--probe';
const reportPath = probeOnly ? null : args[0];
const { API } = process.env;

if (!probeOnly && !reportPath) {
  console.log('usage: report-link-failures.mjs <report.json>');
  console.log('       report-link-failures.mjs --probe');
  process.exit(2);
}
if (!API) {
  console.log('API must be set');
  process.exit(2);
}

/**
 * The first credential in the environment that the forge actually accepts.
 *
 * **It makes a request rather than checking that a variable is non-empty.**
 * The workflow's first version printed the length of its secret and called
 * that a check; the run then swept for two minutes and died on
 * `403: token does not have at least one of required scope(s): [read:issue]`,
 * because FORGE_PR_TOKEN is scoped for opening pull requests and cannot touch
 * issues at all. A credential check that does not use the credential proves
 * only that a variable is set.
 *
 * Run once from the workflow with --probe before the sweep, so that a run
 * which could never report its findings stops before spending the time, and
 * again here for the real work.
 *
 * A read is not proof of a write, and this forge has nothing non-destructive
 * that would prove one. The write is still checked by making it - but only
 * when there is something to report, and it fails loudly when it fails.
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
  console.log('No credential here can read issues on this repo, so a dead link');
  console.log('would be found and never reported. Stopping.');
  console.log(`Tried: ${TOKEN_NAMES.filter(n => process.env[n]).join(', ') || '(none were set)'}`);
  process.exit(1);
}

const token = await resolveToken();
if (probeOnly) process.exit(0);

const auth = { Authorization: `token ${token}`, 'Content-Type': 'application/json' };

/**
 * Every forge call goes through here so that a failure says what was being
 * attempted and what came back. A permissions problem on this forge can arrive
 * looking like a missing route - the automatic token is refused on POST /pulls
 * with a 404 reading "Can not read pulls" - so the response body is the only
 * thing that separates the two, and it is always printed.
 */
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

function buildBody({ checkedAt, total, dead, blind, systemic }) {
  const lines = [
    MARKER,
    '',
    `Found by the weekly external link check, last run ${checkedAt}.`,
    `${total} external links checked; our own hostnames are skipped, since`,
    '`tests/internal-links.test.mjs` already covers those in relative form.',
    '',
  ];

  if (dead.length) {
    lines.push(`## Dead (${dead.length})`, '');
    lines.push('| link | status | linked from |', '| --- | --- | --- |');
    for (const row of dead) {
      const status = row.status ? String(row.status) : row.errorCode;
      lines.push(`| ${row.url} | ${status} | ${row.pages.join('<br>')} |`);
    }
    lines.push('');
    // Said once here rather than re-derived every time somebody reads the list.
    lines.push(
      'A 404 on a `grabcad.com` link means the model was removed or made private,',
      'so the fix is usually editing the page rather than correcting the URL.',
      '',
    );
  }

  if (systemic) {
    // First, and in those words, because it changes what the rest of the body
    // means: a run that could not reach most of the web has not established
    // that the links it did not list are fine.
    lines.push(
      '## The check itself could not get answers',
      '',
      `Only ${systemic.ok} of ${systemic.total} links answered - ${Math.round(systemic.rate * 100)}%, ` +
        `against a floor of ${Math.round(OK_RATE_FLOOR * 100)}%. **Read this run as a report about`,
      'the checker rather than about the site**: a blocked user agent, a resolver that',
      'stopped resolving or a runner without egress all look like this, and the links',
      'not listed below have not been shown to be fine.',
      '',
    );
  }

  if (blind.length) {
    lines.push(`## Could not be checked at all (${blind.length} host(s))`, '');
    lines.push(
      'Every link on these hosts came back unreadable, which means the check has',
      'gone blind for them rather than that the links are broken. Worth a look at',
      '`USER_AGENT` and the verdict rules in',
      '`.forgejo/scripts/check-external-links.mjs`.',
      '',
    );
    for (const row of blind) lines.push(`- **${row.host}** - all ${row.links} links unreadable (${row.sample})`);
    lines.push('');
  }

  lines.push(
    '---',
    '',
    'Opened and updated by `.forgejo/workflows/external-links.yml`. It closes',
    'itself when a run finds nothing, so editing this body by hand will not last.',
  );

  return lines.join('\n');
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const { dead, blind, systemic } = report;
const existing = await findIssue();
const nothingWrong = !dead.length && !blind.length && !systemic;

if (nothingWrong) {
  if (!existing) {
    console.log('no dead links, and no open issue to close');
  } else {
    await api('POST', `/issues/${existing.number}/comments`, {
      body: `Clear as of ${report.checkedAt}: all ${report.total} external links answered. Closing.`,
    });
    await api('PATCH', `/issues/${existing.number}`, { state: 'closed' });
    console.log(`closed #${existing.number}`);
  }
  process.exit(0);
}

const body = buildBody(report);

if (!existing) {
  const created = await api('POST', '/issues', { title: TITLE, body });
  console.log(
    `opened #${created.number} - ${dead.length} dead, ${blind.length} blind host(s)` +
      `${systemic ? ', and the run itself went blind' : ''}`,
  );
  process.exit(0);
}

// What changed since the last run, read out of the issue body that run wrote.
// This is why the body carries the full URL list rather than a summary: it is
// the only state this job keeps, and it survives on the forge rather than on
// the runner.
const previouslyDead = new Set(
  [...existing.body.matchAll(/^\| (https?:\/\/\S+) \|/gm)].map(m => m[1]),
);
const nowDead = new Set(dead.map(row => row.url));
const appeared = [...nowDead].filter(url => !previouslyDead.has(url));
const fixed = [...previouslyDead].filter(url => !nowDead.has(url));

await api('PATCH', `/issues/${existing.number}`, { body });

if (!appeared.length && !fixed.length) {
  console.log(`#${existing.number} updated; same ${dead.length} dead link(s) as last run, no comment added`);
  process.exit(0);
}

const change = [`Changed since the last run (${report.checkedAt}):`, ''];
if (appeared.length) change.push(`**Newly dead (${appeared.length})**`, '', ...appeared.map(u => `- ${u}`), '');
if (fixed.length) change.push(`**No longer failing (${fixed.length})**`, '', ...fixed.map(u => `- ${u}`), '');

await api('POST', `/issues/${existing.number}/comments`, { body: change.join('\n') });
console.log(`#${existing.number} updated: ${appeared.length} new, ${fixed.length} fixed`);
