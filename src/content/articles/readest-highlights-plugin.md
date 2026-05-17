---
title: An Obsidian plugin for Readest highlights
description: Highlighting passages didn't do much for me until they could leave the reader app.
date: 2026-05-16
cover: https://res.cloudinary.com/djpkffk5u/image/upload/v1779013155/Obsidian_Readest_Highlights_16x9_ptqu2s.png
coverAlt: An Obsidian note generated from a Readest book
thumb: https://res.cloudinary.com/djpkffk5u/image/upload/v1779019401/Obsidian_Readest_Highlights_thumb_xmkdhb.png
thumbAlt: Readest and Obsidian icons connected by an arrow
draft: true
---

Highlighting passages in a book never did much for me. Once a highlight was sitting inside the reader app, I didn't have a way to pull it back out, so it mostly just stayed there. My notes live in [Obsidian](https://obsidian.md), and getting the highlights from [Readest](https://readest.com) into that same place was the gap I wanted to close.

So I made a small plugin that does exactly that. Open Obsidian, run a command, and your book highlights show up as notes, one per book. Run it again later and the notes update in place instead of piling up duplicates.

Each note has the title, author, and year at the top, followed by the highlights as a list, each with its page number and any notes you wrote alongside it.

The plugin never changes anything in Readest itself, just reads the highlights and never touches the original files. It also doesn't talk to the internet, so nothing about what you've highlighted leaves your computer.

It's available in Obsidian's community plugin browser as [readest-highlights](https://community.obsidian.md/plugins/readest-highlights), or you can browse the source on [GitHub](https://github.com/polybjorn/obsidian-readest-highlights).

I run it after finishing a book, and it's been quietly useful.
