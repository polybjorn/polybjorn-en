---
title: An atlas of my own
description: Travel pins and GPS routes in one free, open-source map, reachable from any device.
date: 2026-05-20
cover: https://res.cloudinary.com/djpkffk5u/image/upload/v1779360907/atlas_hero_16x9_jmfver.png
coverAlt: Ferd map view with place pins
thumb: /images/ferd-thumb.svg
thumbAlt: A folded map with a dashed route and a location pin
draft: false
---

For years my GPS routes from hikes sat in a folder on disk, and the places I'd been or wanted to go were mostly in my head. I'd never found a tool that held both.

Phone apps already do a lot of this. Organic Maps and OsmAnd both keep bookmarks and GPS routes on the same map, and Trail Sense covers the outdoor utility side. What was still missing was a cross-platform option, since the three above are phone apps.

Ferd is what I ended up with. One map for the pins and the lines, running on my own machine.

<div class="article-gallery">
  <button class="gallery-thumb" type="button" data-full="https://res.cloudinary.com/djpkffk5u/image/upload/w_1600,f_auto/v1779361052/Screenshot_2026-05-21_at_13.56.24_xxx3et.png">
    <img src="https://res.cloudinary.com/djpkffk5u/image/upload/w_480,f_auto/v1779361052/Screenshot_2026-05-21_at_13.56.24_xxx3et.png" alt="Ferd places list page" loading="lazy" />
  </button>
  <button class="gallery-thumb" type="button" data-full="https://res.cloudinary.com/djpkffk5u/image/upload/w_1600,f_auto/v1779361052/Screenshot_2026-05-21_at_13.56.40_nf4kxi.png">
    <img src="https://res.cloudinary.com/djpkffk5u/image/upload/w_480,f_auto/v1779361052/Screenshot_2026-05-21_at_13.56.40_nf4kxi.png" alt="Ferd trail detail page" loading="lazy" />
  </button>
  <button class="gallery-thumb" type="button" data-full="https://res.cloudinary.com/djpkffk5u/image/upload/w_1600,f_auto/v1779361051/Screenshot_2026-05-21_at_13.57.12_o9jzng.png">
    <img src="https://res.cloudinary.com/djpkffk5u/image/upload/w_480,f_auto/v1779361051/Screenshot_2026-05-21_at_13.57.12_o9jzng.png" alt="Ferd appearance settings" loading="lazy" />
  </button>
</div>

Under the hood it's small. About 5 MB of code, made of one web page, a small Python API, and a SQLite database behind it.

Nothing about it is technically novel. What it gives me is the thing I'd been looking for, which is one map for both the dots and the lines, reachable from any device.

<div class="link-buttons">
  <a href="https://github.com/polybjorn/ferd" target="_blank" rel="noopener">
    <svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
    GitHub repository
  </a>
</div>
