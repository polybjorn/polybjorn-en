# Polybjorn

Personal portfolio and CV site for Bjørn Andreas Andersen.

## Rules

- Always update both `en` and `no` when editing content — the site is bilingual (English at polybjorn.com, Norwegian at polybjorn.no)
- Both languages live in this repo — the Norwegian build is deployed to `polybjorn/polybjorn-no` via GitHub Actions
- Use `npm`, not yarn or bun
- Do not auto-commit — only commit when explicitly asked
- Keep CV skills and software lists alphabetically sorted
- Keep data in `src/data/*.js` — pages import from there
- Prefer editing existing files over creating new ones

## Project structure

```
src/
  layouts/Layout.astro        — shared layout
  pages/                      — English pages (polybjorn.com)
  pages/no/                   — Norwegian pages (polybjorn.no)
  data/cv.js                  — CV content (experience, education, skills, software)
  data/translations.js        — UI strings for both languages
  data/made.js                — gallery data (things I made)
  data/found.js               — gallery data (things I found)
scripts/
  prepare-deploy.mjs          — splits build output for two-repo deploy
```

## Stack

- Astro 5 (SSG, no framework) with `@astrojs/sitemap`, vanilla CSS (scoped styles inline in each `.astro` file)
- Hosted on GitHub Pages, deployed via GitHub Actions on push
- English site deploys to this repo's Pages, Norwegian site deploys to `polybjorn/polybjorn-no`
- Cloudflare for DNS (proxied) — both polybjorn.com and polybjorn.no
- Cloudinary for image hosting and transforms — use `cloudinaryUrl()` helper from `made.js`
- `rough-notation` for hand-drawn underline effects on CV section headings
- Piazzolla typeface via `@fontsource`, icons from `lucide-astro`
- Dev server: `npm run dev` on port 4321

## Brand assets

- `assets/` symlink in repo root points to `~/Vault/Assets/Brand` (gitignored)
- Brand guidelines: `assets/brand-guide.md`
- Favicons in `assets/Favicon/`
- Logo source files are Affinity Designer (`.af`)

## Privacy

- No ads or third-party tracking
- Analytics via Umami (cookieless)
- Contact info is base64-encoded in client-side JS to reduce scraping — never expose in plain text
