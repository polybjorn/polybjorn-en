# Enquiry endpoint

The 3D printing intake form posts here. The worker checks the submission, parks
it in KV, and pi-rovar pulls it down on a timer and deletes it. Nothing is
mailed, and nothing at home listens on a port: the Pi makes an outbound request
to one known host, so an anonymous upload is never parsed on hardware in the
house.

Background and the decision that replaced the original mail design:
polybjorn-en#16. The pulling half lives in nixfleet#112.

## Deploying

From this directory, with wrangler logged in to the account that holds both
zones:

1. `wrangler kv namespace create ENQUIRIES` and paste the id it prints into
   `wrangler.toml`.
2. `wrangler secret put PULL_TOKEN` with a long random string. The same value
   goes into sops on pi-rovar.
3. `wrangler deploy`.

The routes in `wrangler.toml` put the endpoint on the site's own hostname, which
is what keeps the form same-origin. Both zones are proxied through Cloudflare
with GitHub Pages behind them, so this works without touching DNS.

`language-redirect.js` in the parent directory is a dashboard paste with no
bindings. This one has a KV namespace, a rate limiter and a secret, which is why
it is configured in a file instead.

## Tests

    npm run test:worker

They drive the worker's fetch handler against a KV stub, so no wrangler, no
network and no account. They cover the rejection rules rather than the happy
path, because the rejection rules are the only thing between an anonymous upload
and a client folder.

## What it enforces

The form advertises some of this and can enforce none of it, since a scripted
request never loads the page (nixfleet#87).

- The honeypot field, answered with the same success a real submit gets so a bot
  cannot tell it was caught.
- 10 MB per file, 20 MB per submission, 10 files.
- The upload allowlist, checked against the bytes and not the extension. See
  `files.js` for what is on it and why archives and SVG are not.
- 4000 characters for the description, 300 for every other answer. Over the cap
  is trimmed, not refused.
- Only field names and option values the form could have produced. Anything else
  is dropped before it reaches the PRM.
- At least one contact method, which is the form's one hard rule.
- Three submissions per minute per IP, and 50 stored in a day. Both apply to
  `POST` only: the daily figure counts enquiries already in KV for the date,
  so the pull routes cannot spend it and are not rate limited at all.

## Pull API

Every call needs `Authorization: Bearer $PULL_TOKEN`. All responses are JSON
except the file bytes.

| Method | Path | Answers with |
| --- | --- | --- |
| `GET` | `/api/enquiry/pending` | `{ pending: [{ id, receivedAt, lang, files }] }`, oldest first |
| `GET` | `/api/enquiry/<id>` | `{ enquiry: <envelope> }` |
| `GET` | `/api/enquiry/<id>/files/<index>` | the raw bytes, with `content-type` and a filename |
| `DELETE` | `/api/enquiry/<id>` | `{ ok: true }`, and the attachments go with it |

Delete is idempotent: a retry after a partial failure is a success, not a 404.

The envelope:

```json
{
  "id": "20260912T114233Z-9f2c1a7b",
  "receivedAt": "2026-09-12T11:42:33.021Z",
  "lang": "no",
  "country": "NO",
  "answers": [{ "id": "description", "label": "Beskriv delen ...", "value": "..." }],
  "raw": { "description": "...", "orderType": "file", "materialProperties": ["outdoor"] },
  "files": [{ "index": 0, "name": "brakett.stl", "type": "model/stl", "size": 8484 }],
  "brief": "Henvendelse fra skjemaet ...\n\nBeskriv delen ...: ..."
}
```

`brief` is the whole enquiry as plain text, rendered with the question labels the
visitor actually read, in the language they read them in. It is meant to be
filed as it is. `answers` is the same thing structured, and `raw` is the
machine-readable version keyed by field id, for anything that wants to read a
single answer.

The id sorts chronologically and is safe as a folder name.

No IP address is kept. `country` is what Cloudflare already knows from the
connection, and it is there because a country is useful for spotting a wave of
junk and is not personal data on its own.

## The free plan and CPU

A worker on the Workers Free plan gets **10 ms of CPU per request**, everything
included. Waiting on KV does not count against it, but parsing the body does,
and so does anything that walks an upload end to end.

That is why there is no checksum in the manifest and why the text check reads
only the first 64 KiB: both were CPU proportional to the largest thing here.
What remains is `request.formData()` itself, which cannot be avoided without
hand-writing a multipart parser, and which no test on a machine without workerd
can measure.

So the question is open until it is answered in production, and it is answered
by attaching a large photo to a real enquiry. If that submission fails where a
text-only one succeeds, the worker is running out of CPU rather than doing
anything wrong, and the fix is the $5/month Workers Paid plan, which raises the
limit to 30 seconds. Nothing in the code changes.

## Retention

A submission lives in KV until the puller deletes it, with a 14 day TTL as a
backstop for the case where the puller is broken. That TTL is not a retention
policy. What pi-rovar keeps after import, and for how long, is the open half of
polybjorn-en#2's "submissions are personal data" constraint.
