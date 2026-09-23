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
  build-preview.mjs         - builds a branch for the preview server's subpath
  prepare-preview.mjs       - rewrites hand-written absolute URLs onto that base
```

## Dev-only previews

The enquiry form has a state it only reaches by being filled in and sent, which
made reviewing it a four-section form fill for every change to a margin.

```sh
npm run dev
```

- `/dev/enquiry-sent` - the English form, already sent
- `/dev/enquiry-sent-no` - the Norwegian one

The preview fills the real controls with sample answers and stubs `fetch`, so
the page's own code renders the receipt and nothing reaches the worker.

```sh
npm run build:preview
```

puts the same routes in a static build, for serving a preview from a machine of
ours instead of starting a dev server by hand. A plain `npm run build` - what
deploys - emits no `dev/` directory at all, rather than a page that hides
itself.

## Publishing a branch preview

The fleet's preview server holds one directory per site and one below that per
branch, so a preview is served from `/<site>/<branch>/` rather than from a root
of its own. A build made for the root points every asset at `/_astro/...`,
which 404s from a subpath while the HTML still renders, so it reads as a
styling bug rather than a publishing one.

```sh
npm run preview:build
site-preview publish polybjorn-en dist
```

`preview:build` derives the base path from the current branch, the same way the
publisher derives the directory it will land in, and prints the publish command
with the branch filled in. `BRANCH=herd/other` overrides it.

Two halves make it work. Astro's `base` covers what Astro emits, including the
font URLs compiled into the CSS, and `scripts/prepare-preview.mjs` prefixes what
was written by hand in a component - a `/favicon.svg` or a `/projects`, which
Astro leaves alone because it cannot tell them from a path the site does not
own. Neither runs unless `PREVIEW_BASE` is set: `npm run build` is
byte-for-byte what it was.

One thing it does not reach: a URL a script builds at runtime. The 404 page
sends its home link to `/`, which leaves the preview and lands on the server's
own index.

## Tests

```sh
npm test              # build, then both suites
npm run test:worker   # the enquiry endpoint, against a KV stub
npm run test:pages    # the built pages, driven in jsdom
npm run check         # astro check, against the strict tsconfig
```

Both gates run the check and both suites - the forge on every pull request and
on main, the deploy workflow again before publishing. The node version is
written in `.nvmrc` and nowhere else; the forge gate asserts that the runner it
is handed agrees with it.

The page tests run against `dist`, not the source: Astro's scoping, bundling and
minifier sit between a component and the browser, and at least one bug has lived
entirely in that gap. Some of them ask for a computed style rather than reading
the DOM, because markup looks identical whether a rule applied or never matched.

## External links

Internal links are covered by `tests/internal-links.test.mjs`, which gates
merges: it can, because the file tree answers it offline.

External links are swept weekly instead, by
`.forgejo/workflows/external-links.yml`, which reports into a single issue it
opens, edits and closes by itself. It is deliberately not a gate - an external
link check asks a question about the world rather than about the diff, and a
third party being down for an hour must not stop a merge.

```sh
npm run check:links   # the same sweep by hand, about two minutes
```

Our own hostnames are skipped, hosts are paced individually, and only a 404, a
410 or a hostname that does not resolve counts as a dead link - a 403, a 429 or
a timeout is recorded as unreadable and kept out of the report. The reasoning,
and the measurements behind it, are in the header comment of
`.forgejo/scripts/check-external-links.mjs`.

## Branch cleanup

A merged `herd/` branch is deleted by `.forgejo/workflows/delete-merged-branch.yml`:
the `merged` job takes the branch the merge event names, and a daily sweep at
04:17 catches whatever the event missed. Both delete over git -
`git push origin --delete` removes the ref and `git ls-remote` decides whether it
worked - because this forge answers 204 to a DELETE that did not delete, and
recreates a deleted ref at its old sha within about two seconds.

The two halves answer that recreation differently, on purpose. The sweep uses
`.forgejo/scripts/delete-branches.mjs` and retries up to four times, failing only
on a ref that survives all four. The `merged` job is
`bjorn/ci-actions/delete-merged-branch@v1` since nixfleet #149, and that action
deletes once: a ref that comes back is kept, marked `refs/specimens/<date>/<branch>`
and the job goes red, because a second delete takes `logs/refs/heads/<branch>`
with it and that reflog is the only thing that separates a recreated ref from one
whose deletion never landed. The sweep is what clears a kept specimen the next
morning.

A second workflow watches the first. `stuck-branches.yml` runs on every push to
main and asks whether any `herd/` branch already contained in main is still on
the remote after 26 hours, reporting into a single issue it opens, edits and
closes by itself - the same shape the link check uses. It deliberately does not
ask whether the sweep ran: a schedule that does not fire produces no run, so the
end state is the only thing worth asserting.

```sh
npm run check:branches   # the same question, against this clone's remote
```

Both jobs fetch the remote's branch refs in a step of their own before selecting
anything. That is not decoration: `actions/checkout` here leaves no
remote-tracking refs at all, not even `origin/main`. The sweep selected over
refs that were never present from the day it was added until the day it was
fixed, printing "no merged herd/ branches" - which is also what a working sweep
prints on a clean remote, which is why two runs went by without anyone noticing.
`tests/branch-jobs-fetch.test.mjs` asserts the fetch step is still there, because
no behaviour test can catch its absence: a job selecting over refs that do not
exist reports an empty remote and exits 0.

## CV generation

CV data in `src/data/cv.yaml` feeds both the website and PDF output via [Typst](https://typst.app).

```sh
sh cv/build.sh              # generates EN and NO PDFs in cv/output/
```

Requires `typst` (`brew install typst`).

## Privacy

- No ads or third-party tracking
- Analytics via Umami, cookieless, no personal data collected
- Contact info encoded in HTML to reduce scraping
