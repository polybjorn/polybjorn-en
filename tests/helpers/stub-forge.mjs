/**
 * A forge that holds one list of issues, remembers every call, and refuses any
 * credential it was not told about - which is what FORGE_PR_TOKEN does in
 * reality, with a 403 naming the scope it lacks.
 *
 * Shared by the two jobs that keep an issue in step with a check's findings
 * (dead external links, and branches the sweep failed to delete). They keep
 * one issue by a marker, edit it in place, close it when the trouble is over
 * and comment only when the set changes - so a stub of the forge copied per
 * test file is a stub that drifts, and the second copy is where the drift
 * would hide.
 */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';

export const STUB_TOKEN = 'stub-token-never-printed';

export function stubForge(issues = [], accepts = [STUB_TOKEN]) {
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

/**
 * Runs a reporter script against the stub, with API pointing at it.
 *
 * TOKEN, AUTOMATIC_TOKEN and FORGE_PR_TOKEN are cleared first: this host has a
 * real FORGEJO_TOKEN in the environment and inheriting a stray one would make
 * a test pass for the wrong reason.
 */
export function runAgainstForge(script, args, forge, env = { TOKEN: STUB_TOKEN }) {
  return new Promise((resolve, reject) => {
    forge.server.listen(0, '127.0.0.1', () => {
      const { port } = forge.server.address();
      execFile(
        process.execPath,
        [script, ...args],
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
          if (error) {
            reject(Object.assign(new Error(`${error.message}\n${stdout}\n${stderr}`), { stdout, code: error.code }));
          } else {
            resolve(stdout);
          }
        },
      );
    });
  });
}
