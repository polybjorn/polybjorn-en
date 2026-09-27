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

  if (runModules) runInlineModules(dom.window);
  return dom;
}

/**
 * Runs the page's inline module scripts, which jsdom will not.
 *
 * Astro compiles a component's `<script>` into an inline
 * `<script type="module">`, and jsdom implements no ES modules at all - it
 * parses those and never executes them. A classic inline script still runs, so
 * the enquiry tests, whose 50KB handler is `is:inline`, have always exercised
 * real behaviour; what nothing reached is the component scripts - the article
 * page's lightbox, for one, is never built under jsdom.
 *
 * Eval'ing them as classic scripts is only sound while they carry no import or
 * export, so one that does throws here rather than passing quietly with nothing
 * having run. Each goes in its own function so the modules keep separate
 * scopes: minified, two of them on the same page both declare `var e`, and in
 * a shared global the second would reassign the first's captured variable -
 * a bug the browser does not have.
 */
function runInlineModules(window) {
  const scripts = [...window.document.querySelectorAll('script[type="module"]:not([src])')];
  if (!scripts.length) {
    throw new Error('no inline module scripts on this page, so runModules proves nothing');
  }
  for (const script of scripts) {
    const code = script.textContent;
    if (/\b(?:import|export)\b/.test(code)) {
      throw new Error('an inline module imports or exports, so it cannot run as a classic script');
    }
    window.eval(`(function(){"use strict";\n${code}\n})()`);
  }
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
