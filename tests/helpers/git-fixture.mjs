/**
 * Throwaway git repositories for the two jobs that read the remote branch list.
 *
 * git is the thing being asked - what counts as merged, and when a branch
 * reached main - so a stub would be a stub of exactly the part that has to be
 * right. Each fixture builds a bare "remote", clones it, and arranges the
 * history the test needs with backdated commits.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const IDENTITY = [
  '-c', 'user.name=Test',
  '-c', 'user.email=test@example.com',
  '-c', 'commit.gpgsign=false',
];

/** Hours ago, as a git date string. */
export const ago = hours => new Date(Date.now() - hours * 3_600_000).toISOString();

export function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'stuck-branches-'));
  const remote = join(dir, 'remote.git');
  const work = join(dir, 'work');

  const git = (cwd, ...args) => execFileSync('git', [...IDENTITY, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' },
  });

  execFileSync('git', ['init', '--bare', '-b', 'main', remote]);
  execFileSync('git', ['clone', remote, work]);

  /** A commit on the current branch, dated however long ago. */
  const commit = (message, hoursAgo) => execFileSync('git', [...IDENTITY, 'commit', '--allow-empty', '-m', message], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_AUTHOR_DATE: ago(hoursAgo),
      GIT_COMMITTER_DATE: ago(hoursAgo),
    },
  });

  commit('root', 200);
  git(work, 'push', '-u', 'origin', 'main');

  return { dir, work, git: (...a) => git(work, ...a), commit };
}

/**
 * Branches off main, commits, merges back and pushes both - leaving the branch
 * on the remote, which is the state the cleanup is supposed to end.
 */
export function mergedBranch(repo, name, { tipHoursAgo, landedHoursAgo }) {
  repo.git('checkout', '-q', '-b', name, 'main');
  repo.commit(`work on ${name}`, tipHoursAgo);
  repo.git('push', '-q', '-u', 'origin', name);
  repo.git('checkout', '-q', 'main');
  execFileSync('git', [...IDENTITY, 'merge', '--no-ff', '-m', `Merge ${name}`, name], {
    cwd: repo.work,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_AUTHOR_DATE: ago(landedHoursAgo),
      GIT_COMMITTER_DATE: ago(landedHoursAgo),
    },
  });
  repo.git('push', '-q', 'origin', 'main');
}

/** An open branch: pushed, never merged. */
export function openBranch(repo, name, { tipHoursAgo }) {
  repo.git('checkout', '-q', '-b', name, 'main');
  repo.commit(`work on ${name}`, tipHoursAgo);
  repo.git('push', '-q', '-u', 'origin', name);
  repo.git('checkout', '-q', 'main');
}
