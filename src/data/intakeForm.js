// Client intake form for the 3D printing page (issue #2).
//
// BASE_FIELDS apply to every enquiry. EXTENDED_FIELDS are the paper sheet's
// KRAV grid (Addidé ordrebeskrivelse v1.0, page 2) and only appear when the
// order type is one that needs fixed specifications - a business ordering a
// production part, not someone who wants a single bracket. Material, colour
// and size live in BASE_FIELDS already, so the 12 KRAV rows are split 3/9
// between the two lists rather than repeated.
//
// The grid asks for the requested value only (the "request" column). The
// achieved column from the paper sheet is job-note bookkeeping, not
// client-facing, and stays out of this form - as does OPPSUMMERING
// (machine, hours, material cost, price tier).

export const ORDER_TYPES = [
  {
    value: 'one-off',
    en: 'A single part, replacement, or small batch (a handful of the same part)',
    no: 'En enkelt del, erstatningsdel, eller en liten batch (noen få like deler)',
  },
  {
    value: 'prototype',
    en: 'A prototype or concept model, to test or iterate on',
    no: 'En prototype eller konseptmodell, til testing eller videreutvikling',
  },
  {
    value: 'production',
    en: 'A production order with fixed specifications (material, tolerances, quantities)',
    no: 'En produksjonsordre med faste spesifikasjoner (materiale, toleranser, antall)',
  },
];

// Order types that pull in the full requirement grid.
export const FULL_SPEC_ORDER_TYPES = ['production'];

export const BASE_FIELDS = [
  {
    id: 'orderType',
    type: 'radio',
    required: true,
    label: { en: 'What are you ordering?', no: 'Hva skal du bestille?' },
    options: ORDER_TYPES,
  },
  {
    id: 'projectName',
    type: 'text',
    required: false,
    label: { en: 'Project or part name', no: 'Prosjekt- eller delnavn' },
    help: {
      en: 'A short label for the enquiry, if you have one.',
      no: 'En kort tittel på henvendelsen, hvis du har en.',
    },
  },
  {
    id: 'description',
    type: 'textarea',
    required: true,
    label: { en: 'Describe the part and what it is for', no: 'Beskriv delen og hva den skal brukes til' },
    help: {
      en: 'The problem it solves, where it fits, and anything about the setup around it.',
      no: 'Problemet den løser, hvor den skal sitte, og eventuelt annet rundt bruken.',
    },
  },
  {
    id: 'existingFiles',
    type: 'checkboxGroup',
    required: false,
    label: { en: 'Do you already have any of these?', no: 'Har du allerede noe av dette?' },
    options: [
      { value: 'step-stl', en: 'A STEP or STL file', no: 'En STEP- eller STL-fil' },
      { value: 'sketch', en: 'A sketch or drawing', no: 'En skisse eller tegning' },
      { value: 'photo', en: 'A photo', no: 'Et bilde' },
      { value: 'sample', en: 'A physical sample', no: 'En fysisk prøve' },
      { value: 'none', en: 'Nothing yet - starting from a description', no: 'Ingenting ennå - starter fra en beskrivelse' },
    ],
  },
  {
    id: 'fileUpload',
    type: 'file',
    required: false,
    accept: '.jpg,.jpeg,.png,.heic,.pdf,.stp,.step,.stl,image/jpeg,image/png,image/heic,application/pdf,model/step,model/stl',
    multiple: true,
    label: { en: 'Attach files', no: 'Legg ved filer' },
    help: {
      en: 'Photos, sketches, or a 3D model file (STEP or STL) if you have one. jpg, png, heic, pdf, step or stl, about 10 MB per file. Optional.',
      no: 'Bilder, skisser, eller en 3D-modellfil (STEP eller STL) hvis du har en. jpg, png, heic, pdf, step eller stl, ca. 10 MB per fil. Valgfritt.',
    },
  },
  {
    id: 'quantity',
    type: 'text',
    required: true,
    label: { en: 'How many do you need?', no: 'Hvor mange trenger du?' },
  },
  {
    id: 'targetDate',
    type: 'text',
    required: false,
    label: { en: 'When do you need the part by?', no: 'Når trenger du delen?' },
    help: { en: 'A date, or "no fixed date" is fine.', no: 'En dato, eller "ingen fast frist" går fint.' },
  },
  {
    id: 'replyUrgency',
    type: 'select',
    required: true,
    label: { en: 'How urgent is a reply?', no: 'Hvor raskt trenger du svar?' },
    help: {
      en: 'Separate from the part deadline above - how soon you want to hear back from me.',
      no: 'Uavhengig av fristen over - hvor raskt du ønsker tilbakemelding fra meg.',
    },
    options: [
      { value: 'exploring', en: 'Just exploring for now', no: 'Utforsker bare foreløpig' },
      { value: 'this-week', en: 'Would like a reply this week', no: 'Ønsker svar denne uken' },
      { value: 'urgent', en: 'Urgent - please get back to me as soon as you can', no: 'Haster - ta kontakt så snart du kan' },
    ],
  },
  {
    id: 'budget',
    type: 'select',
    required: false,
    label: { en: 'Budget frame', no: 'Budsjettramme' },
    options: [
      { value: 'not-sure', en: 'Not sure yet', no: 'Ikke sikker ennå' },
      { value: 'under-1000', en: 'Under 1 000 NOK', no: 'Under 1 000 kr' },
      { value: '1000-5000', en: '1 000-5 000 NOK', no: '1 000-5 000 kr' },
      { value: '5000-20000', en: '5 000-20 000 NOK', no: '5 000-20 000 kr' },
      { value: 'over-20000', en: 'Over 20 000 NOK', no: 'Over 20 000 kr' },
      { value: 'discuss', en: "I'd rather discuss it directly", no: 'Vil heller diskutere det direkte' },
    ],
  },
  {
    id: 'copyright',
    type: 'select',
    required: true,
    label: { en: 'Who owns the design?', no: 'Hvem eier designet?' },
    options: [
      { value: 'own', en: "It's my own design", no: 'Det er mitt eget design' },
      { value: 'licensed', en: 'A licensed or purchased file', no: 'En lisensiert eller kjøpt fil' },
      { value: 'scan', en: 'A scan of an existing part', no: 'En skann av en eksisterende del' },
      { value: 'permitted', en: "Someone else's design - I have permission to share it", no: 'Andres design - jeg har lov til å dele det' },
      { value: 'none-yet', en: "There's no design yet - starting from a description", no: 'Det finnes ikke noe design ennå - starter fra en beskrivelse' },
    ],
  },
  {
    id: 'size',
    type: 'text',
    required: false,
    label: { en: 'Approximate size (L x W x H)', no: 'Omtrentlig størrelse (L x B x H)' },
  },
  {
    id: 'material',
    type: 'select',
    required: false,
    label: { en: 'Material preference', no: 'Materialpreferanse' },
    options: [
      { value: 'not-sure', en: "Not sure - I'd like a recommendation", no: 'Ikke sikker - ønsker en anbefaling' },
      { value: 'pla', en: 'PLA', no: 'PLA' },
      { value: 'petg', en: 'PETG', no: 'PETG' },
      { value: 'abs-asa', en: 'ABS / ASA', no: 'ABS / ASA' },
      { value: 'tpu', en: 'TPU (flexible)', no: 'TPU (fleksibel)' },
      { value: 'other', en: 'Other (describe below)', no: 'Annet (beskriv under)' },
    ],
  },
  {
    id: 'colorFinish',
    type: 'text',
    required: false,
    label: { en: 'Colour and finish preference', no: 'Farge- og overflatepreferanse' },
  },
  {
    id: 'contactName',
    type: 'text',
    required: true,
    label: { en: 'Name', no: 'Navn' },
  },
  {
    id: 'contactCompany',
    type: 'text',
    required: false,
    label: { en: 'Company', no: 'Firma' },
  },
  {
    id: 'contactPhone',
    type: 'text',
    required: false,
    label: { en: 'Phone or Signal', no: 'Telefon eller Signal' },
    help: {
      en: 'A phone number, or your Signal username or signal.me link.',
      no: 'Et telefonnummer, eller Signal-brukernavnet eller signal.me-lenken din.',
    },
  },
  {
    id: 'contactPreferSignal',
    type: 'checkbox',
    required: false,
    label: {
      en: "I'd rather be reached there on Signal",
      no: 'Jeg vil helst bli kontaktet der på Signal',
    },
  },
  {
    id: 'contactEmail',
    type: 'text',
    required: false,
    label: { en: 'Email', no: 'E-post' },
  },
  {
    id: 'contactLocation',
    type: 'text',
    required: false,
    label: { en: 'Location', no: 'Sted' },
  },
];

// The requirement grid: request column only, shown for FULL_SPEC_ORDER_TYPES.
export const EXTENDED_FIELDS = [
  {
    id: 'wallThickness',
    type: 'text',
    required: false,
    label: { en: 'Minimum wall thickness', no: 'Minste godstykkelse' },
  },
  {
    id: 'temperatureRange',
    type: 'text',
    required: false,
    label: { en: 'Temperature range the part must withstand', no: 'Temperaturområde delen må tåle' },
  },
  {
    id: 'humidity',
    type: 'select',
    required: false,
    label: { en: 'Humidity or moisture exposure', no: 'Fukt- eller luftfuktighetseksponering' },
    options: [
      { value: 'none', en: 'None expected', no: 'Ingen forventet' },
      { value: 'occasional', en: 'Occasional damp or splashes', no: 'Fukt eller sprut av og til' },
      { value: 'constant', en: 'Constant high humidity', no: 'Konstant høy luftfuktighet' },
      { value: 'submerged', en: 'Submerged or in standing water', no: 'Nedsenket eller i stillestående vann' },
    ],
  },
  {
    id: 'uvOutdoor',
    type: 'select',
    required: false,
    label: { en: 'Outdoors or in direct sunlight?', no: 'Utendørs eller i direkte sollys?' },
    options: [
      { value: 'no', en: 'No', no: 'Nei' },
      { value: 'partial', en: 'Partial or occasional', no: 'Delvis eller av og til' },
      { value: 'yes', en: 'Yes, most of the time', no: 'Ja, mesteparten av tiden' },
    ],
  },
  {
    id: 'impactResistance',
    type: 'text',
    required: false,
    label: { en: 'Impact resistance needed', no: 'Nødvendig slagfasthet' },
    help: {
      en: 'e.g. light handling, occasional knocks, heavy impact.',
      no: 'f.eks. lett håndtering, av og til støt, kraftige slag.',
    },
  },
  {
    id: 'rigidity',
    type: 'select',
    required: false,
    label: { en: 'Rigid or flexible?', no: 'Stiv eller fleksibel?' },
    options: [
      { value: 'rigid', en: 'Rigid', no: 'Stiv' },
      { value: 'semi-flexible', en: 'Semi-flexible', no: 'Delvis fleksibel' },
      { value: 'flexible', en: 'Flexible', no: 'Fleksibel' },
    ],
  },
  {
    id: 'tolerance',
    type: 'text',
    required: false,
    label: { en: 'Tolerance or fit requirement', no: 'Toleranse- eller pasningskrav' },
    help: {
      en: 'e.g. must fit into an existing part - describe it.',
      no: 'f.eks. må passe inn i en eksisterende del - beskriv den.',
    },
  },
  {
    id: 'surfaceQuality',
    type: 'select',
    required: false,
    label: { en: 'Surface finish requirement', no: 'Krav til overflate' },
    options: [
      { value: 'standard', en: 'Standard print finish', no: 'Standard printoverflate' },
      { value: 'smooth', en: 'Smoothed or sanded', no: 'Glattet eller pusset' },
      { value: 'paint-ready', no: 'Klar for maling', en: 'Paint-ready' },
    ],
  },
  {
    id: 'weight',
    type: 'text',
    required: false,
    label: { en: 'Weight target or limit', no: 'Vektmål eller -grense' },
  },
];
