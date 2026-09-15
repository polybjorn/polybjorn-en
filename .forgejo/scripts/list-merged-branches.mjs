// Prints every herd/ branch on the remote that is already contained in main,
// one per line, for the sweep in delete-merged-branch.yml to hand to
// delete-branches.mjs.
//
// Usage: node list-merged-branches.mjs
// Needs a checkout whose remote branch refs have been fetched.
//
// This was four lines of shell in the workflow until #84:
//
//   git branch -r --merged origin/main | sed 's|^ *origin/||' | grep '^herd/'
//
// It selected over refs that actions/checkout never brings, so it matched
// nothing on every run and the job printed "no merged herd/ branches" to a
// remote it could not see. The selection lives here now, on the same module
// the #73 watchdog reads, so the two jobs cannot disagree about what "ours"
// and "merged" mean.
//
// Names go to stdout and everything else to stderr, so the caller can use the
// output directly without filtering commentary out of it.
import { herdBranches, isMerged, requireMain } from './herd-branches.mjs';

requireMain();

const names = herdBranches();
const merged = names.filter(name => isMerged(name));

// On stderr, and said even when the answer is none: "the remote is clean" and
// "the check could not see the remote" are the same silence otherwise, which
// is the whole of #84.
console.error(`${names.length} herd/ branch(es) on the remote, ${merged.length} already merged into main`);
for (const name of names) {
  console.error(`  ${name}${merged.includes(name) ? ' (merged)' : ''}`);
}

if (merged.length) console.log(merged.join('\n'));
