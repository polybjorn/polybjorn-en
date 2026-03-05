# polybjorn.com

Personal portfolio and contact point.

- [polybjorn.com](https://polybjorn.com) — English
- [polybjorn.no](https://polybjorn.no) — Norwegian (deploys to [polybjorn/polybjorn-no](https://github.com/polybjorn/polybjorn-no))

## Stack

- [Astro](https://astro.build) — static site generator
- [Cloudflare](https://cloudflare.com) — DNS
- [Cloudinary](https://cloudinary.com) — image hosting and transforms
- [GitHub Pages](https://pages.github.com) — hosting
- [GitHub Actions](https://github.com/features/actions) — deployment on push
- [Umami](https://umami.is) — cookieless, privacy-friendly analytics

## Assets

- [Icons8](https://icons8.com) — icons
- [Lucide](https://lucide.dev) — icons
- [Piazzolla](https://fontsource.org/fonts/piazzolla) — typeface

## Structure

```
src/
  layouts/Layout.astro      — shared layout
  pages/                    — English pages
  pages/no/                 — Norwegian pages
  data/                     — content as plain JS objects
scripts/
  prepare-deploy.mjs        — splits build output for two-repo deploy
```

## Privacy

- No ads or third-party tracking
- Analytics via Umami — cookieless, no personal data collected
- Contact info encoded in HTML to reduce scraping
