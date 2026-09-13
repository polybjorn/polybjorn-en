/**
 * Builds this site for the fleet's preview server, which serves a branch from
 * a subpath: `http://hypervisor.pebblecove.net:8455/<site>/<branch>/`.
 *
 * The base path has to be baked into the build, and it has to match the path
 * the publisher will put it on, or the page renders with every asset missing.
 * Rather than asking someone to type the same slug twice, this derives it the
 * way `site-preview` does and hands back the publish command.
 *
 *   npm run preview:build              # base from the current branch
 *   BRANCH=herd/other npm run preview:build
 */
import { execFileSync, spawnSync } from 'node:child_process';

const SITE = 'polybjorn-en';

// The publisher's rule, kept in step with it: a preview path is two levels
// under the root, so anything a path cannot carry becomes a dash.
const slug = value => value
  .replace(/[^A-Za-z0-9._-]/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

const branch = process.env.BRANCH
  ?? execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();

if (!branch || branch === 'HEAD') {
  console.error('preview:build: cannot read a branch name; pass one as BRANCH=');
  process.exit(2);
}

const base = `/${slug(SITE)}/${slug(branch)}/`;
const env = { ...process.env, PREVIEW: '1', PREVIEW_BASE: base };

console.log(`preview:build: building ${branch} for ${base}`);

for (const args of [
  ['node_modules/astro/bin/astro.mjs', 'build'],
  ['scripts/prepare-preview.mjs'],
]) {
  // Both are node scripts, so run them with this node and no shell.
  const run = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (run.status !== 0) process.exit(run.status ?? 1);
}

console.log(`\npreview:build: publish it with\n  site-preview publish ${SITE} dist ${branch}`);
