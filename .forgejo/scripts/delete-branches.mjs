// Deletes branches through the forge API. Both jobs in
// delete-merged-branch.yml call this rather than carrying their own copy of
// the request: the two paths differ in how they choose branches, not in what
// deleting one means, and a rule mirrored per job is a rule that drifts.
//
// Usage: node delete-branches.mjs <branch>...
// Reads API (repo API base) and TOKEN from the environment.
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

if (!branches.length) {
  console.log('nothing to delete');
  process.exit(0);
}

let failed = 0;

for (const branch of branches) {
  const res = await fetch(`${API}/branches/${encodeURIComponent(branch)}`, {
    method: 'DELETE',
    headers: { Authorization: `token ${TOKEN}` },
  });

  if (res.ok) {
    console.log(`deleted ${branch} (${res.status})`);
    continue;
  }

  const body = await res.text();

  // Someone got there first - the merge dialog's own checkbox, a manual sweep,
  // or the other job in this workflow racing this one - which is the desired
  // end state rather than a failure.
  //
  // Asked as a question rather than read off the status, because **this forge
  // answers a DELETE on a branch that is not there with 500 and an empty
  // message**, not 404 (measured against Forgejo 16.0.4 on 2026-09-14). The
  // media-tools original this was ported from treats 404 as the already-gone
  // case, so on this forge that arm never runs and a harmless race fails the
  // job instead. A GET does answer 404, so that is what decides it.
  const check = await fetch(`${API}/branches/${encodeURIComponent(branch)}`, {
    headers: { Authorization: `token ${TOKEN}` },
  });

  if (check.status === 404) {
    console.log(`${branch} is already gone`);
    continue;
  }

  // A token that may not delete refs, a protected branch, an API that moved.
  // Loud, because a cleanup that fails quietly goes back to piling branches up
  // without saying so.
  console.log(`could not delete ${branch}: ${res.status} ${res.statusText}`);
  console.log(body);
  failed += 1;
}

if (failed) process.exitCode = 1;
