/**
 * Cloudflare Worker: the 3D printing enquiry endpoint.
 *
 * Route: polybjorn.no/api/enquiry and polybjorn.com/api/enquiry
 *
 * The form posts here, this parks the submission in KV, and pi-rovar pulls it
 * down on a timer and deletes it. Nothing is mailed and nothing at home listens
 * on a port: the Pi only ever makes an outbound request to one known host, so
 * an anonymous upload is never parsed on hardware in the house. See
 * polybjorn-en#16 for the decision and nixfleet#112 for the pulling half.
 *
 * This worker answers in JSON only, never HTML. The form cannot be used without
 * JavaScript in the first place - its sections ship `hidden` and are revealed by
 * script - so every real submit arrives through fetch, and every message a
 * visitor reads comes from translations.js on the page. Error responses here
 * carry a `code` for the page to translate, so the copy lives in one place.
 *
 * What this enforces, none of which the browser can be trusted with
 * (nixfleet#87 asked for exactly this list):
 *
 *   - the honeypot, answered with a fake success so a bot learns nothing
 *   - per-file and total size caps
 *   - the upload allowlist, by magic bytes and not by extension (files.js)
 *   - a cap on how long any one answer can be, and on how many files
 *   - known field names and known option values, so nothing unexpected reaches
 *     the PRM import
 *   - a burst rate limit per IP, and a ceiling on how many submissions get
 *     stored in a day. Both are POST-only; the pull routes have neither.
 */

import { BASE_FIELDS } from '../../src/data/intakeForm.js';
import { ACCEPTED_EXTENSIONS, inspect, safeFilename } from './files.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // What the form advertises.
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TEXTAREA_CHARS = 4000;
const MAX_TEXT_CHARS = 300;
// A backstop, not a retention policy: the puller deletes what it has taken, and
// this is what happens to anything it never managed to take.
const KV_TTL_SECONDS = 14 * 24 * 60 * 60;
// A ceiling on submissions stored in a day. Not per visitor, and not a request
// budget: it counts what is already in KV for the date, so the pull routes
// cannot spend it. A handful of enquiries a month is the expected volume, so
// this only ever trips on abuse, and it protects the KV namespace and the Pi
// rather than any one submitter.
const MAX_PER_DAY = 50;

const SITE_ORIGINS = [
  'https://polybjorn.no',
  'https://polybjorn.com',
  'https://www.polybjorn.no',
  'https://www.polybjorn.com',
];

const FIELD_BY_ID = new Map(BASE_FIELDS.map(field => [field.id, field]));

// A checkbox group posts as `name[]`, everything else posts under its own id.
// IntakeField.astro is where that is decided; this mirrors it.
const paramName = field => (field.type === 'checkboxGroup' ? `${field.id}[]` : field.id);

const optionLabel = (option, lang) => (option.label ? option.label[lang] : option[lang]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

const fail = (status, code) => json(status, { ok: false, code });

// Compare digests rather than the tokens themselves: same constant-time loop,
// but a fixed length either way, so nothing leaks through how long it runs.
async function tokenMatches(given, expected) {
  if (!given || !expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

// 20260912T114233Z-9f2c1a7b: sorts chronologically as a KV key, is safe as a
// folder name on the far side, and carries no personal data in itself.
function newId(receivedAt) {
  const stamp = receivedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${stamp}-${random}`;
}

/**
 * Reads the posted form against the field definitions the page was built from.
 * Anything not in BASE_FIELDS is ignored, and an option value that is not one of
 * the options offered is dropped rather than passed on: the PRM should never see
 * a value the form could not have produced.
 */
function collectAnswers(form, lang) {
  const raw = {};
  const answers = [];

  for (const field of BASE_FIELDS) {
    if (field.type === 'file') continue;
    const name = paramName(field);

    if (field.type === 'checkboxGroup') {
      const allowed = field.options.map(option => option.value);
      const values = form.getAll(name).map(String).filter(value => allowed.includes(value));
      // A print includes its model, so the form posts both values. Keeping the
      // duplicate out matters because a hidden implied input rides along.
      const unique = [...new Set(values)];
      if (!unique.length) continue;
      raw[field.id] = unique;
      answers.push({
        id: field.id,
        label: field.label[lang],
        value: unique
          .map(value => optionLabel(field.options.find(option => option.value === value), lang))
          .join(', '),
      });
      continue;
    }

    const value = form.get(name);
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;

    if (field.type === 'radio' || field.type === 'select') {
      const option = field.options.find(candidate => candidate.value === trimmed);
      if (!option) continue;
      raw[field.id] = trimmed;
      answers.push({ id: field.id, label: field.label[lang], value: optionLabel(option, lang) });
      continue;
    }

    if (field.type === 'checkbox') {
      if (trimmed !== 'yes') continue;
      // `raw` keeps the wire value, so anything downstream still tests for
      // 'yes'. `answers` is prose for a human, and a Norwegian brief that read
      // "Behandle henvendelsen konfidensielt: yes" was the one untranslated
      // word in it.
      raw[field.id] = 'yes';
      answers.push({ id: field.id, label: field.label[lang], value: lang === 'no' ? 'Ja' : 'Yes' });
      continue;
    }

    const limit = field.type === 'textarea' ? MAX_TEXTAREA_CHARS : MAX_TEXT_CHARS;
    const capped = trimmed.slice(0, limit);
    raw[field.id] = capped;
    answers.push({ id: field.id, label: field.label[lang], value: capped });
  }

  return { raw, answers };
}

/**
 * The brief as the PRM will file it: the questions the visitor saw, in the
 * language they saw them in, with their answers. Rendering it here rather than
 * on the Pi means the labels come from the same file that built the page, so a
 * reworded question cannot leave an old label attached to a new answer.
 */
const LOCALES = { no: 'nb-NO', en: 'en-GB' };

// Europe/Oslo rather than UTC, which is where a worker thinks it is. The brief
// is read by one person in one place, and "16:33" is what he will compare
// against his own day.
function formatReceived(receivedAt, lang) {
  return new Date(receivedAt).toLocaleString(LOCALES[lang], {
    timeZone: 'Europe/Oslo',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

// The same thresholds and the same locale as formatSize() in IntakeForm.astro,
// so an attachment is not "8,6 MB" in the browser someone just used and
// "9000000 bytes" in the brief that arrives from it.
function formatSize(bytes, lang) {
  const number = new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${number.format(bytes)} B`;
  if (bytes < 1024 * 1024) return `${number.format(bytes / 1024)} kB`;
  return `${number.format(bytes / (1024 * 1024))} MB`;
}

function renderBrief({ id, receivedAt, lang, answers, files, confidential }) {
  const lines = [
    lang === 'no' ? 'Henvendelse fra skjemaet på polybjorn.no' : 'Enquiry from the form on polybjorn.com',
    `${lang === 'no' ? 'Mottatt' : 'Received'}: ${formatReceived(receivedAt, lang)}`,
    `ID: ${id}`,
  ];

  // The tick is the one answer that changes what the reader may do with the
  // rest, and as an ordinary answer row it sorted last, under the description
  // and the contact details, where a skim misses it. It stays in the answer
  // list as well: a banner is for reading, the row is for the record.
  if (confidential) {
    lines.push(lang === 'no'
      ? 'KONFIDENSIELT - kunden har bedt om fortrolig behandling'
      : 'CONFIDENTIAL - the customer asked for this to be kept private');
  }

  lines.push('');

  for (const answer of answers) {
    const multiline = answer.value.includes('\n');
    lines.push(`${answer.label}:${multiline ? '\n' : ' '}${answer.value}`);
    lines.push('');
  }

  if (files.length) {
    lines.push(lang === 'no' ? 'Vedlegg:' : 'Attachments:');
    for (const file of files) lines.push(`- ${file.name} (${formatSize(file.size, lang)})`);
    lines.push('');
  }

  return lines.join('\n');
}

async function handleSubmit(request, env) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) return fail(415, 'bad-request');

  // A third-party page has no business posting here. There is no cookie and no
  // session to abuse, so this is not a CSRF defence, just a cheap way to keep
  // someone else's form off the endpoint.
  const origin = request.headers.get('origin');
  if (origin && !SITE_ORIGINS.includes(origin)) return fail(403, 'bad-request');

  // Refuse an oversized body before reading it rather than after.
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_TOTAL_BYTES) return fail(413, 'too-large');

  if (env.ENQUIRY_RATELIMIT) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const { success } = await env.ENQUIRY_RATELIMIT.limit({ key: ip });
    if (!success) return fail(429, 'rate-limited');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'bad-request');
  }

  // The honeypot is invisible to a person, so anything in it came from a script.
  // Answering with the success a real submit gets means a bot cannot use the
  // response to work out that it was caught and try something else.
  const honeypot = form.get('website');
  if (typeof honeypot === 'string' && honeypot.trim()) {
    return json(200, { ok: true, id: newId(new Date().toISOString()) });
  }

  const lang = form.get('lang') === 'no' ? 'no' : 'en';
  const { raw, answers } = collectAnswers(form, lang);

  // The form's one hard rule, restated here because the browser's copy of it is
  // only an affordance. Everything else it marks as required is left alone: a
  // half-filled enquiry is still worth having, an unreachable one is not.
  const reachable = ['contactEmail', 'contactPhone', 'contactSignal'].some(id => raw[id]);
  if (!reachable) return fail(400, 'no-contact-method');
  if (raw.contactEmail && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(raw.contactEmail)) {
    return fail(400, 'bad-email');
  }

  const uploads = form.getAll('fileUpload').filter(entry => typeof entry === 'object' && entry.size >= 0);
  if (uploads.length > MAX_FILES) return fail(413, 'too-many-files');

  const files = [];
  let total = 0;
  for (const upload of uploads) {
    if (!upload.size) continue;
    if (upload.size > MAX_FILE_BYTES) return fail(413, 'file-too-large');
    total += upload.size;
    if (total > MAX_TOTAL_BYTES) return fail(413, 'too-large');

    const bytes = new Uint8Array(await upload.arrayBuffer());
    const name = safeFilename(upload.name);
    const verdict = inspect(name, bytes);
    if (!verdict.ok) {
      return json(415, {
        ok: false,
        code: verdict.reason === 'extension' ? 'file-type' : 'file-content',
        file: name,
        accepted: ACCEPTED_EXTENSIONS,
      });
    }
    files.push({ name, type: verdict.type, size: bytes.length, bytes });
  }

  const receivedAt = new Date().toISOString();
  const id = newId(receivedAt);

  // A ceiling on how many submissions a day get stored. list() is eventually
  // consistent, which is fine for a backstop, and it costs a read rather than
  // the write a counter would need.
  const today = id.slice(0, 9);
  const { keys } = await env.ENQUIRIES.list({ prefix: `enquiry:${today}` });
  if (keys.length >= MAX_PER_DAY) return fail(429, 'rate-limited');

  // No checksum. An earlier version hashed every upload into the manifest so the
  // puller could verify what it fetched, which reads as diligence and is not
  // worth what it costs: hashing is CPU proportional to the largest thing this
  // worker touches, and the free plan allows 10 ms per request in total. Both
  // hops are already TLS to Cloudflare, and the puller can hash locally if it
  // ever wants a fingerprint for its own records.
  const manifest = files.map((file, index) => ({
    index,
    name: file.name,
    type: file.type,
    size: file.size,
  }));

  const envelope = {
    id,
    receivedAt,
    lang,
    // The country Cloudflare already knows from the connection. The IP address
    // is deliberately not kept: it is personal data that would sit in KV and
    // then on the Pi, and nothing downstream has a use for it.
    country: request.headers.get('cf-ipcountry') || null,
    answers,
    raw,
    files: manifest,
    brief: renderBrief({ id, receivedAt, lang, answers, files: manifest, confidential: raw.confidential === 'yes' }),
  };

  // Files first. If a write fails halfway the envelope never appears, so the
  // puller never sees a submission whose attachments are missing.
  for (const [index, file] of files.entries()) {
    await env.ENQUIRIES.put(`file:${id}:${index}`, file.bytes, {
      expirationTtl: KV_TTL_SECONDS,
      metadata: { name: file.name, type: file.type, size: file.size },
    });
  }
  await env.ENQUIRIES.put(`enquiry:${id}`, JSON.stringify(envelope), {
    expirationTtl: KV_TTL_SECONDS,
    // confidential is a real boolean here rather than the wire value, which is
    // 'yes' or absent and never 'no'. A reader testing `if (entry.confidential)`
    // against the string would be right by accident today and wrong the day the
    // form starts sending a value for the unticked box.
    metadata: { receivedAt, lang, files: manifest.length, confidential: raw.confidential === 'yes' },
  });

  return json(201, { ok: true, id });
}

/**
 * The pull side. Only pi-rovar calls these, with the token that also lives in
 * sops on that host.
 */
async function handlePull(request, env, path) {
  const header = request.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!(await tokenMatches(given, env.PULL_TOKEN))) return fail(401, 'unauthorised');

  if (path === '/pending' && request.method === 'GET') {
    const { keys } = await env.ENQUIRIES.list({ prefix: 'enquiry:' });
    return json(200, {
      ok: true,
      pending: keys.map(key => {
        const metadata = key.metadata || {};
        return {
          id: key.name.slice('enquiry:'.length),
          ...metadata,
          // null means unknown, and it happens for one reason: KV metadata is
          // written at put time with no rewrite path, so an enquiry stored
          // before this field existed can never gain it. Reporting false there
          // would say "not confidential" about an enquiry nobody has checked,
          // which is the only direction that costs anything. Resolve one by
          // fetching the envelope - raw.confidential is the source. The case
          // clears itself once the queue drains, and KV_TTL_SECONDS is the
          // ceiling on how long an undrained one can sit.
          confidential: typeof metadata.confidential === 'boolean' ? metadata.confidential : null,
        };
      }),
    });
  }

  const single = path.match(/^\/([0-9A-Za-z-]{1,64})$/);
  if (single) {
    const id = single[1];
    if (request.method === 'GET') {
      const envelope = await env.ENQUIRIES.get(`enquiry:${id}`, 'json');
      if (!envelope) return fail(404, 'not-found');
      return json(200, { ok: true, enquiry: envelope });
    }
    if (request.method === 'DELETE') {
      // Read the envelope first so the files it lists go too. If it is already
      // gone, deleting is still a success: the puller may be retrying.
      const envelope = await env.ENQUIRIES.get(`enquiry:${id}`, 'json');
      if (envelope) {
        for (const file of envelope.files) await env.ENQUIRIES.delete(`file:${id}:${file.index}`);
      }
      await env.ENQUIRIES.delete(`enquiry:${id}`);
      return json(200, { ok: true, id });
    }
  }

  const attachment = path.match(/^\/([0-9A-Za-z-]{1,64})\/files\/(\d{1,2})$/);
  if (attachment && request.method === 'GET') {
    const [, id, index] = attachment;
    const { value, metadata } = await env.ENQUIRIES.getWithMetadata(`file:${id}:${index}`, 'arrayBuffer');
    if (!value) return fail(404, 'not-found');
    return new Response(value, {
      headers: {
        'content-type': metadata?.type || 'application/octet-stream',
        // The filename is quoted and ASCII-safe already (files.js), so it can go
        // in the header as it is.
        'content-disposition': `attachment; filename="${metadata?.name || index}"`,
        'cache-control': 'no-store',
      },
    });
  }

  return fail(404, 'not-found');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/enquiry')) return fail(404, 'not-found');
    const path = url.pathname.slice('/api/enquiry'.length).replace(/\/$/, '');

    if (path === '' && request.method === 'POST') return handleSubmit(request, env);
    if (path === '') return fail(405, 'bad-request');
    return handlePull(request, env, path);
  },
};
