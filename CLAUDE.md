# Polybjorn

Personal portfolio and CV site for Bjørn A. Andersen.

## Rules

- Always update both `en` and `no` when editing content — the site is bilingual (English at `/`, Norwegian at `/no/`)
- Use `npm`, not yarn or bun
- Do not auto-commit — only commit when explicitly asked
- Keep CV skills and software lists alphabetically sorted
- Keep data in `src/data/*.js` — pages import from there
- Prefer editing existing files over creating new ones

## Project structure

```
src/
  layouts/Layout.astro        — shared layout
  pages/                      — English pages (default)
  pages/no/                   — Norwegian pages (mirrors English structure)
  data/cv.js                  — CV content (experience, education, skills, software)
  data/translations.js        — UI strings for both languages
  data/made.js                — gallery data (things I made)
  data/found.js               — gallery data (things I found)
```

## Stack

- Astro 5 (SSG, no framework) with `@astrojs/sitemap`, vanilla CSS (scoped styles inline in each `.astro` file)
- Hosted on GitHub Pages, deployed via GitHub Actions on push
- Cloudflare for DNS only
- Cloudinary for image hosting and transforms — use `cloudinaryUrl()` helper from `made.js`
- Piazzolla typeface via `@fontsource`, icons from `lucide-astro`
- Dev server: `npm run dev` on port 4321

## Privacy

- No ads or third-party tracking
- Analytics via Umami (cookieless)
- Contact info is base64-encoded in client-side JS to reduce scraping — never expose in plain text
