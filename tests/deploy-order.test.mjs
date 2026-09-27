/**
 * The two sites publish in the order their links require.
 *
 * polybjorn.no has no article pages of its own: src/components/ProjectsPage.astro
 * points its cards at polybjorn.com/projects/<slug>. So polybjorn.com has to be
 * live before polybjorn.no is, or a fresh article 404s from the Norwegian
 * listing until GitHub Pages catches up - and the edge caches that 404 for ten
 * minutes. This held for two and a half hours on 2026-09-27, measured from
 * last-modified on both sites, because dist-no was pushed from the build job
 * while polybjorn.com waited for the deploy job.
 *
 * Asserted against the job graph rather than the step order, because that is
 * what decides it. The jobs are found by the actions they run, so renaming one
 * does not quietly stop this checking anything.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const jobs = parse(readFileSync(join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8')).jobs;

/** The name of the one job whose steps use an action matching `pattern`. */
const jobUsing = (pattern) => {
  const found = Object.entries(jobs)
    .filter(([, job]) => (job.steps ?? []).some(s => pattern.test(s.uses ?? '')));
  assert.equal(found.length, 1, `expected exactly one job using ${pattern}, got ${found.length}`);
  return found[0][0];
};

/** Every job `name` waits on, directly or through another job's needs. */
const waitsOn = (name, seen = new Set()) => {
  for (const dep of [jobs[name].needs ?? []].flat()) {
    if (seen.has(dep)) continue;
    seen.add(dep);
    waitsOn(dep, seen);
  }
  return seen;
};

test('polybjorn.no is published only after polybjorn.com is live', () => {
  const en = jobUsing(/actions\/deploy-pages/);
  const no = jobUsing(/peaceiris\/actions-gh-pages/);

  assert.notEqual(no, en, 'both sites publish from the same job, so neither can wait for the other');
  assert.ok(waitsOn(no).has(en),
    `the job publishing polybjorn.no (${no}) does not wait for the one publishing polybjorn.com (${en})`);
});

test('dist-no reaches the job that publishes it', () => {
  const no = jobUsing(/peaceiris\/actions-gh-pages/);
  const publish = jobs[no].steps.find(s => /peaceiris\/actions-gh-pages/.test(s.uses ?? ''));
  const dir = publish.with.publish_dir.replace(/^\.\//, '').replace(/\/$/, '');

  // The build job writes dist-no with prepare-deploy.mjs; a later job only has
  // it if it was uploaded and downloaded again under the same name.
  const download = jobs[no].steps.find(s => /actions\/download-artifact/.test(s.uses ?? ''));
  assert.ok(download, `${no} publishes ${dir} without downloading it`);
  assert.equal(download.with.path.replace(/\/$/, ''), dir,
    'the artifact lands somewhere other than the directory being published');

  const uploads = Object.values(jobs).flatMap(job => (job.steps ?? [])
    .filter(s => /actions\/upload-artifact/.test(s.uses ?? ''))
    .map(s => s.with));
  assert.ok(uploads.some(w => w.name === download.with.name),
    `nothing uploads an artifact named ${download.with.name}`);
});

test('the IndexNow submission waits for both sites', () => {
  const [name, job] = Object.entries(jobs)
    .find(([, j]) => (j.steps ?? []).some(s => /indexnow/i.test(s.run ?? '')));
  const waits = waitsOn(name);

  for (const site of [jobUsing(/actions\/deploy-pages/), jobUsing(/peaceiris\/actions-gh-pages/)]) {
    assert.ok(waits.has(site), `${name} reads a sitemap from a site ${site} has not published yet`);
  }
  assert.ok(job, 'no job submits to IndexNow');
});
