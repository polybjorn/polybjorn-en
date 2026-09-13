/**
 * The subpath rewrite that lets a build survive being served from
 * /<site>/<branch>/ on the fleet's preview server.
 *
 * This runs against a fixture rather than the real build: the real one is made
 * for the site root, and building it twice to test the other shape would
 * double what `npm test` costs. What matters here is which URLs the pass takes
 * and which it leaves alone, and a fixture states that in one screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/polybjorn-en/herd-topic/';

function rewrite(html, { base = BASE } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'preview-'));
  try {
    mkdirSync(join(dir, 'deep'), { recursive: true });
    writeFileSync(join(dir, 'deep', 'index.html'), html);
    execFileSync(process.execPath, [join(ROOT, 'scripts', 'prepare-preview.mjs'), dir], {
      env: { ...process.env, PREVIEW_BASE: base },
      encoding: 'utf8',
    });
    return readFileSync(join(dir, 'deep', 'index.html'), 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a hand-written root path gets the base', () => {
  const out = rewrite('<a href="/projects">p</a><img src="/images/x.svg">');

  assert.match(out, /href="\/polybjorn-en\/herd-topic\/projects"/);
  assert.match(out, /src="\/polybjorn-en\/herd-topic\/images\/x\.svg"/);
});

test('what Astro already based is left alone', () => {
  const out = rewrite('<link href="/polybjorn-en/herd-topic/_astro/a.css">');

  assert.equal(out.match(/polybjorn-en/g).length, 1, 'a second pass would double the prefix');
});

test('somebody else\'s server is left alone', () => {
  const html = '<a href="https://polybjorn.no/prosjekter">no</a><img src="//cdn.example/x.png">';

  assert.equal(rewrite(html), html);
});

test('every candidate in a srcset is rewritten', () => {
  const out = rewrite('<img srcset="/a.png 800w, /b.png 1200w, https://cdn.example/c.png 1600w">');

  assert.match(out, /\/polybjorn-en\/herd-topic\/a\.png 800w/);
  assert.match(out, /\/polybjorn-en\/herd-topic\/b\.png 1200w/);
  assert.match(out, /https:\/\/cdn\.example\/c\.png 1600w/);
});

test('it refuses to run without a base rather than guessing one', () => {
  assert.throws(() => rewrite('<a href="/x">x</a>', { base: '' }), /status 2|Command failed/);
});

test('it refuses a base that is not a directory path', () => {
  assert.throws(() => rewrite('<a href="/x">x</a>', { base: '/no-trailing-slash' }), /status 2|Command failed/);
});
