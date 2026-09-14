/**
 * The lifecycle of the issue that report-link-failures.mjs owns: opened when a
 * link dies, edited rather than duplicated while it stays dead, quiet when
 * nothing changed, and closed when the links come back.
 *
 * Driven against a stub forge rather than the real one. The script runs once a
 * week against a repo nobody is watching for it, so every one of these
 * transitions happens where no one is looking - "it opened an issue once" is
 * the easy half, and the expensive bugs are a job that opens a fifth copy
 * every Monday or one that never closes the issue it opened.
 *
 * The stub answers the three endpoints the script uses and records what it was
 * asked, which is also how the token is checked to stay out of the log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.forgejo',
  'scripts',
  'report-link-failures.mjs',
);
const TOKEN = 'stub-token-never-printed';

/**
 * A forge that holds one list of issues, remembers every call, and refuses any
 * credential it was not told about - which is what FORGE_PR_TOKEN does in
 * reality, with a 403 naming the scope it lacks.
 */
function stubForge(issues = [], accepts = [TOKEN]) {
  const calls = [];
  let nextNumber = 100;

  const server = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : null;
      const offered = (req.headers.authorization ?? '').replace(/^token /, '');
      calls.push({ method: req.method, path: req.url, payload, offered });
      res.setHeader('Content-Type', 'application/json');

      if (!accepts.includes(offered)) {
        res.statusCode = 403;
        return res.end(
          '{"message":"token does not have at least one of required scope(s): [read:issue]"}',
        );
      }

      if (req.method === 'GET' && req.url.startsWith('/issues?')) {
        return res.end(JSON.stringify(issues.filter(i => i.state !== 'closed')));
      }
      if (req.method === 'POST' && req.url === '/issues') {
        const created = { number: (nextNumber += 1), state: 'open', ...payload };
        issues.push(created);
        return res.end(JSON.stringify(created));
      }
      const match = req.url.match(/^\/issues\/(\d+)(\/comments)?$/);
      if (match) {
        const issue = issues.find(i => i.number === Number(match[1]));
        Object.assign(issue, match[2] ? {} : payload);
        return res.end(JSON.stringify(issue));
      }
      res.statusCode = 404;
      res.end('{"message":"no such endpoint"}');
    });
  });

  return { server, calls, issues };
}

function run(report, forge, { env = { TOKEN }, args } = {}) {
  return new Promise((resolve, reject) => {
    const dir = mkdtempSync(join(tmpdir(), 'link-report-'));
    const file = join(dir, 'report.json');
    writeFileSync(file, JSON.stringify({ checkedAt: '2026-09-14T20:00:00.000Z', total: 199, ...report }));

    forge.server.listen(0, '127.0.0.1', () => {
      const { port } = forge.server.address();
      // TOKEN, AUTOMATIC_TOKEN and FORGE_PR_TOKEN are cleared first: this host
      // has a real FORGEJO_TOKEN in the environment and inheriting a stray one
      // would make the test pass for the wrong reason.
      execFile(
        process.execPath,
        [SCRIPT, ...(args ?? [file])],
        {
          env: {
            ...process.env,
            TOKEN: '',
            AUTOMATIC_TOKEN: '',
            FORGE_PR_TOKEN: '',
            API: `http://127.0.0.1:${port}`,
            ...env,
          },
        },
        (error, stdout, stderr) => {
          forge.server.close();
          if (error) reject(Object.assign(new Error(`${error.message}\n${stdout}\n${stderr}`), { stdout, code: error.code }));
          else resolve(stdout);
        },
      );
    });
  });
}

const deadLink = {
  url: 'https://grabcad.com/library/gone-1',
  host: 'grabcad.com',
  status: 404,
  verdict: 'dead',
  pages: ['3d-printing/index.html', 'no/3d-printing/index.html'],
};
const clean = { dead: [], unknown: [], blind: [], systemic: null };

test('a dead link opens an issue carrying the url and the pages linking it', async () => {
  const forge = stubForge();
  const out = await run({ ...clean, dead: [deadLink] }, forge);

  const created = forge.calls.filter(c => c.method === 'POST' && c.path === '/issues');
  assert.equal(created.length, 1, 'exactly one issue');
  assert.match(created[0].payload.body, /grabcad\.com\/library\/gone-1/);
  assert.match(created[0].payload.body, /404/);
  // Without this the report is a puzzle rather than a task.
  assert.match(created[0].payload.body, /3d-printing\/index\.html/);
  assert.match(created[0].payload.body, /no\/3d-printing\/index\.html/);
  assert.match(out, /opened #101/);
});

test('a second run with the same dead link edits, and does not open or comment', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;
  const out = await run({ ...clean, dead: [deadLink] }, forge);

  assert.equal(forge.issues.length, 1, 'no second issue');
  assert.deepEqual(
    forge.calls.filter(c => c.method === 'POST').map(c => c.path),
    [],
    'nothing was posted: no new issue and no comment saying what everyone knows',
  );
  assert.ok(forge.calls.some(c => c.method === 'PATCH'), 'the body is still refreshed');
  assert.match(out, /no comment added/);
});

test('a link that newly dies comments on the issue that is already open', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;

  const second = { ...deadLink, url: 'https://example.test/also-gone', host: 'example.test' };
  await run({ ...clean, dead: [deadLink, second] }, forge);

  const comments = forge.calls.filter(c => c.path.endsWith('/comments'));
  assert.equal(comments.length, 1);
  assert.match(comments[0].payload.body, /Newly dead \(1\)/);
  assert.match(comments[0].payload.body, /example\.test\/also-gone/);
  assert.doesNotMatch(comments[0].payload.body, /gone-1/, 'the unchanged one is not re-announced');
});

test('a clean run closes the issue it opened', async () => {
  const forge = stubForge();
  await run({ ...clean, dead: [deadLink] }, forge);
  forge.calls.length = 0;
  const out = await run(clean, forge);

  const patched = forge.calls.filter(c => c.method === 'PATCH');
  assert.equal(patched.at(-1).payload.state, 'closed');
  assert.equal(forge.issues[0].state, 'closed');
  assert.match(out, /closed #101/);
});

test('a clean run with no issue open does nothing at all', async () => {
  const forge = stubForge();
  const out = await run(clean, forge);

  assert.deepEqual(forge.calls.filter(c => c.method !== 'GET'), []);
  assert.match(out, /no dead links/);
});

test('a run that went blind is reported even with no dead link', async () => {
  // The case the whole ok-rate floor exists for: nothing to list, and that is
  // itself the finding. Reading this run as "all clear" is the bug.
  const forge = stubForge();
  await run({ ...clean, systemic: { ok: 20, total: 199, rate: 20 / 199 } }, forge);

  assert.equal(forge.issues.length, 1);
  assert.match(forge.issues[0].body, /could not get answers/i);
  assert.match(forge.issues[0].body, /report about/);
});

test('the token is never printed, and never reaches the command line', async () => {
  const forge = stubForge();
  const out = await run({ ...clean, dead: [deadLink] }, forge);
  assert.doesNotMatch(out, new RegExp(TOKEN), 'the token reached stdout');
});

test('--probe accepts a credential the forge answers, and writes nothing', async () => {
  const forge = stubForge();
  const out = await run(clean, forge, { args: ['--probe'] });

  assert.match(out, /can read issues: HTTP 200/);
  assert.deepEqual(forge.calls.filter(c => c.method !== 'GET'), [], 'a probe only reads');
});

test('a credential the forge refuses is passed over for one it accepts', async () => {
  // The real shape of this: FORGE_PR_TOKEN resolves, is 40 characters, and is
  // answered 403 "[read:issue]" because it is scoped for pull requests.
  const forge = stubForge([], ['the-one-that-works']);
  const out = await run(clean, forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only', AUTOMATIC_TOKEN: 'the-one-that-works' },
  });

  assert.match(out, /AUTOMATIC_TOKEN \(18 characters\) can read issues: HTTP 200/);
  assert.doesNotMatch(out, /the-one-that-works/, 'the value itself is never printed');
  assert.doesNotMatch(out, /scoped-for-pulls-only/);
});

test('no usable credential stops the run rather than sweeping and staying quiet', async () => {
  const forge = stubForge([], ['nothing-here-matches']);
  const failure = await run(clean, forge, {
    env: { FORGE_PR_TOKEN: 'scoped-for-pulls-only' },
  }).then(
    () => null,
    error => error,
  );

  assert.ok(failure, 'the script must not exit 0 when it cannot reach issues');
  assert.equal(failure.code, 1);
  assert.match(failure.stdout, /would be found and never reported/);
});
