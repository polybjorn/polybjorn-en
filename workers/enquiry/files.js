/**
 * What a stranger is allowed to upload.
 *
 * The form deliberately ships no `accept` filter (see the fileUpload comment in
 * src/data/intakeForm.js): narrowing the picker turned a preference into a rule
 * and greyed out formats that can in fact be opened at this end. That decision
 * stands, and it is not in tension with this file, because the two lists answer
 * different questions. The picker was about which CAD formats are convenient.
 * This is about what is safe to drop into a client folder on a machine at home,
 * unattended, from an anonymous request.
 *
 * So the rule here is not "formats Bjorn likes" but "bytes that cannot act".
 * Two ways to earn that:
 *
 *   - a binary format with a signature at a known offset, which we check rather
 *     than trusting the extension, and
 *   - a text format, which we verify really is text: decodable UTF-8 with no
 *     NUL and no control characters beyond tab, CR and LF. A .obj that turns
 *     out to be an ELF binary fails that, which is the whole point.
 *
 * Archives are refused even though a client with twenty photos will reasonably
 * reach for a zip. An archive is a container whose contents nothing here
 * inspects, and auto-import would unpack it into a client folder. 3mf is the
 * one exception and only by extension: it is a zip, but a narrowly specified
 * one, and refusing it would refuse the format most slicers export.
 *
 * SVG is left out on purpose. It is text and it passes the text check, but it
 * can carry script, and a sketch opened from a client folder opens in a
 * browser. PNG covers the same need. Add it here if that trade ever looks
 * wrong, rather than working around it at the import.
 */

const ascii = (bytes, start, end) => String.fromCharCode(...bytes.slice(start, end));

// A binary STL is 80 bytes of header, a uint32 triangle count, then 50 bytes
// per triangle. That arithmetic is a better check than any signature: the
// header is free text and routinely starts with the word "solid", which is
// also how an ASCII STL starts, so neither prefix distinguishes them.
function isBinaryStl(bytes) {
  if (bytes.length < 84) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  return 84 + triangles * 50 === bytes.length;
}

function startsWithText(bytes, prefix) {
  // Leading whitespace and a byte order mark are both common in exported CAD
  // text, and neither says anything about what the file is.
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  while (start < bytes.length && /\s/.test(String.fromCharCode(bytes[start]))) start += 1;
  return ascii(bytes, start, start + prefix.length) === prefix;
}

// How much of a text file is actually read. Decoding ten megabytes to prove it
// is text costs CPU proportional to the upload, and a worker on the free plan
// has 10 ms of it per request for everything, parsing the body included.
//
// A prefix is where the answer is anyway. Every format this would catch - an
// ELF, a PE, a zip wearing a .obj extension - announces itself in its first
// bytes, which is the same reason file(1) reads a header rather than a whole
// disk. What a prefix cannot catch is binary spliced into the middle of an
// otherwise real text file, and that is given up knowingly: it is inert to the
// import either way, and whatever nixfleet#87 settles on still has to hold.
const TEXT_CHECK_BYTES = 64 * 1024;

// Valid UTF-8, and nothing in it that a terminal or an importer would treat as
// a control sequence. TextDecoder with fatal:true does the first half; the
// second half is what stops a binary payload wearing a .obj extension.
export function isPlainText(bytes) {
  const head = bytes.length > TEXT_CHECK_BYTES ? bytes.subarray(0, TEXT_CHECK_BYTES) : bytes;
  let text;
  try {
    // stream:true so a character straddling the cut is held back rather than
    // thrown as a decoding error. Without it, every text file whose 65536th byte
    // lands mid-character would be refused for being binary.
    text = new TextDecoder('utf-8', { fatal: true }).decode(head, { stream: true });
  } catch {
    return false;
  }
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
}

const TYPES = [
  { exts: ['jpg', 'jpeg'], type: 'image/jpeg', signature: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { exts: ['png'], type: 'image/png', signature: b => b[0] === 0x89 && ascii(b, 1, 4) === 'PNG' },
  { exts: ['gif'], type: 'image/gif', signature: b => ascii(b, 0, 4) === 'GIF8' },
  { exts: ['webp'], type: 'image/webp', signature: b => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  {
    // HEIC is what an iPhone hands over, so it arrives often. The brand box
    // after "ftyp" is what separates it from any other ISO base media file.
    exts: ['heic', 'heif'],
    type: 'image/heic',
    signature: b =>
      ascii(b, 4, 8) === 'ftyp' &&
      ['heic', 'heix', 'heim', 'heis', 'hevc', 'mif1', 'msf1'].includes(ascii(b, 8, 12)),
  },
  { exts: ['pdf'], type: 'application/pdf', signature: b => ascii(b, 0, 5) === '%PDF-' },
  { exts: ['3mf'], type: 'model/3mf', signature: b => b[0] === 0x50 && b[1] === 0x4b },
  {
    exts: ['stl'],
    type: 'model/stl',
    signature: b => isBinaryStl(b) || (isPlainText(b) && startsWithText(b, 'solid')),
  },
  { exts: ['step', 'stp'], type: 'model/step', text: true, prefix: 'ISO-10303-21' },
  { exts: ['obj'], type: 'model/obj', text: true },
  { exts: ['amf'], type: 'model/amf', text: true },
  { exts: ['dxf'], type: 'image/vnd.dxf', text: true },
  { exts: ['scad'], type: 'text/plain', text: true },
  { exts: ['gcode', 'gco'], type: 'text/x.gcode', text: true },
  { exts: ['txt', 'csv', 'md'], type: 'text/plain', text: true },
];

export const ACCEPTED_EXTENSIONS = TYPES.flatMap(t => t.exts).sort();

export function extensionOf(filename) {
  const dot = String(filename).lastIndexOf('.');
  return dot === -1 ? '' : String(filename).slice(dot + 1).toLowerCase();
}

/**
 * A filename from a stranger is a string, not a path. Everything that could
 * make it behave like one comes out, and what is left is capped so it cannot
 * be used to blow up a directory entry on the far side.
 */
export function safeFilename(filename) {
  const base = String(filename).split(/[\\/]/).pop() || 'attachment';
  const cleaned = base
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/^\.+/, '')
    .replace(/[^A-Za-z0-9._ ()+-]/g, '_')
    .trim();
  if (!cleaned || cleaned === '.') return 'attachment';
  if (cleaned.length <= 120) return cleaned;
  // Keep the extension when trimming, since it is what the far side sorts on.
  const ext = extensionOf(cleaned);
  return ext ? cleaned.slice(0, 119 - ext.length) + '.' + ext : cleaned.slice(0, 120);
}

/**
 * Returns { ok: true, type } for bytes we are willing to keep, or
 * { ok: false, reason } where reason is 'extension' for a format we do not take
 * at all and 'content' for one whose bytes do not match the name.
 */
export function inspect(filename, bytes) {
  const ext = extensionOf(filename);
  const entry = TYPES.find(t => t.exts.includes(ext));
  if (!entry) return { ok: false, reason: 'extension' };
  if (entry.signature) {
    return entry.signature(bytes) ? { ok: true, type: entry.type } : { ok: false, reason: 'content' };
  }
  if (!isPlainText(bytes)) return { ok: false, reason: 'content' };
  if (entry.prefix && !startsWithText(bytes, entry.prefix)) return { ok: false, reason: 'content' };
  return { ok: true, type: entry.type };
}
