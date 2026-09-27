/**
 * Loads a built page into jsdom and runs its real inline script.
 *
 * These tests run against `dist`, not against the source, because what is being
 * checked is the page a visitor gets: Astro's scoping, its bundling and its
 * minifier all sit between the component and the browser, and at least one bug
 * has lived entirely in that gap - CSS that read correctly in the component and
 * compiled to a selector matching nothing on the page.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');

export const PAGES = [
  { path: '3d-printing/enquiry/index.html', lang: 'en' },
  { path: 'no/3d-printing/enquiry/index.html', lang: 'no' },
];

/**
 * @param {string} page path under dist
 * @param {{ styles?: boolean, url?: string, referrer?: string, runModules?: boolean }} options
 *   styles:true inlines the linked stylesheets, which jsdom will not fetch on
 *   its own. Only the tests that ask the cascade a question need it; it roughly
 *   triples the parse. url and referrer set what the page thinks it was served
 *   from and navigated from, which is how a test reaches behaviour that branches
 *   on either. runModules is described below.
 */
export function loadPage(page, {
  styles = false,
  url = 'https://polybjorn.no/3d-printing/enquiry',
  referrer,
  runModules = false,
} = {}) {
  const file = join(DIST, page);
  if (!existsSync(file)) {
    throw new Error(`${page} is not built. Run \`npm run build\` first (npm test does).`);
  }

  let html = readFileSync(file, 'utf8');
  if (styles) {
    html = html.replace(
      /<link rel="stylesheet" href="([^"]+)">/g,
      (_, href) => `<style>${readFileSync(join(DIST, href), 'utf8')}</style>`,
    );
  }

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    // jsdom validates this as a URL and throws on an empty string, while a
    // browser reports document.referrer as "" when there is none - so the two
    // ways a test can say "no referrer" both have to land on omitting it.
    referrer: referrer || undefined,
    beforeParse(window) {
      // Three things the page uses that jsdom does not implement. Without them
      // the component's script throws on load and every test fails for the
      // wrong reason.
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.Element.prototype.scrollIntoView = function () {};
      window.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
    },
  });

  if (runModules) runPageModules(dom.window);
  return dom;
}

/**
 * Runs the page's own module scripts, which jsdom will not.
 *
 * Astro compiles a component's `<script>` into an inline
 * `<script type="module">`, and jsdom implements no ES modules at all - it
 * parses those and never executes them. A classic inline script still runs, so
 * the enquiry tests, whose 50KB handler is `is:inline`, have always exercised
 * real behaviour.
 *
 * For the component scripts, tests/article-corner-link.test.mjs got there first:
 * it finds the one script it cares about and evals it by hand. This is that
 * trick made shared, with the guard a hand-rolled copy tends not to carry:
 * separate scopes. That test keeps its own
 * version deliberately: it asserts the corner is still driven by an inline
 * script, which running every module would not tell it.
 *
 * Each goes in its own function so the modules keep separate scopes: minified,
 * two of them on the same page both declare `var e`, and in a shared global the
 * second would reassign the first's captured variable - a bug the browser does
 * not have.
 *
 * A page's script is sometimes inline and sometimes a file: Astro inlines a
 * hoisted script while it stays under about 4KB and emits it to /_astro
 * once it grows past that. This used to read the inline ones only, so on
 * 2026-09-27 an edit that pushed the article's script to 4,625 bytes moved it
 * out of the page and three back-link tests failed with nothing wrong in the
 * code they cover. Both spellings are the page's own script, so both run.
 *
 * A script that imports is linked by hand, in runModule below. That used to
 * throw, on the reasoning that eval'ing a module as a classic script is only
 * sound while it has no imports. True, and the throw still guards the forms the
 * linking does not cover - but as a blanket refusal it turned a second page
 * using a dependency into a failing suite. The CV page had rough-notation to
 * itself and Rollup inlined it; the day the article's chart imported it too, the
 * library became a chunk both pages import, and five tests failed with nothing
 * wrong in the code they cover.
 */
function runPageModules(window) {
  const scripts = [...window.document.querySelectorAll('script[type="module"]')]
    .filter(script => {
      const src = script.getAttribute('src');
      return !src || src.startsWith('/');   // local build output, not a CDN
    });
  if (!scripts.length) {
    throw new Error('no module scripts on this page, so runModules proves nothing');
  }
  const linked = new Map();
  for (const script of scripts) {
    const src = script.getAttribute('src');
    const code = src ? readFileSync(join(DIST, src), 'utf8') : script.textContent;
    runModule(window, linked, src ? src.replace(/^\//, '') : 'index.html', code);
  }
}

/**
 * Evaluates one module, having first evaluated whatever it imports.
 *
 * Only the shapes Rollup emits are understood, and only for a file inside dist:
 * an import of anything else throws rather than running with a binding quietly
 * missing. Each import becomes a destructure off the dependency's exports and
 * the `export {}` at the end becomes assignments onto this module's, which is
 * enough for a bundle's own chunks - they carry no cycles, and nothing in them
 * reassigns an exported binding after the fact, which is the case a real live
 * binding would be needed for.
 */
function runModule(window, linked, path, code) {
  if (linked.has(path)) return linked.get(path);
  const exports = {};
  linked.set(path, exports);

  const need = (spec) => {
    const dep = spec.startsWith('/') ? spec.slice(1)
      : spec.startsWith('.') ? join(dirname(path), spec)
      : null;
    if (!dep || !existsSync(join(DIST, dep))) {
      throw new Error(`${path} imports "${spec}", which is not a file in dist`);
    }
    return runModule(window, linked, dep, readFileSync(join(DIST, dep), 'utf8'));
  };

  const source = code
    .replace(/\bimport\s*\{([^}]*)\}\s*from\s*(["'])(.+?)\2;?/g,
      (_, names, __, spec) => `const {${names.replace(/\s+as\s+/g, ':')}} = __need(${JSON.stringify(spec)});`)
    .replace(/\bimport\s*\*\s*as\s+(\w+)\s*from\s*(["'])(.+?)\2;?/g,
      (_, name, __, spec) => `const ${name} = __need(${JSON.stringify(spec)});`)
    .replace(/\bimport\s+(\w+)\s*from\s*(["'])(.+?)\2;?/g,
      (_, name, __, spec) => `const ${name} = __need(${JSON.stringify(spec)}).default;`)
    .replace(/\bimport\s*(["'])(.+?)\1;?/g,
      (_, __, spec) => `__need(${JSON.stringify(spec)});`)
    .replace(/\bexport\s*\{([^}]*)\};?/g, (_, names) => {
      const pairs = names.split(',').filter(one => one.trim()).map((one) => {
        const [local, named = local] = one.trim().split(/\s+as\s+/);
        return `${JSON.stringify(named)}: ${local}`;
      });
      return `Object.assign(__exports, {${pairs.join(',')}});`;
    })
    .replace(/\bexport\s+default\s/g, '__exports.default = ');

  // Whatever the rewrites did not reach. A module form nobody has needed yet
  // has to fail loudly: linked by halves it would run with a binding missing,
  // and the test would read that as the behaviour being gone.
  if (/\bimport\s*[{*"'(]|\bexport\s*[{*]|\bexport\s+(?:default|const|let|var|function|class)\b/.test(source)) {
    throw new Error(`${path} carries a module form the harness cannot link by hand`);
  }
  window.eval(`(function(__need, __exports){"use strict";\n${source}\n})`)(need, exports);
  return exports;
}

/** Lets the page's own handlers and any awaited fetch settle. */
export const settle = window => new Promise(resolve => window.setTimeout(resolve, 20));

export const stubFetch = (window, response) => {
  const calls = [];
  window.fetch = async (url, init) => {
    calls.push({ url, init });
    if (typeof response === 'function') return response(url, init);
    return response;
  };
  return calls;
};

export const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
