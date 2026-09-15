// The two questions both branch jobs ask git: which refs on the remote are
// ours, and which of them are already on main.
//
// One module rather than a copy each, because the answers are where the traps
// are and a copy is where a trap comes back. #84 is the worked example: the
// sweep selected with `git branch -r --merged origin/main | grep '^herd/'`
// over refs that were never fetched, so it matched nothing on every run and
// said "no merged herd/ branches" to a remote it could not see.
//
// Nothing here fetches. The caller is responsible for having the refs, and the
// workflows do it in a step of their own so that the fetch is visible in the
// job log rather than buried in a script - see the test that asserts it is
// still there.
import { spawnSync } from 'node:child_process';

export function git(...args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  return {
    ok: res.status === 0,
    status: res.status,
    out: (res.stdout ?? '').trim(),
    err: (res.stderr ?? '').trim(),
  };
}

/**
 * Every herd/ branch on the remote, by short name.
 *
 * **The `**` is load-bearing.** A single `*` stops at the slash, and every
 * branch here is herd/<topic>, so the pattern without it matches nothing and
 * every caller concludes the remote is clean. ls-remote does not share this
 * behaviour, which is part of why it is easy to get wrong in only one place.
 */
export function herdBranches(remote = 'origin') {
  const res = git('for-each-ref', '--format=%(refname:short)', `refs/remotes/${remote}/herd/**`);
  if (!res.ok || !res.out) return [];
  return res.out.split('\n').filter(Boolean).map(ref => ref.replace(new RegExp(`^${remote}/`), ''));
}

/** Whether git considers the branch's commits reachable from main. */
export function isMerged(branch, remote = 'origin') {
  return git('merge-base', '--is-ancestor', `${remote}/${branch}`, `${remote}/main`).ok;
}

/**
 * When the branch reached main: the commit that brought it there.
 *
 * --topo-order --reverse, not the default. rev-list sorts by commit date, so
 * in a history where dates and topology disagree - a rebase, a backdated
 * commit, a merge of an old branch after a newer one - the oldest date on the
 * path belongs to some unrelated commit further along main, and the branch
 * inherits its age. A test with three merges in one repository caught this
 * reporting a branch merged 30 hours ago as 180 hours stuck.
 *
 * Returns null when git cannot say, which is never treated as "long ago".
 */
export function landedAt(branch, remote = 'origin') {
  const ref = `${remote}/${branch}`;
  const path = git('rev-list', '--ancestry-path', '--topo-order', '--reverse', `${ref}..${remote}/main`);
  const commit = path.ok && path.out ? path.out.split('\n')[0] : ref;
  const date = git('show', '-s', '--format=%cI', commit);
  return date.ok ? date.out : null;
}

/** Refuses to answer anything about a remote whose main is not there. */
export function requireMain(remote = 'origin') {
  const res = git('rev-parse', '--verify', `${remote}/main`);
  if (!res.ok) {
    console.log(`${remote}/main is not readable here, so nothing below would mean anything.`);
    console.log('The job needs a checkout and a fetch of the remote\'s branch refs.');
    process.exit(2);
  }
}
