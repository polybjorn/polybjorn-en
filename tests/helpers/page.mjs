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
 * @param {{ styles?: boolean }} options styles:true inlines the linked
 *   stylesheets, which jsdom will not fetch on its own. Only the tests that ask
 *   the cascade a question need it; it roughly triples the parse.
 */
export function loadPage(page, { styles = false } = {}) {
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
    url: 'https://polybjorn.no/3d-printing/enquiry',
    beforeParse(window) {
      // Three things the page uses that jsdom does not implement. Without them
      // the component's script throws on load and every test fails for the
      // wrong reason.
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.Element.prototype.scrollIntoView = function () {};
      window.HTMLFormElement.prototype.reportValidity = function () { return this.checkValidity(); };
    },
  });

  return dom;
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
