---
title: An atlas of my own
description: Travel pins and GPS routes in one free, open-source map, reachable from any device.
date: 2026-05-20
cover: https://res.cloudinary.com/djpkffk5u/image/upload/v1779360907/atlas_hero_16x9_jmfver.png
coverAlt: Ferd map view with place pins
thumb: /images/ferd-thumb.svg
thumbAlt: A folded map with a dashed route and a location pin
draft: false
repo: https://github.com/polybjorn/ferd
---

For years my GPS routes from hikes sat in a folder on disk, and the places I'd been or wanted to go were mostly in my head. I'd never found a tool that held both.

Phone apps already do a lot of this. Organic Maps and OsmAnd both keep bookmarks and GPS routes on the same map, and Trail Sense covers the outdoor utility side. But each of them keeps its map on the one device it's installed on, and I wanted one that every device can reach.

Ferd is that option: one map for the pins and the lines, running on my own machine.

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
