/**
 * Fills the enquiry form with a plausible set of answers.
 *
 * Two callers, which is why it is a module rather than a snippet: the dev
 * preview page (src/pages/dev/[view].astro) and the page tests. Both need the
 * form in the same state, and two copies of this would drift the first time a
 * field is renamed - the tests would keep passing against a form the preview no
 * longer fills.
 *
 * It fills and nothing else. Stubbing fetch and submitting are the caller's,
 * because the preview wants a successful send and the tests want several
 * different answers from the endpoint.
 */

const SAMPLE = {
  projectName: 'Sensorbrakett',
  quantity: '25',
  targetDate: 'Ingen fast frist',
  size: '120 x 60 x 20 mm',
  materialName: 'PETG',
  color: 'Sort, matt',
  contactName: 'Kari Nordmann',
  contactCompany: 'Nordmann Mekaniske AS',
  contactLocation: 'Haugesund',
  contactPhone: '+47 900 12 345',
  contactSignal: 'kari.01',
  contactEmail: 'kari@example.com',
};

const DESCRIPTION =
  'Brakett som holder en sensor på plass i et fuktig miljø, montert på en eksisterende ramme av aluminium.';

export function fillSample(doc) {
  const form = doc.getElementById('intake-form');
  if (!form) return false;

  const view = doc.defaultView;
  const fire = (el, type) => el.dispatchEvent(new view.Event(type, { bubbles: true }));

  form.querySelectorAll('textarea').forEach(el => {
    el.value = DESCRIPTION;
    fire(el, 'input');
  });

  form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]').forEach(el => {
    el.value = SAMPLE[el.id] || 'Testverdi';
    fire(el, 'input');
  });

  // Deliberately leaves the selects alone. An untouched dropdown still has its
  // placeholder selected, and that placeholder is not an answer - which is a
  // distinction the receipt got wrong once, so every caller should see a form
  // that still has one in it.
  new Set([...form.querySelectorAll('input[type="radio"]')].map(radio => radio.name)).forEach(name => {
    const radio = form.querySelector(`input[type="radio"][name="${name}"]`);
    radio.checked = true;
    fire(radio, 'change');
  });

  // Two per question, so a checkbox group shows more than one answer and a lone
  // checkbox still gets ticked.
  form.querySelectorAll('[data-field]').forEach(wrapper => {
    [...wrapper.querySelectorAll('input[type="checkbox"]:not([disabled])')]
      .slice(0, 2)
      .forEach(box => {
        box.checked = true;
        fire(box, 'change');
      });
  });

  return true;
}

/**
 * A real File through a real DataTransfer, so the attachment goes through the
 * page's own file handling rather than being drawn to look like it did. jsdom
 * has no DataTransfer, so this is a no-op there and the tests do not rely on it.
 */
export function attachSampleFile(doc) {
  const view = doc.defaultView;
  if (typeof view.DataTransfer !== 'function') return false;
  const transfer = new view.DataTransfer();
  transfer.items.add(new view.File([new Uint8Array(1234567)], 'skisse.png', { type: 'image/png' }));
  const input = doc.getElementById('fileUpload');
  if (!input) return false;
  input.files = transfer.files;
  input.dispatchEvent(new view.Event('change', { bubbles: true }));
  return true;
}

export function selectFirstOption(doc) {
  doc.querySelectorAll('#intake-form select').forEach(el => {
    const option = [...el.options].find(candidate => candidate.value);
    if (!option) return;
    el.value = option.value;
    el.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
  });
}
