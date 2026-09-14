// Checks every external link in the built site and writes a JSON verdict file.
//
// Usage: node check-external-links.mjs [--dist dist] [--out link-report.json]
//        [--only host] [--limit n]
//
// Run by external-links.yml on a schedule. It is deliberately not a test and
// not a merge gate: it asks a question about the world rather than about the
// diff, and a third party being down for an hour must not stop a merge.
// `tests/internal-links.test.mjs` is the half of this that does gate, because
// the file tree can answer it offline.
//
// **Three verdicts, not two.** A checker that only knows ok and dead reports a
// bot wall as a broken link, and a red tick with nothing behind it is worse
// than no check: it teaches you to skim past the one that matters. So anything
// that is not plainly alive and not plainly gone is `unknown`, and unknown
// never reaches the report as a dead link.
//
// Measured on this site's own links, 2026-09-14, which is where those rules
// come from rather than from a general principle:
//
//   - grabcad.com answers 403 to curl's default user agent, HEAD and GET
//     alike, and 200/404 correctly to a browser one. All 54 of its links are
//     gallery pages, so without USER_AGENT below this check would open an
//     issue listing every one of them on its first run.
//   - facebook.com answers 400 to both methods whatever it is asked, so its
//     one link can never be confirmed either way. That is what `unknown` is
//     for; it is not a defect to be fixed by trying harder.
//   - res.cloudinary.com answers HEAD honestly - 200 for a real asset, 404 for
//     a missing one - which is the case that makes checking worthwhile at all.
//
// **Own hostnames are skipped.** 40 of the absolute URLs in the built site
// point at polybjorn.com and polybjorn.no, which internal-links.test.mjs
// already covers in relative form. Checking them again spends the budget
// re-asking an answered question and makes the run depend on the live site
// being up to say anything about the repo.
//
// There is no cross-run cache. At a weekly cadence anything worth caching has
// expired by the next run, and it would put state on the runner to go stale.
// Deduplicating URLs within a run is where the saving actually is: the raw
// href/src count is 521 and the distinct external set is about 200.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Ours, and covered relatively by the internal test. Subdomains included.
export const OWN_HOSTS = ['polybjorn.com', 'polybjorn.no'];

// Serial per host with a gap between requests. 54 links to grabcad and 121 to
// cloudinary hit as fast as the event loop allows is a rate limit answered with
// 429, which is indistinguishable from a dead link from out here. Hosts run
// concurrently with each other, so the run takes as long as its slowest host
// rather than the sum: about two minutes.
export const DEFAULT_INTERVAL_MS = 1000;
export const HOST_INTERVAL_MS = {
  // A gallery site with no interest in being crawled. Slowest of the three.
  'grabcad.com': 2000,
  // A CDN, built to be fetched from; the interval is politeness, not need.
  'res.cloudinary.com': 400,
};

// A browser string, and the one load-bearing constant in this file. See the
// grabcad measurement above: without it the check reports 54 live links dead.
// Claiming to be Chrome to read a public page is what every link checker does,
// but it is a claim, so it is written here where it can be found rather than
// buried in a fetch call.
export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/140.0.0.0 Safari/537.36';

const TIMEOUT_MS = 20000;

/** Hosts that refuse HEAD specifically are worth a second ask with GET. */
const RETRY_WITH_GET = new Set([400, 403, 405, 406, 501]);

export const isOwnHost = host =>
  OWN_HOSTS.some(own => host === own || host.endsWith(`.${own}`));

export const intervalFor = host => HOST_INTERVAL_MS[host] ?? DEFAULT_INTERVAL_MS;

/**
 * What an outcome means. `outcome` is `{ status }` from a response or
 * `{ errorCode }` from a failed request.
 *
 * Only two things count as dead: the server said the thing is not there, or
 * the hostname does not resolve. Everything else - 403, 429, a 500, a timeout,
 * a connection reset - is the check failing to get an answer, not an answer.
 */
export function classify({ status, errorCode }) {
  if (status !== undefined) {
    if (status >= 200 && status < 400) return 'ok';
    if (status === 404 || status === 410) return 'dead';
    return 'unknown';
  }
  // NXDOMAIN. A domain that does not resolve is the most definitive dead link
  // there is - it is how heyform.net was found to be gone in #2 - but a runner
  // with a sick resolver looks identical, so this verdict is only reached
  // after the retry below has failed too.
  if (errorCode === 'ENOTFOUND') return 'dead';
  return 'unknown';
}

/** Every .html file under dist, the same set internal-links.test.mjs walks. */
function builtPages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return builtPages(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

/**
 * Every external URL in the built site, mapped to the pages that link it.
 *
 * The page list is the point: a report saying `grabcad.com/library/x is 404`
 * is a puzzle, and one that also says which page carries it is a task. The
 * fragment is dropped because no server is asked about it - signal.me/#eu/...
 * is checked as signal.me, which is all that can be checked from here.
 */
export function extractLinks(dist) {
  const links = new Map();

  for (const file of builtPages(dist)) {
    const page = relative(dist, file);
    for (const [, raw] of readFileSync(file, 'utf8').matchAll(/(?:href|src)="([^"]+)"/g)) {
      const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
      if (!/^https?:\/\//i.test(absolute)) continue;

      let url;
      try {
        url = new URL(absolute);
      } catch {
        continue; // Not addressable, so not checkable. The build made it; leave it.
      }
      if (isOwnHost(url.hostname)) continue;

      url.hash = '';
      const key = url.toString();
      if (!links.has(key)) links.set(key, { host: url.hostname, pages: new Set() });
      links.get(key).pages.add(page);
    }
  }

  return links;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const MAX_REDIRECTS = 10;

/**
 * One request, following redirects by hand so that cookies survive them.
 *
 * Node's fetch has no cookie jar, and `redirect: 'follow'` therefore replays
 * the same cookie-setting redirect until it gives up. nosted.com does exactly
 * that: it answers 302 to `/` with `set-cookie: BrowserLanguage=en`, so a
 * client that forgets the cookie is sent back to `/` forever. Measured
 * 2026-09-14 - fifty hops and still going without a jar, 200 after one hop
 * with one. A reader with a browser never sees a problem, so a checker that
 * reports that link is reporting on its own missing feature.
 *
 * The jar is per request and thrown away after, which is the point: it exists
 * to get through a redirect chain, not to hold a session.
 */
async function request(url, method) {
  const jar = new Map();
  let current = url;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const headers = { 'User-Agent': USER_AGENT, Accept: '*/*' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

      const res = await fetch(current, {
        method,
        redirect: 'manual',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // Never read, but an unconsumed body holds the socket open and the next
      // request in this host's queue waits behind it.
      if (res.body) await res.body.cancel().catch(() => {});

      for (const cookie of res.headers.getSetCookie?.() ?? []) {
        const [pair] = cookie.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }

      return { status: res.status };
    }
    // A loop that a cookie jar could not break. Not a 404, and not something
    // trying harder will fix, so it stays unknown rather than being called
    // dead - but it is printed, so a real loop is visible in the run log.
    return { errorCode: 'ERR_TOO_MANY_REDIRECTS' };
  } catch (error) {
    return { errorCode: describeError(error) };
  }
}

/**
 * `fetch` reports nearly everything as `TypeError: fetch failed` and puts the
 * real reason in `cause`, so the name alone makes a log line that says only
 * that something went wrong.
 */
function describeError(error) {
  return (
    error?.cause?.code ??
    error?.code ??
    error?.cause?.message ??
    error?.name ??
    'unknown'
  );
}

/**
 * One URL, up to four requests: HEAD, GET if the status looks like the method
 * was the problem, then the same pair again after a pause if the verdict is
 * still unknown. The second round is what keeps a single 429 or a dropped
 * connection out of the report.
 */
async function check(url) {
  for (const attempt of [0, 1]) {
    if (attempt) await sleep(5000);

    let outcome = await request(url, 'HEAD');
    if (outcome.status !== undefined && RETRY_WITH_GET.has(outcome.status)) {
      outcome = await request(url, 'GET');
    }

    const verdict = classify(outcome);
    if (verdict !== 'unknown') return { verdict, ...outcome };
    if (attempt) return { verdict, ...outcome };
  }
}

// Below this share of links answering, the check is not reporting on the site
// any more, it is reporting on itself. A dead link or two never moves it; a
// blocked user agent, a resolver that stopped resolving or a runner with no
// egress moves it to the floor at once.
export const OK_RATE_FLOOR = 0.8;

/**
 * Whether the run as a whole failed to get answers.
 *
 * The per-host rule below catches one site turning us away. This catches the
 * case that has no host - the sweep itself going blind - and it is the same
 * problem #73 raises about the branch sweep: a check that has quietly stopped
 * working looks exactly like a check with nothing to report. A run where 190
 * of 199 links time out must not read as "no dead links found".
 *
 * Only meaningful over a reasonable number of links, so a `--only` or
 * `--limit` run that checks four of them is never called systemic.
 */
export function systemicFailure(results) {
  if (results.length < 20) return null;
  const ok = results.filter(r => r.verdict === 'ok').length;
  const rate = ok / results.length;
  return rate < OK_RATE_FLOOR ? { ok, total: results.length, rate } : null;
}

/**
 * Hosts where nothing could be confirmed either way.
 *
 * This is the liveness half, and it is the same problem #73 raises about the
 * branch sweep: a check that has quietly stopped being able to answer looks
 * exactly like a check with nothing to report. If grabcad starts refusing the
 * browser user agent too, every one of its links turns unknown at once and
 * silently drops out of the report - so that case is itself reportable.
 *
 * One unknown is a timeout. A whole host is the check going blind, and the
 * threshold is two so that facebook.com's single permanently-400 link does not
 * open an issue every week for something nobody can fix.
 */
export function blindHosts(results) {
  const byHost = new Map();
  for (const result of results) {
    if (!byHost.has(result.host)) byHost.set(result.host, []);
    byHost.get(result.host).push(result);
  }

  return [...byHost]
    .filter(([, rows]) => rows.length >= 2 && rows.every(r => r.verdict === 'unknown'))
    .map(([host, rows]) => ({
      host,
      links: rows.length,
      sample: rows[0].status ? `HTTP ${rows[0].status}` : rows[0].errorCode,
    }));
}

async function checkHost(host, entries, onDone) {
  const results = [];
  const gap = intervalFor(host);

  for (const [index, [url, { pages }]] of entries.entries()) {
    if (index) await sleep(gap);
    const outcome = await check(url);
    results.push({ url, host, pages: [...pages].sort(), ...outcome });
    onDone(results.at(-1));
  }

  return results;
}

function parseArgs(argv) {
  const args = { dist: 'dist', out: 'link-report.json', only: null, limit: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in args)) throw new Error(`unknown argument: ${argv[i]}`);
    args[key] = key === 'limit' ? Number(argv[i + 1]) : argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const links = extractLinks(args.dist);

  const byHost = new Map();
  for (const [url, entry] of links) {
    if (args.only && entry.host !== args.only) continue;
    if (!byHost.has(entry.host)) byHost.set(entry.host, []);
    byHost.get(entry.host).push([url, entry]);
  }
  if (args.limit) {
    for (const [host, entries] of byHost) byHost.set(host, entries.slice(0, args.limit));
  }

  const total = [...byHost.values()].reduce((n, e) => n + e.length, 0);
  console.log(`${total} external links across ${byHost.size} hosts`);
  for (const [host, entries] of [...byHost].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(entries.length).padStart(4)}  ${host}  (${intervalFor(host)}ms apart)`);
  }
  console.log('');

  const started = Date.now();
  let done = 0;
  const report = row => {
    done += 1;
    // Only the interesting ones, or a weekly log is 200 lines of "ok".
    if (row.verdict !== 'ok') {
      const why = row.status ? `HTTP ${row.status}` : row.errorCode;
      console.log(`  ${row.verdict.padEnd(7)} ${why.padEnd(12)} ${row.url}`);
    }
  };

  const results = (
    await Promise.all([...byHost].map(([host, entries]) => checkHost(host, entries, report)))
  ).flat();

  const dead = results.filter(r => r.verdict === 'dead');
  const unknown = results.filter(r => r.verdict === 'unknown');
  const blind = blindHosts(results);
  const systemic = systemicFailure(results);

  console.log('');
  console.log(`checked ${done} in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(`  ok       ${results.length - dead.length - unknown.length}`);
  console.log(`  dead     ${dead.length}`);
  console.log(`  unknown  ${unknown.length}`);
  for (const b of blind) console.log(`  blind    ${b.host} - all ${b.links} links unknown (${b.sample})`);
  if (systemic) {
    console.log(
      `  BLIND    only ${systemic.ok} of ${systemic.total} links answered ` +
        `(${Math.round(systemic.rate * 100)}%, floor is ${OK_RATE_FLOOR * 100}%) - ` +
        'treat this run as a report about the checker, not about the site',
    );
  }

  writeFileSync(
    args.out,
    `${JSON.stringify(
        { checkedAt: new Date().toISOString(), total: done, dead, unknown, blind, systemic },
        null,
        2,
      )}\n`,
  );
  console.log(`\nwrote ${args.out}`);
}

// Importable for the tests without running a two minute network sweep.
if (process.argv[1]?.endsWith('check-external-links.mjs')) await main();
