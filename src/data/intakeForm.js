// Client intake form for the 3D printing page (issue #2).
//
// The form (IntakeForm.astro) reveals these fields progressively, section by
// section, rather than all at once - see the stage logic there.
//
// The paper client sheet this is based on (Addidé ordrebeskrivelse v1.0) had
// a KRAV grid on page 2 - wall thickness, tolerance, humidity, UV exposure,
// and so on - gated behind a "needs formal spec" checkbox. That grid and its
// gate were cut: for the rare enquiry precise enough to need that level of
// detail, it gets worked out directly (call/email), not through a web form -
// so the grid never actually saved a round of back-and-forth, it was just
// more fields. The free-text description plus a follow-up conversation
// covers it now.

// Order type used to have a third option ("production run" / "business
// order") meant to gate the now-removed requirement grid. That was wrong: a
// business ordering one already-finished part and a private customer with a
// strict spec both exist, so "is the design settled" and "are there formal
// specs to hit" were never the same fact. This is just the design-certainty
// question - DELIVERABLE_TYPES below is the separate printed-vs-model-only
// question. A third point on this one ("a problem to solve") was tried and
// dropped too - it never held up as genuinely distinct from "an idea to
// test," just a fuzzier version of it.
export const ORDER_TYPES = [
  {
    value: 'one-off',
    label: { en: 'A finished design', no: 'Et ferdig design' },
    example: {
      en: 'You already know exactly what it should look like.',
      no: 'Du vet allerede nøyaktig hvordan den skal se ut.',
    },
  },
  {
    value: 'prototype',
    label: { en: 'An idea to test', no: 'En idé du vil teste' },
    example: {
      en: "You're not sure yet - expect a few rounds before it's right.",
      no: 'Du er ikke sikker ennå - regn med noen runder før den sitter.',
    },
  },
];

// Printed vs. model-only is a separate axis from design certainty above -
// someone with a finished design and someone still testing an idea can each
// want either. It comes first in the form (see IntakeForm.astro) because it
// decides whether print-specific fields below (material, colour/finish,
// quantity) are relevant at all.
//
// Question and labels were cut back together, over three passes, until no word
// appeared twice in the block. The labels began as "Printed - a physical part"
// and "Just the 3D model - I'll print it myself, or don't need it printed",
// which stated the distinction three times: the question named both options,
// each label repeated its own word, then glossed it - and the second one said
// "print" twice by itself. The glosses went, then the "just"/"bare", which the
// question was already supplying and the radio group enforces anyway.
//
// That left the duplication sitting in the question, which still spelled out
// both labels. So the question went neutral and the labels carry the
// distinction on their own. They are nouns because they answer "what", not
// "is it".
//
// One choice, not two ticks. This was briefly a checkbox group where ticking
// the part also ticked the model, to show that a print includes the file -
// but that made everyone decide about the file, including the many who have no
// opinion on it, and a box that ticks itself reads as a glitch rather than as
// generosity. The form only needs one fact here: is anything being printed.
//
// So both are checkboxes, and ticking the part ticks the model and then locks
// it: the bundle is shown, and it is visibly not up for negotiation. An earlier
// version left the model tick undoable, which turned out to be the confusing
// part - not the tick appearing, but not knowing whether you were allowed to
// remove it. Greying it out answers that before it is asked.
//
// The printed option keeps its description. A greyed tick on its own says
// "unavailable" as readily as "included"; the sentence is what makes it the
// second one.
export const DELIVERABLE_TYPES = [
  {
    value: 'printed',
    label: { en: 'A printed part', no: 'Printet del' },
  },
  {
    value: 'model',
    label: { en: 'A 3D model', no: '3D-modell' },
    // Shown only while this option is locked by the one above (see
    // IntakeForm.astro). It is there to explain a greyed tick, and there is no
    // greyed tick to explain while this is a live choice - stating it
    // permanently made it a standing claim about an option it does not
    // describe.
    showWhenLocked: true,
    example: {
      en: 'Included with a printed part.',
      no: 'Følger med en printet del.',
    },
  },
];

// Fields that only make sense when something is actually being printed.
// IntakeForm.astro hides these and disables their inputs for a model-only
// request. Disabling (rather than clearing) is what keeps a model-only
// customer from being gated on `quantity`, which is required on the printed
// path: a disabled control is barred from constraint validation and left out
// of the submitted FormData, while its value survives for anyone who switches
// back to "printed".
export const PRINT_ONLY_FIELD_IDS = ['materialProperties', 'materialName', 'color', 'quantity'];

export const BASE_FIELDS = [
  {
    // A checkbox group with its own "at least one" rule, enforced in
    // IntakeForm.astro - there is no native required for a group of
    // checkboxes the way there is for a radio group.
    id: 'deliverable',
    type: 'checkboxGroup',
    required: true,
    label: { en: 'What do you need?', no: 'Hva trenger du?' },
    options: DELIVERABLE_TYPES,
  },
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
    id: 'fileUpload',
    type: 'file',
    required: false,
    accept: '.jpg,.jpeg,.png,.heic,.pdf,.stp,.step,.stl,image/jpeg,image/png,image/heic,application/pdf,model/step,model/stl',
    multiple: true,
    label: { en: 'Attach files', no: 'Legg ved filer' },
    help: {
      en: 'Photos, a sketch, or a 3D file (STEP or STL). About 10 MB per file. A photo of a physical sample is a good start.',
      no: 'Bilder, en skisse eller en 3D-fil (STEP eller STL). Ca. 10 MB per fil. Har du en fysisk prøve, er et bilde en god start.',
    },
  },
  {
    id: 'quantity',
    type: 'text',
    required: true,
    label: { en: 'How many do you need?', no: 'Hvor mange trenger du?' },
    help: {
      en: 'A number, or a range like "5 to 10" if you are not sure yet.',
      no: 'Et antall, eller et spenn som "5 til 10" hvis du ikke er sikker ennå.',
    },
  },
  {
    id: 'targetDate',
    type: 'text',
    required: false,
    label: { en: 'When do you need the part by?', no: 'Når trenger du delen?' },
    help: { en: 'A date, or "no fixed date" is fine.', no: 'En dato, eller "ingen fast frist" går fint.' },
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
    // Parallel noun-phrase style throughout - these used to mix full
    // sentences ("It's my own design") with bare fragments ("A licensed or
    // purchased file"), which read as inconsistent once all five options
    // are visible together in the dropdown.
    options: [
      { value: 'own', en: 'My own design', no: 'Mitt eget design' },
      { value: 'licensed', en: 'A licensed or purchased file', no: 'En lisensiert eller kjøpt fil' },
      { value: 'scan', en: 'A scan of an existing part', no: 'En skann av en eksisterende del' },
      { value: 'permitted', en: "Someone else's design - shared with permission", no: 'Andres design - delt med tillatelse' },
      { value: 'none-yet', en: 'No design yet - starting from a description', no: 'Ikke noe design ennå - starter fra en beskrivelse' },
    ],
  },
  {
    id: 'size',
    type: 'text',
    required: false,
    label: { en: 'Approximate size (L x W x H)', no: 'Omtrentlig størrelse (L x B x H)' },
    help: {
      en: 'In millimetres or centimetres - say which. A rough guess is fine.',
      no: 'I millimeter eller centimeter - si hvilken. Et grovt anslag går fint.',
    },
  },
  {
    // Properties instead of a named filament - choosing between similar
    // materials (e.g. PETG vs. ASA for outdoor use, or a reinforced CF/GF
    // blend for "rigid") is a judgement call that belongs with whoever's
    // printing it, not the customer. Nothing checked means no special
    // requirements. materialName below is the escape hatch for anyone who
    // already has a specific material in mind, not limited to whichever
    // ones are common enough to list here.
    //
    // Each option carries a concrete example, same pattern as ORDER_TYPES -
    // "heat" alone gives a noob nothing to anchor to, and the flex option
    // needs its example to disambiguate "the material itself should bend"
    // (TPU) from "it occasionally gets bent by accident" (that's toughness,
    // already covered by "wear").
    //
    // Every label reads as a completion of the question ("does it need to
    // handle ... load without sagging?"). Two of them used not to: "Staying
    // rigid under load" and "Needs to flex" were a gerund and a verb phrase
    // sitting next to three noun phrases, and "Needs to flex" did not parse
    // as something the part must *handle* at all.
    id: 'materialProperties',
    type: 'checkboxGroup',
    required: false,
    label: { en: 'Does it need to handle any of these?', no: 'Må den tåle noe av dette?' },
    options: [
      {
        value: 'outdoor',
        label: { en: 'Outdoors or in the sun', no: 'Utendørs eller i sol' },
        example: { en: 'Garden furniture, a car, a boat.', no: 'Hagemøbler, en bil, en båt.' },
      },
      {
        value: 'heat',
        label: { en: 'Heat', no: 'Varme' },
        example: {
          en: 'A stove, an engine bay, hot water - not just warm hands.',
          no: 'En komfyr, motorrom, varmt vann - ikke bare varme hender.',
        },
      },
      {
        value: 'rigid',
        label: { en: 'Load without sagging', no: 'Belastning uten å henge' },
        example: {
          en: "A shelf bracket, a mounting arm - shouldn't sag.",
          no: 'En hyllebrakett, en monteringsarm - skal ikke henge.',
        },
      },
      {
        value: 'flex',
        label: { en: 'Being bent on purpose', no: 'Å bli bøyd med hensikt' },
        example: {
          en: 'Bends by design - a hinge, a strap, a phone case.',
          no: 'Bøyer seg med hensikt - et hengsel, en stropp, et mobildeksel.',
        },
      },
      {
        value: 'wear',
        label: { en: 'Everyday bumps and wear', no: 'Daglig bruk og støt' },
        example: {
          en: 'Gets picked up, knocked, or dropped a lot.',
          no: 'Blir løftet, dyttet eller mistet i bakken ofte.',
        },
      },
    ],
  },
  {
    id: 'materialName',
    type: 'text',
    required: false,
    label: { en: 'Already know the material?', no: 'Vet du allerede hvilket materiale?' },
    // Without an example this reads as a yes/no question with a text box
    // under it, and gets answered "yes".
    help: {
      en: 'Name it if so - PETG, ASA, TPU, and so on. Leave it blank if not.',
      no: 'Skriv det i så fall - PETG, ASA, TPU og så videre. La stå tomt hvis ikke.',
    },
  },
  {
    // Back to "colour and finish" (not colour alone) now that the
    // requirement grid's surfaceQuality field is gone - finish has no
    // other structured home, and leaving it to the free-text description
    // alone would lose it for most enquiries.
    id: 'color',
    type: 'text',
    required: false,
    label: { en: 'Colour and finish preference', no: 'Farge- og overflatepreferanse' },
  },
  {
    id: 'contactName',
    type: 'text',
    required: true,
    autocomplete: 'name',
    label: { en: 'Name', no: 'Navn' },
  },
  {
    id: 'contactCompany',
    type: 'text',
    required: false,
    autocomplete: 'organization',
    label: { en: 'Company', no: 'Firma' },
  },
  {
    // Signal used to be folded into the phone field ("Phone or Signal"),
    // which read as if it were one contact method when it's really two -
    // and it made the section intro's "phone or email, at least one" claim
    // technically inaccurate (Signal wasn't actually one of the two named
    // options). Its own field also drops the need to pattern-match "does
    // this look like a phone number" to decide whether to reveal a
    // separate "prefer Signal" checkbox.
    id: 'contactPhone',
    type: 'text',
    inputType: 'tel',
    autocomplete: 'tel',
    required: false,
    label: { en: 'Phone', no: 'Telefon' },
  },
  {
    id: 'contactSignal',
    type: 'text',
    required: false,
    label: { en: 'Signal', no: 'Signal' },
    help: {
      en: 'Username or signal.me link.',
      no: 'Brukernavn eller signal.me-lenke.',
    },
  },
  {
    id: 'contactEmail',
    type: 'text',
    inputType: 'email',
    autocomplete: 'email',
    required: false,
    label: { en: 'Email', no: 'E-post' },
  },
  {
    // Was a standing sub-header on every enquiry ("Enquiries are treated
    // confidentially"), which promised blanket confidentiality to everyone
    // whether they wanted it or not. Now an opt-in, unticked by default, so
    // the promise is only made where it is asked for.
    //
    // Unticked submits nothing at all, which is how an HTML checkbox works and
    // is the right failure direction here: absent means not confidential,
    // exactly what unticked means. Anything downstream should treat a missing
    // field as "no", never as "unknown".
    id: 'confidential',
    type: 'checkbox',
    required: false,
    label: {
      en: 'Treat this enquiry as confidential',
      no: 'Behandle henvendelsen konfidensielt',
    },
    help: {
      en: 'Otherwise I may show the work, for example as a project on this site.',
      no: 'Ellers kan jeg vise fram arbeidet, for eksempel som et prosjekt på nettsiden.',
    },
  },
  {
    id: 'contactLocation',
    type: 'text',
    required: false,
    autocomplete: 'address-level2',
    label: { en: 'Town or area', no: 'Sted eller område' },
    // "Location" on its own got read as "street address".
    help: {
      en: 'Roughly where you are, for postage or handover. No street address needed.',
      no: 'Omtrent hvor du er, for frakt eller henting. Ingen gateadresse nødvendig.',
    },
  },
];
