# polybjorn.com

Personal portfolio and contact point.

- [polybjorn.com](https://polybjorn.com) - English
- [polybjorn.no](https://polybjorn.no) - Norwegian (deploys to [polybjorn/polybjorn-no](https://github.com/polybjorn/polybjorn-no))

## Stack

- [Astro](https://astro.build) - static site generator
- [Cloudflare](https://cloudflare.com) - DNS
- [Cloudinary](https://cloudinary.com) - image hosting and transforms
- [GitHub Pages](https://pages.github.com) - hosting
- [GitHub Actions](https://github.com/features/actions) - deployment on push
- [IndexNow](https://indexnow.org) - instant search engine notification on deploy
- [Umami](https://umami.is) - cookieless, privacy-friendly analytics

## Assets

- [flag-icons](https://flagicons.lipis.dev) - flags
- [Icons8](https://icons8.com) - icons
- [Lucide](https://lucide.dev) - icons
- [Piazzolla](https://fontsource.org/fonts/piazzolla) - typeface
- [rough-notation](https://roughnotation.com) - hand-drawn underline animations

## Structure

```
src/
  layouts/Layout.astro      - shared layout
  pages/                    - English pages
  pages/no/                 - Norwegian pages
  data/cv.yaml              - CV content (single source of truth)
  data/cv.js                - re-exports YAML for Astro imports
  data/                     - other content as plain JS objects
cv/
  template.typ              - Typst CV template
  build.sh                  - generates PDF CVs (both languages)
  output/                   - generated PDFs (gitignored)
scripts/
  prepare-deploy.mjs        - splits build output for two-repo deploy
```

## CV generation

CV data in `src/data/cv.yaml` feeds both the website and PDF output via [Typst](https://typst.app).

```sh
sh cv/build.sh              # generates cv/output/cv-en.pdf and cv-no.pdf
```

Requires `typst` (`brew install typst`).

## Privacy

- No ads or third-party tracking
- Analytics via Umami, cookieless, no personal data collected
- Contact info encoded in HTML to reduce scraping
