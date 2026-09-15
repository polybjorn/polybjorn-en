// Asks whether the branch cleanup is still working, by looking at what it is
// supposed to leave behind rather than at whether it ran.
//
// Usage: node check-stuck-branches.mjs [--hours N] [--json <path>]
// Needs a checkout with the remote's herd/ refs and full history.
//
// **Why this and not a heartbeat.** #73 asked for something that knows the
// daily sweep should have run and says so when it has not, and concluded that
// the assertion has to live outside the workflow. The part worth keeping is
// that the *scheduler* cannot be trusted: a schedule that does not fire
// produces no run, and a run list is only ever evidence about runs that exist.
// The part worth dropping is asking about runs at all. #80 settled the same
// argument for deletion: check the end state, not the report.
//
// The sweep's end state is unambiguous. A `herd/` branch that is already an
// ancestor of main has nothing left to contribute and should not be on the
// remote. One assertion covers three failures - the schedule stopped firing,
// the sweep fired and failed, and the `pull_request` event was dropped - and
// none of them needs the forge API to detect.
//
// **Why it measures from when the branch landed.** The obvious clock is the
// tip commit's date, and it is wrong: a branch that was opened three weeks ago
// and merged a minute ago would read as three weeks stuck, and every long PR
// would open an issue against a cleanup that is working. What matters is how
// long the branch has been *redundant*, which starts when it reached main. So
// the clock is the commit that brought it there - the oldest commit on the
// ancestry path from the branch tip to main.
//
// **Why 26 hours.** The sweep runs daily at 04:17. A branch that has outlived
// one full cycle plus slack has survived the backstop, which is the thing this
// is watching for. Anything tighter reports the gap between a merge and the
// job that deletes it, which is a job doing its work rather than a failure.
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const hoursArg = args.indexOf('--hours');
const jsonArg = args.indexOf('--json');
const THRESHOLD_HOURS = hoursArg === -1 ? 26 : Number(args[hoursArg + 1]);
const jsonPath = jsonArg === -1 ? null : args[jsonArg + 1];

if (!Number.isFinite(THRESHOLD_HOURS) || THRESHOLD_HOURS < 0) {
  console.log('--hours needs a non-negative number');
  process.exit(2);
}

function git(...a) {
  const res = spawnSync('git', a, { encoding: 'utf8' });
  return {
    ok: res.status === 0,
    status: res.status,
    out: (res.stdout ?? '').trim(),
    err: (res.stderr ?? '').trim(),
  };
}

function must(...a) {
  const res = git(...a);
  if (!res.ok) {
    console.log(`git ${a.join(' ')} failed (${res.status}): ${res.err}`);
    process.exit(2);
  }
  return res.out;
}

// origin/main has to be readable, or every branch below would look unmerged
// and the check would invent a problem on every run.
must('rev-parse', '--verify', 'origin/main');

// `**` matters: a single `*` stops at the slash, and every branch here is
// herd/<topic>, so the pattern without it matches nothing and the check
// reports a clean remote forever.
const refs = must('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/herd/**')
  .split('\n')
  .filter(Boolean);

const now = Date.now();
const branches = [];

for (const ref of refs) {
  const name = ref.replace(/^origin\//, '');

  // Merged means reachable from main, which is git's own answer rather than a
  // string comparison on the branch name.
  if (!git('merge-base', '--is-ancestor', ref, 'origin/main').ok) continue;

  // The first commit on the path from the tip to main is the one that brought
  // it there: the merge commit for a merged PR, or the commit itself if it was
  // pushed straight on.
  //
  // --topo-order --reverse, not the default. rev-list sorts by commit date, so
  // in a history where dates and topology disagree - a rebase, a backdated
  // commit, a merge of an old branch after a newer one - the oldest *date* on
  // the path is some unrelated commit further along main, and the branch
  // inherits its age. A test with three merges in one repository caught this
  // reporting a branch merged 30 hours ago as 180 hours stuck.
  const path = git('rev-list', '--ancestry-path', '--topo-order', '--reverse', `${ref}..origin/main`);
  const landedCommit = path.ok && path.out ? path.out.split('\n')[0] : ref;
  const landedAt = git('show', '-s', '--format=%cI', landedCommit);
  if (!landedAt.ok) continue;

  const ageHours = (now - Date.parse(landedAt.out)) / 3_600_000;
  branches.push({
    name,
    landedAt: landedAt.out,
    ageHours: Math.round(ageHours * 10) / 10,
    stuck: ageHours > THRESHOLD_HOURS,
  });
}

branches.sort((a, b) => b.ageHours - a.ageHours);
const stuck = branches.filter(b => b.stuck);

const report = {
  checkedAt: new Date(now).toISOString(),
  thresholdHours: THRESHOLD_HOURS,
  merged: branches.length,
  branches,
  stuck,
};

// Said even when there is nothing wrong: "the remote is clean" and "the check
// never looked" are the same silence otherwise.
console.log(`${refs.length} herd/ branch(es) on the remote, ${branches.length} already merged into main`);
for (const b of branches) {
  console.log(`  ${b.name} landed ${b.landedAt} (${b.ageHours}h ago)${b.stuck ? ' STUCK' : ''}`);
}
console.log(stuck.length
  ? `${stuck.length} branch(es) have outlived the ${THRESHOLD_HOURS}h threshold`
  : `nothing has outlived the ${THRESHOLD_HOURS}h threshold`);

if (jsonPath) {
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`wrote ${jsonPath}`);
}
