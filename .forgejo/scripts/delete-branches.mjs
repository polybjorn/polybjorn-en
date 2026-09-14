// Deletes branches through the forge API. Both jobs in
// delete-merged-branch.yml call this rather than carrying their own copy of
// the request: the two paths differ in how they choose branches, not in what
// deleting one means, and a rule mirrored per job is a rule that drifts.
//
// Usage: node delete-branches.mjs <branch>...
// Reads API (repo API base) and TOKEN from the environment.
//
// **It asserts the outcome, never a status code.** The first version read
// "404 from a GET" as proof the branch was gone, and on 2026-09-14 it reported
// success on polybjorn-en #72's merge while herd/node-24 was still on the
// remote - a cleanup failing silently, which is the one thing this workflow
// exists to prevent. A 404 is not proof of absence: a token that cannot see a
// repo is answered the same way as one asking about something that is not
// there, which is deliberate on the forge's part and not something a caller
// can unpick.
//
// So every branch is checked before and after. Present then absent is a
// delete. Absent to begin with is somebody else's delete, which is the desired
// end state. Present afterwards is a failure whatever the DELETE said, and the
// status codes go in the log as evidence rather than as the decision.
//
// Every branch is attempted even when an earlier one fails, so one broken
// branch does not hide the state of the rest, and the exit code is non-zero if
// any of them failed.
const branches = process.argv.slice(2);
const { API, TOKEN } = process.env;

if (!API || !TOKEN) {
  console.log('API and TOKEN must be set');
  process.exit(2);
}

// Said out loud, because "nothing to delete" and "the argument never arrived"
// are the same silence otherwise, and the second is a bug.
console.log(`branches given: ${branches.length ? branches.join(' ') : '(none)'}`);

if (!branches.length) process.exit(0);

const ref = branch => `${API}/branches/${encodeURIComponent(branch)}`;
const auth = { Authorization: `token ${TOKEN}` };

// 200 present, 404 absent, anything else unknown - and unknown is not absent.
async function state(branch) {
  const res = await fetch(ref(branch), { headers: auth });
  if (res.status === 200) return 'present';
  if (res.status === 404) return 'absent';
  return `unreadable (${res.status})`;
}

let failed = 0;

for (const branch of branches) {
  const before = await state(branch);

  if (before === 'absent') {
    // The merge dialog's own checkbox, a manual sweep, or the other job in
    // this workflow racing this one. The end state we wanted either way.
    console.log(`${branch} is already gone`);
    continue;
  }

  if (before !== 'present') {
    console.log(`could not read ${branch} before deleting: ${before}`);
    failed += 1;
    continue;
  }

  const res = await fetch(ref(branch), { method: 'DELETE', headers: auth });
  const body = res.ok ? '' : await res.text();
  const after = await state(branch);

  if (after === 'absent') {
    console.log(`deleted ${branch} (delete said ${res.status})`);
    continue;
  }

  // Loud, because a cleanup that fails quietly goes back to piling branches up
  // without saying so - and because this is the case that got through before.
  console.log(`${branch} is still there after DELETE said ${res.status} ${res.statusText}`);
  if (body) console.log(body);
  if (after !== 'present') console.log(`and it now reads ${after}`);
  failed += 1;
}

if (failed) process.exitCode = 1;
