// Deletes branches with git, and lets git be the judge. Both jobs in
// delete-merged-branch.yml call this rather than carrying their own copy: the
// two paths differ in how they choose branches, not in what deleting one
// means, and a rule mirrored per job is a rule that drifts.
//
// Usage: node delete-branches.mjs <branch>...
// Needs a checkout with a push credential, which actions/checkout leaves
// behind. It reads no token of its own and talks to no API.
//
// **Why no API.** This script used to DELETE through the forge API and then
// re-read the same API to confirm. Both halves of that are unsound, and #80
// measured why on the forge host:
//
//   - The database and the git ref can disagree. The forge deletes a ref
//     correctly, records it, and then recreates the ref at its old sha without
//     undoing the record. End state: the branch is present on `git ls-remote`,
//     `GET /git/refs/heads` and `GET /branches/{name}`, and absent from
//     `GET /branches`, which is the surface that reads the database. In the
//     other direction, #172 documented the database deletion landing while the
//     ref write did not. So asking the API whether a branch is gone is asking
//     the party that was already fooled.
//   - A 404 is not proof of absence anyway: a token that cannot see a repo is
//     answered the same way as one asking after something that is not there.
//     That is deliberate on the forge's part and not something a caller can
//     unpick. On 2026-09-14 that read reported success on #72's merge while
//     herd/node-24 was still on the remote.
//
// git is the surface that matters - a branch nobody can push to or fetch is
// gone in the only sense that costs anything - so git both executes and
// decides here.
//
// **Why it retries instead of reporting.** The recreate does not land at a
// fixed offset from the delete: #80's two specimens were 1.775 s after and
// 0.069 s before the push printed `- [deleted]`. No arrangement of checks is a
// guarantee against that, and a one-shot job that goes red for branches nobody
// lost is a watchdog that gets muted - rovar-no's did, on two of its first
// four merges. So this converges: delete, wait, ask git, delete again if it
// came back, bounded at four. Red is reserved for a ref that survives all
// four. The restore fires once, on the delete that follows a merge, so the
// second delete is the one that sticks.
//
// Every branch is attempted even when an earlier one fails, so one stuck
// branch does not hide the state of the rest, and the exit code is non-zero if
// any of them ended up still there.
import { spawnSync } from 'node:child_process';

const ATTEMPTS = 4;
// Long enough to cover the measured restore, short enough that four of them
// fit in the job's timeout. The tests set it to something small; nothing else
// does.
const WAIT_MS = Number(process.env.DELETE_WAIT_MS ?? 5000);

const branches = process.argv.slice(2);

// Said out loud, because "nothing to delete" and "the argument never arrived"
// are the same silence otherwise, and the second is a bug.
console.log(`branches given: ${branches.length ? branches.join(' ') : '(none)'}`);

if (!branches.length) process.exit(0);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function git(...args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.error) return { ok: false, status: -1, stdout: '', stderr: res.error.message };
  return {
    ok: res.status === 0,
    status: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

// Asked of the remote, by full refname so the answer is about this branch and
// nothing that merely starts with its name.
function state(branch) {
  const res = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
  if (!res.ok) {
    return { name: 'unreadable', why: `git ls-remote exited ${res.status}: ${res.stderr.trim()}` };
  }
  return { name: res.stdout.trim() ? 'present' : 'absent' };
}

let failed = 0;

for (const branch of branches) {
  let deletes = 0;
  let lastPush = null;

  // One pass more than there are deletes: the extra one is the verdict, so the
  // fourth delete is checked like the three before it.
  for (let attempt = 1; attempt <= ATTEMPTS + 1; attempt++) {
    const here = state(branch);

    if (here.name === 'absent') {
      if (deletes === 0) {
        // The merge dialog's own checkbox, a manual sweep, or the other job in
        // this workflow racing this one. The end state we wanted either way.
        console.log(`${branch} is already gone`);
      } else {
        console.log(`deleted ${branch}, gone after ${deletes} ${deletes === 1 ? 'delete' : 'deletes'}`);
      }
      break;
    }

    if (attempt > ATTEMPTS) {
      // Loud, because a cleanup that fails quietly goes back to piling
      // branches up without saying so.
      console.log(
        here.name === 'present'
          ? `${branch} is STILL on the remote after ${deletes} deletes`
          : `${branch} could not be read after ${deletes} deletes: ${here.why}`,
      );
      if (lastPush && !lastPush.ok) {
        console.log(`last push exited ${lastPush.status}: ${lastPush.stderr.trim()}`);
      }
      failed += 1;
      break;
    }

    if (here.name === 'unreadable') {
      // Not absent, and not something to delete on top of either: an answer
      // nobody understood is a reason to ask again, not to act.
      console.log(`${branch}: ${here.why} - asking again`);
      await sleep(WAIT_MS);
      continue;
    }

    lastPush = git('push', 'origin', '--delete', `refs/heads/${branch}`);
    deletes += 1;
    if (!lastPush.ok) {
      console.log(`push --delete ${branch} exited ${lastPush.status}: ${lastPush.stderr.trim()}`);
    }
    await sleep(WAIT_MS);
  }
}

if (failed) process.exitCode = 1;
