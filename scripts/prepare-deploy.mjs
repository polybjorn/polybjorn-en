import { cpSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const DIST = 'dist';
const DIST_NO = 'dist-no';
const NO_DOMAIN = 'https://polybjorn.no';

function getHtmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getHtmlFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

// 1. Create dist-no/ from dist/no/ contents
rmSync(DIST_NO, { recursive: true, force: true });
mkdirSync(DIST_NO, { recursive: true });
cpSync(join(DIST, 'no'), DIST_NO, { recursive: true });

// Copy shared static assets (favicon, fonts, manifest, etc.)
for (const entry of readdirSync(DIST, { withFileTypes: true })) {
  if (entry.name === 'no') continue;
  if (entry.isDirectory() && entry.name.startsWith('_')) {
    cpSync(join(DIST, entry.name), join(DIST_NO, entry.name), { recursive: true });
  } else if (!entry.isDirectory() && !entry.name.endsWith('.html')) {
    cpSync(join(DIST, entry.name), join(DIST_NO, entry.name));
  }
}

// 2. Fix internal links in NO HTML files: /no/ → /
for (const file of getHtmlFiles(DIST_NO)) {
  let html = readFileSync(file, 'utf8');
  html = html.replaceAll('href="/no/', 'href="/');
  html = html.replaceAll('href="/no"', 'href="/"');
  html = html.replaceAll('url=/no/', 'url=/');
  writeFileSync(file, html);
}

// 3. Fix sitemaps
// EN sitemap: remove /no/ entries (they're now redirects)
const enSitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
writeFileSync(join(DIST, 'sitemap-0.xml'),
  enSitemap.replace(/<url><loc>https:\/\/polybjorn\.com\/no\/[^<]*<\/loc><\/url>/g, '')
);

// NO sitemap: rewrite with polybjorn.no domain and root paths
const noEntries = [...enSitemap.matchAll(/<url><loc>https:\/\/polybjorn\.com\/no\/([^<]*)<\/loc><\/url>/g)];
const noSitemapUrls = [];
for (const [, path] of noEntries) {
  noSitemapUrls.push(`<url><loc>${NO_DOMAIN}/${path}</loc></url>`);
}
writeFileSync(join(DIST_NO, 'sitemap-0.xml'),
  enSitemap.replace(/<url>.*<\/url>/g, '').replace('</urlset>', noSitemapUrls.join('') + '</urlset>')
);
writeFileSync(join(DIST_NO, 'sitemap-index.xml'),
  readFileSync(join(DIST_NO, 'sitemap-index.xml'), 'utf8')
    .replaceAll('https://polybjorn.com', NO_DOMAIN)
);

// Fix NO robots.txt
writeFileSync(join(DIST_NO, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${NO_DOMAIN}/sitemap-index.xml\n`
);

// 4. Add CNAME, README and LICENSE for polybjorn.no
writeFileSync(join(DIST_NO, 'CNAME'), 'polybjorn.no\n');
writeFileSync(join(DIST_NO, 'README.md'), `# polybjorn.no

Deploy target for [polybjorn.no](https://polybjorn.no), the Norwegian build of [polybjorn.com](https://polybjorn.com). Source and history live in [polybjorn/polybjorn-en](https://github.com/polybjorn/polybjorn-en).
`);
cpSync('LICENSE', join(DIST_NO, 'LICENSE'));

// 4. Replace dist/no/ with redirect stubs
const noPages = getHtmlFiles(join(DIST, 'no'));
rmSync(join(DIST, 'no'), { recursive: true, force: true });

for (const file of noPages) {
  const rel = relative(join(DIST, 'no'), file);
  const targetPath = '/' + rel.replace(/\/index\.html$/, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const redirectUrl = `${NO_DOMAIN}${targetPath === '/' ? '' : targetPath}`;
  const dir = join(DIST, 'no', rel, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(DIST, 'no', rel),
    `<!DOCTYPE html>\n<html>\n<head>\n<meta http-equiv="refresh" content="0;url=${redirectUrl}">\n<link rel="canonical" href="${redirectUrl}">\n</head>\n</html>\n`
  );
}

console.log('Prepared dist/ (EN) and dist-no/ (NO) for deployment.');
