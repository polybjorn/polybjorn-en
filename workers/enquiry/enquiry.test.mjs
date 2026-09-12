/**
 * Run with: node --test workers/enquiry/
 *
 * These drive the worker's own fetch handler against a KV stub, so they need no
 * wrangler, no network and no account. What they are for is the rejection rules:
 * every one of them is the only thing standing between an anonymous upload and a
 * client folder on pi-rovar, and none of them can be checked by reading the
 * form, since the form is exactly the thing an attacker does not use.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import worker from './index.js';
import { safeFilename, inspect } from './files.js';

const PULL_TOKEN = 'test-token-not-a-real-one';

function kvStub() {
  const store = new Map();
  return {
    store,
    async put(key, value, options = {}) {
      const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
      store.set(key, { bytes, metadata: options.metadata || null, ttl: options.expirationTtl });
    },
    async get(key, type) {
      const entry = store.get(key);
      if (!entry) return null;
      const text = new TextDecoder().decode(entry.bytes);
      if (type === 'json') return JSON.parse(text);
      if (type === 'arrayBuffer') return entry.bytes.buffer;
      return text;
    },
    async getWithMetadata(key, type) {
      const entry = store.get(key);
      if (!entry) return { value: null, metadata: null };
      return { value: type === 'arrayBuffer' ? entry.bytes.buffer : new TextDecoder().decode(entry.bytes), metadata: entry.metadata };
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix }) {
      return {
        keys: [...store.keys()]
          .filter(key => key.startsWith(prefix))
          .sort()
          .map(name => ({ name, metadata: store.get(name).metadata })),
      };
    },
  };
}

const envWith = kv => ({ ENQUIRIES: kv, PULL_TOKEN });

// A minimally valid submission: the form's one hard rule is a contact method.
function baseForm(extra = {}) {
  const form = new FormData();
  form.append('lang', 'no');
  form.append('description', 'En brakett som holder en sensor pa plass.');
  form.append('contactEmail', 'kunde@example.com');
  for (const [key, value] of Object.entries(extra)) {
    // Replace rather than add, so a test can override the defaults above and
    // still get what it set: FormData.get returns the first value, not the last.
    form.delete(key);
    for (const one of [].concat(value)) form.append(key, one);
  }
  return form;
}

const post = (form, headers = {}) =>
  new Request('https://polybjorn.no/api/enquiry', { method: 'POST', body: form, headers });

const pngBytes = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return bytes;
};

const binaryStl = (triangles = 2) => {
  const bytes = new Uint8Array(84 + triangles * 50);
  new DataView(bytes.buffer).setUint32(80, triangles, true);
  return bytes;
};

test('a valid submission is stored with its brief and its file', async () => {
  const kv = kvStub();
  const form = baseForm({ 'materialProperties[]': ['outdoor', 'heat'], orderType: 'file' });
  form.append('fileUpload', new File([pngBytes()], 'skisse.png'));

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 201);
  const { ok, id } = await response.json();
  assert.equal(ok, true);

  const envelope = await kv.get(`enquiry:${id}`, 'json');
  assert.equal(envelope.lang, 'no');
  assert.deepEqual(envelope.raw.materialProperties, ['outdoor', 'heat']);
  assert.equal(envelope.files.length, 1);
  assert.equal(envelope.files[0].name, 'skisse.png');
  assert.ok(kv.store.has(`file:${id}:0`));

  // The brief carries the Norwegian labels the visitor actually read, not ids.
  assert.match(envelope.brief, /Beskriv delen/);
  assert.match(envelope.brief, /sensor/);
  assert.doesNotMatch(envelope.brief, /contactEmail/);
});

test('the honeypot gets the same answer a real submit gets, and stores nothing', async () => {
  const kv = kvStub();
  const form = baseForm({ website: 'http://spam.example' });

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(kv.store.size, 0);
});

test('a submission with no way to reply is refused', async () => {
  const kv = kvStub();
  const form = new FormData();
  form.append('lang', 'en');
  form.append('description', 'No way to reach me.');

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'no-contact-method');
  assert.equal(kv.store.size, 0);
});

test('an option value the form could not have produced is dropped', async () => {
  const kv = kvStub();
  const form = baseForm({ orderType: 'made-up-value', 'materialProperties[]': 'not-an-option' });

  const response = await worker.fetch(post(form), envWith(kv));
  const { id } = await response.json();
  const envelope = await kv.get(`enquiry:${id}`, 'json');
  assert.equal(envelope.raw.orderType, undefined);
  assert.equal(envelope.raw.materialProperties, undefined);
});

test('a field the form does not have is ignored', async () => {
  const kv = kvStub();
  const form = baseForm({ adminOverride: 'yes', description: 'Ok' });

  const response = await worker.fetch(post(form), envWith(kv));
  const { id } = await response.json();
  const envelope = await kv.get(`enquiry:${id}`, 'json');
  assert.equal(envelope.raw.adminOverride, undefined);
  assert.equal(envelope.answers.some(answer => answer.id === 'adminOverride'), false);
});

test('a long answer is capped rather than refused', async () => {
  const kv = kvStub();
  const form = baseForm({ description: 'x'.repeat(10000), projectName: 'y'.repeat(1000) });

  const response = await worker.fetch(post(form), envWith(kv));
  const { id } = await response.json();
  const envelope = await kv.get(`enquiry:${id}`, 'json');
  assert.equal(envelope.raw.description.length, 4000);
  assert.equal(envelope.raw.projectName.length, 300);
});

test('an executable wearing a .png extension is refused on its bytes', async () => {
  const kv = kvStub();
  const form = baseForm();
  form.append('fileUpload', new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'photo.png'));

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 415);
  assert.equal((await response.json()).code, 'file-content');
  assert.equal(kv.store.size, 0);
});

test('a format we do not take at all names what we do take', async () => {
  const kv = kvStub();
  const form = baseForm();
  form.append('fileUpload', new File([pngBytes()], 'payload.zip'));

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 415);
  const body = await response.json();
  assert.equal(body.code, 'file-type');
  assert.ok(body.accepted.includes('stl'));
  assert.equal(body.accepted.includes('zip'), false);
});

test('a binary STL is accepted and a text file calling itself one is not', async () => {
  assert.equal(inspect('part.stl', binaryStl()).ok, true);
  assert.equal(inspect('part.stl', new TextEncoder().encode('solid cube\nendsolid\n')).ok, true);
  assert.equal(inspect('part.stl', new Uint8Array([0x00, 0x01, 0x02, 0x03])).ok, false);
  assert.equal(inspect('part.step', new TextEncoder().encode('ISO-10303-21;\nHEADER;\n')).ok, true);
  assert.equal(inspect('part.step', new TextEncoder().encode('not a step file')).ok, false);
  assert.equal(inspect('model.obj', new Uint8Array([0x7f, 0x45, 0x4c, 0x46])).ok, false);
});

test('the text check reads a prefix without tripping over it', () => {
  // A file longer than the 64 KiB the check reads, with a multi-byte character
  // sitting exactly on the cut. Decoding without stream:true throws here, and
  // the file would be refused for being binary.
  const filler = 'v 1.0 2.0 3.0\n'.repeat(5000);
  const head = filler.slice(0, 65535);
  assert.equal(inspect('model.obj', new TextEncoder().encode(head + 'æøå' + filler)).ok, true);

  // Still caught: what a prefix is for is the header, and that is where every
  // format worth refusing announces itself.
  const elf = new Uint8Array(200000);
  elf.set([0x7f, 0x45, 0x4c, 0x46]);
  assert.equal(inspect('model.obj', elf).ok, false);
});

test('an oversized file is refused', async () => {
  const kv = kvStub();
  const form = baseForm();
  const big = pngBytes(11 * 1024 * 1024);
  form.append('fileUpload', new File([big], 'huge.png'));

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, 'file-too-large');
});

test('more files than the cap are refused', async () => {
  const kv = kvStub();
  const form = baseForm();
  for (let i = 0; i < 11; i += 1) form.append('fileUpload', new File([pngBytes()], `f${i}.png`));

  const response = await worker.fetch(post(form), envWith(kv));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, 'too-many-files');
});

test('a filename cannot carry a path', () => {
  assert.equal(safeFilename('../../etc/passwd'), 'passwd');
  assert.equal(safeFilename('C:\\Users\\bjorn\\part.stl'), 'part.stl');
  assert.equal(safeFilename('.hidden'), 'hidden');
  assert.equal(safeFilename(''), 'attachment');
  assert.ok(safeFilename('a'.repeat(300) + '.png').length <= 120);
});

test('a post from another site is refused', async () => {
  const kv = kvStub();
  const response = await worker.fetch(post(baseForm(), { origin: 'https://evil.example' }), envWith(kv));
  assert.equal(response.status, 403);
});

test('the burst rate limit is honoured when the binding is there', async () => {
  const kv = kvStub();
  const env = { ...envWith(kv), ENQUIRY_RATELIMIT: { limit: async () => ({ success: false }) } };
  const response = await worker.fetch(post(baseForm()), env);
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, 'rate-limited');
});

test('the daily ceiling refuses the next one', async () => {
  const kv = kvStub();
  const today = new Date().toISOString().replace(/[-:]/g, '').slice(0, 9);
  for (let i = 0; i < 50; i += 1) {
    await kv.put(`enquiry:${today}-filler${i}`, JSON.stringify({ id: `filler${i}` }));
  }
  const response = await worker.fetch(post(baseForm()), envWith(kv));
  assert.equal(response.status, 429);
});

test('the pull side needs the token', async () => {
  const kv = kvStub();
  const request = new Request('https://polybjorn.no/api/enquiry/pending');
  assert.equal((await worker.fetch(request, envWith(kv))).status, 401);

  const wrong = new Request('https://polybjorn.no/api/enquiry/pending', {
    headers: { authorization: 'Bearer nearly-right' },
  });
  assert.equal((await worker.fetch(wrong, envWith(kv))).status, 401);
});

test('pi-rovar can list, fetch, read a file and delete', async () => {
  const kv = kvStub();
  const form = baseForm();
  form.append('fileUpload', new File([binaryStl()], 'brakett.stl'));
  const { id } = await (await worker.fetch(post(form), envWith(kv))).json();

  const auth = { authorization: `Bearer ${PULL_TOKEN}` };
  const pending = await (
    await worker.fetch(new Request('https://polybjorn.no/api/enquiry/pending', { headers: auth }), envWith(kv))
  ).json();
  assert.deepEqual(pending.pending.map(entry => entry.id), [id]);
  assert.equal(pending.pending[0].files, 1);

  const one = await (
    await worker.fetch(new Request(`https://polybjorn.no/api/enquiry/${id}`, { headers: auth }), envWith(kv))
  ).json();
  assert.equal(one.enquiry.id, id);

  const file = await worker.fetch(
    new Request(`https://polybjorn.no/api/enquiry/${id}/files/0`, { headers: auth }),
    envWith(kv),
  );
  assert.equal(file.status, 200);
  assert.match(file.headers.get('content-disposition'), /brakett\.stl/);
  assert.equal((await file.arrayBuffer()).byteLength, binaryStl().length);

  const removed = await worker.fetch(
    new Request(`https://polybjorn.no/api/enquiry/${id}`, { method: 'DELETE', headers: auth }),
    envWith(kv),
  );
  assert.equal(removed.status, 200);
  assert.equal(kv.store.size, 0, 'the attachment goes with the envelope');
});

test('a GET on the submit path is not a submit', async () => {
  const kv = kvStub();
  const response = await worker.fetch(new Request('https://polybjorn.no/api/enquiry'), envWith(kv));
  assert.equal(response.status, 405);
});
