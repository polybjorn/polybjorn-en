# Polybjorn

Personal portfolio and CV site for Bjørn Andreas Andersen.

## Rules

- Always update both `en` and `no` when editing content. The site is bilingual (English at polybjorn.com, Norwegian at polybjorn.no)
- Both languages live in this repo. The Norwegian build is deployed to `polybjorn/polybjorn-no` via GitHub Actions
- Use `npm`, not yarn or bun
- Do not auto-commit, only commit when explicitly asked
- Keep CV skills and software lists alphabetically sorted
- Keep data in `src/data/`. Pages import from there
- CV data lives in `src/data/cv.yaml` (single source of truth for both web and PDF)
- Prefer editing existing files over creating new ones

## Project structure

```
src/
  layouts/Layout.astro        : shared layout
  pages/                      : English pages (polybjorn.com)
  pages/no/                   : Norwegian pages (polybjorn.no)
  data/cv.yaml                : CV content (single source for web + PDF)
  data/contact.yaml           : contact info (phone, email, address)
  data/cv.js                  : thin re-export of cv.yaml for Astro imports
  data/translations.js        : UI strings for both languages
  data/made.js                : gallery data (things I made)
  data/found.js               : gallery data (things I found)
cv/
  template.typ                : Typst CV template (reads cv.yaml + contact.yaml)
  build.sh                    : builds both PDFs, copies to ~/Vault/Assets/Brand/CV/
  fonts/                      : Liberation Sans (bundled, cross-platform)
  images/                     : profile photo for CV
  output/                     : generated PDFs (gitignored)
scripts/
  prepare-deploy.mjs          : splits build output for two-repo deploy
```

## Stack

- Astro 5 (SSG, no framework) with `@astrojs/sitemap`, `@rollup/plugin-yaml`, vanilla CSS (scoped styles inline in each `.astro` file)
- Typst for CV PDF generation. `sh cv/build.sh` generates both languages from `src/data/cv.yaml`
- Hosted on GitHub Pages, deployed via GitHub Actions on push
- English site deploys to this repo's Pages, Norwegian site deploys to `polybjorn/polybjorn-no`
- Cloudflare for DNS (proxied), both polybjorn.com and polybjorn.no
- Cloudinary for image hosting and transforms. Use `cloudinaryUrl()` helper from `made.js`
- `rough-notation` for hand-drawn underline effects on CV section headings (accent blue `#6AAEEE`, stroke width 2, 800ms animation, triggered on scroll)
- Piazzolla typeface via `@fontsource`, icons from `lucide-astro`
- Dev server: `npm run dev` on port 4321

## Internationalization

- English pages at `src/pages/`, Norwegian at `src/pages/no/`
- Translations in `src/data/translations.js`. Access via `t[lang].keyName`
- Data files (`cv.yaml`, `made.js`, `found.js`) use `{ en: ..., no: ... }` keys for bilingual content
- Language toggle saves preference to `localStorage`
- Layout.astro sets `hreflang` alternates and canonical URLs automatically

## Deployment

- `npm run build:deploy` runs Astro build then `scripts/prepare-deploy.mjs`
- The prepare script splits `/dist` into English (`/dist`) and Norwegian (`/dist-no`)
- Norwegian HTML gets internal links rewritten (`/no/` → `/`)
- Sitemaps are filtered per language and rewritten to the correct domain
- GitHub Actions deploys English natively, Norwegian via SSH deploy key (`NO_DEPLOY_KEY` secret) to `polybjorn/polybjorn-no`
- Gallery pages are excluded from sitemaps and set to `noindex`

## Cloudinary

- All images hosted on Cloudinary (account `djpkffk5u`)
- `cloudinaryUrl(url, { width, quality })` helper inserts transforms (`w_`, `f_auto`, `q_auto`)
- Gallery images use `loading="lazy"`, homepage preloads avatar
- Gallery data distinguishes `type: "render"` (transparent) vs `type: "photo"` (opaque background)
- Gallery uses seeded shuffle (seed 42) for deterministic "random" order per build

## CSS conventions

- All styles scoped inline in `.astro` files, no separate CSS files
- Global reset: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`
- `scrollbar-gutter: stable` on `html` to prevent layout shift
- Responsive breakpoints: `768px` (primary), `700px` (gallery/CV), `480px` (small), `400px` (single column)
- Transitions: `0.2s` (hover), `0.3s` (controls/nav), `0.6s ease` (gallery reveal)
- External links: always `target="_blank" rel="noopener"`

## Accessibility

- Skip link in Layout.astro, hidden, appears on keyboard focus, jumps to `#main`
- `.sr-only` class for screen-reader-only elements (gallery h1 headings)
- ARIA labels on navigation buttons and gallery links
- CV print styles: white background, visible link URLs via `a[href]::after`, `break-inside: avoid`

## CV generation

- CV data in `src/data/cv.yaml` is the single source of truth for both the website and PDF output
- Astro imports it via `src/data/cv.js` (one-line re-export using `@rollup/plugin-yaml`)
- Typst template at `cv/template.typ` reads the same YAML directly
- `sh cv/build.sh` generates `cv/output/cv-en.pdf` and `cv/output/cv-no.pdf`, copies to `~/Vault/Assets/Brand/CV/`
- `cv/output/` is gitignored
- Requires `typst` (`brew install typst`)
- Font: Liberation Sans bundled in `cv/fonts/`, cross-platform, no system font dependency
- Build: `typst compile cv/template.typ cv/output/cv-en.pdf --input lang=en --font-path cv/fonts --root .`
- Live preview: `typst watch cv/template.typ cv/output/cv-en.pdf --input lang=en --font-path cv/fonts --root .`
- CI: `.github/workflows/cv.yml` builds on push to CV files or manual dispatch, uploads PDFs as artifacts (90-day retention)
- Profile photo: `cv/images/profile-photo.png`

### CV template architecture

- 2-page layout: page 1 (header + profile, education + skills, experience, certifications), page 2 (software skills, client list)
- Page 1 sections use `== heading` (h2), page 2 titles are manually centered `align(center, text(...))`
- `cv_tools` key in YAML categories overrides `tools` for PDF. Keeps full list on website, curated list on CV
- `cv: false` on a YAML category hides it entirely from the PDF (Operating Systems, Privacy & Security, AI Tools)
- `cv: false` on individual skills hides them from the skills list
- Software boxes have 18x18pt grey placeholder squares. Replace with real icons when ready
- Client list sorted alphabetically, rendered row-first across 3 centered columns
- Colors follow brand guide Print (CV) palette: `#111111` body, `#222222` secondary, `#8A8F99` muted

## Brand assets

- `assets/` symlink in repo root points to `~/Vault/Assets/Brand` (gitignored)
- Brand guidelines: `assets/Brand guide/brand-guide.md`
- Template specs: `assets/Brand guide/template-specs.md`
- Favicons in `assets/Favicon/`: SVG + PNG (96, 32) + ICO (48) + apple-touch-icon
- Logo source files are Affinity Designer (`.af`)

## Privacy

- No ads or third-party tracking
- Analytics via Umami (cookieless)
- Contact info is base64-encoded in client-side JS (`atob()`) to reduce scraping. Never expose in plain text
- Only `localStorage` usage is language preference, no other persistence or tracking
