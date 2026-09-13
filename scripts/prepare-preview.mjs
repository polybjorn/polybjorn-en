/**
 * Rewrites the hand-written absolute URLs in a build so it survives being
 * served from a subpath, which is how this host's preview server publishes a
 * branch (`site-preview publish <site> <dir>` puts it under
 * `/<site>/<branch>/`).
 *
 * Astro's own `base` handles what Astro emits: the `_astro` bundle and the
 * font URLs inside the compiled CSS. It does not touch a `/favicon.svg` or a
 * `/projects` typed into a component, because it cannot tell those from an
 * external path the site does not own. Those are what this pass prefixes.
 *
 * Preview only. Nothing here runs in `npm run build`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const BASE = process.env.PREVIEW_BASE;

if (!BASE) {
  console.error('prepare-preview: PREVIEW_BASE is not set, so there is nothing to prefix.');
  process.exit(2);
}
if (!BASE.startsWith('/') || !BASE.endsWith('/')) {
  console.error(`prepare-preview: PREVIEW_BASE must start and end with a slash, got ${BASE}`);
  process.exit(2);
}

const prefix = BASE.slice(0, -1); // no trailing slash: paths supply their own

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// A root-absolute URL, but not one already under the base and not a protocol
// relative `//host/path`, which is somebody else's server.
const rewritable = value => value.startsWith('/')
  && !value.startsWith('//')
  && !value.startsWith(BASE)
  && value !== BASE.slice(0, -1);

const ATTRS = /\b(href|src|action|poster|content|data-full)="(\/[^"]*)"/g;
// srcset holds a comma separated list, each entry a URL and an optional width
const SRCSET = /\bsrcset="([^"]*)"/g;

let files = 0;
let rewrites = 0;

for (const file of htmlFiles(DIST)) {
  const before = readFileSync(file, 'utf8');

  let after = before.replace(ATTRS, (whole, attr, value) => {
    // `content` is mostly meta text; only rewrite it when it is a bare path,
    // which is what a redirect or an og:image written by hand looks like.
    if (!rewritable(value)) return whole;
    rewrites++;
    return `${attr}="${prefix}${value}"`;
  });

  after = after.replace(SRCSET, (whole, list) => {
    const parts = list.split(',').map(part => {
      const trimmed = part.trim();
      if (!rewritable(trimmed)) return part;
      rewrites++;
      return ` ${prefix}${trimmed}`;
    });
    return `srcset="${parts.join(',').trim()}"`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    files++;
  }
}

console.log(`prepare-preview: prefixed ${rewrites} absolute URLs across ${files} files with ${prefix}`);
