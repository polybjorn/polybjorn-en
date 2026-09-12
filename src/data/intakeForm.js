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

// "What do you need?" - a printed part, a 3D model, or both - used to open the
// form ahead of this one, and it is gone. Deciding whether material, colour and
// quantity applied was the only thing it did that the description could not:
// everything else it recorded, the description says better, and a print is the
// ordinary case. Those three fields are shown to everyone now, quantity among
// them optional, so a model-only enquiry skips them instead of the rest of the
// form being gated on a question that does not fit it.
//
// The two never sat well together anyway: "Hva trenger du?" and "Hva skal du
// bestille?" are near synonyms in Norwegian, so two questions that mean quite
// different things read as one asked twice.
//
// This one lives in the Specification section, with size, material and
// ownership - the other questions about the design itself - and it is named for
// what it asks.
//
// The question asks what exists, not how far along it is. "How finished is the
// design?" put a degree in the question and got a bare "Finished" back, which
// read as the question echoed rather than answered - and left one option a
// state while the other was a thing. Both answers are nouns now, and both
// complete the question without repeating a word of it.
//
// Order type used to have a third option ("production run" / "business
// order") meant to gate the now-removed requirement grid. That was wrong: a
// business ordering one already-finished part and a private customer with a
// strict spec both exist, so "is the design settled" and "are there formal
// specs to hit" were never the same fact. A third point on this one ("a
// problem to solve") was tried and
// dropped too - it never held up as genuinely distinct from "an idea to
// test," just a fuzzier version of it.
// Order matters once these sit in two columns (see .option-list-inline): the
// grid fills left to right, so the left column ends up holding the two answers
// that already have a shape - a file, a part to copy - and the right column the
// two that do not, a drawing and an idea. Stacked on a narrow screen the same
// order reads from most finished to least.
export const ORDER_TYPES = [
  {
    // Every answer here names a thing you can point at - a file, a drawing, an
    // idea, a part - because the one option that was always obviously distinct
    // ("a physical part to copy") is the one that does. "A finished design"
    // and the rest named positions on a scale of design maturity instead, and
    // three points on a scale read as three shades of the same answer.
    //
    // No example: "a finished 3D file" is what it is. The old gloss ("you know
    // exactly what it should look like") only existed back when the question
    // was "what are you ordering?", which did not say what was being asked.
    value: 'file',
    label: { en: 'A finished 3D file', no: 'En ferdig 3D-fil' },
  },
  {
    // No example: the label is the whole answer. Someone with a drawing knows
    // what they want and needs it drawn up, which is different work from
    // testing an idea - that is why this is its own option and not a softer
    // wording of the one below.
    value: 'sketch',
    label: { en: 'A sketch or measurements', no: 'En skisse eller mål' },
  },
  {
    // Selectable even though the scanner is not here yet. A greyed-out option
    // says "no" and records nothing; this one says the same thing in a line of
    // text and still puts the enquiry in front of me, so it answers how many
    // people actually want it. Every enquiry is a conversation anyway - an
    // answer that has to wait costs a sentence in the reply.
    // 'physical', not 'scan' - the ownership question below already submits a
    // 'scan' value, and two different answers reading the same in the enquiry
    // would be a puzzle to nobody's benefit.
    value: 'physical',
    label: { en: 'A physical part to copy', no: 'En fysisk del jeg vil kopiere' },
    example: {
      en: '3D scanning is coming soon.',
      no: '3D-skanning kommer snart.',
    },
  },
  {
    value: 'idea',
    label: { en: 'Just an idea', no: 'Bare en idé' },
    // This one keeps its example: that it takes iterations is not something
    // the label or the question says.
    example: {
      en: "Expect a few rounds before it's right.",
      no: 'Regn med noen runder før den sitter.',
    },
  },
];

export const BASE_FIELDS = [
  {
    id: 'orderType',
    type: 'radio',
    required: true,
    // Four short answers, so they pair into two columns instead of running
    // down the page - see .option-list-inline in IntakeField.astro. Only this
    // question: materialProperties below is five options with an example each,
    // which is a list to read down.
    inlineOptions: true,
    label: { en: 'What do you have so far?', no: 'Hva har du så langt?' },
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
    // No accept filter. It used to list the same formats the help text named,
    // and narrowing the picker to them turned a preference into a rule: plenty
    // of other formats can be opened at this end, and someone whose CAD tool
    // exports .3mf or .obj would have found the file greyed out with no
    // explanation. What can actually be accepted is a judgement made after
    // reading the enquiry, not something a file picker should decide.
    //
    // This is a front-end affordance either way - accept never enforced
    // anything, since a determined upload can ignore it. Real validation of
    // what arrives belongs server-side (nixfleet#87).
    multiple: true,
    label: { en: 'Attach files', no: 'Legg ved filer' },
    help: {
      en: 'Photos, sketches or 3D files. 10 MB per file.',
      no: 'Bilder, skisser eller 3D-filer. 10 MB per fil.',
    },
  },
  {
    // Optional since the printed-or-model question went: with nothing left to
    // say "this one only wants the file", a required quantity would stop that
    // enquiry on a question that does not apply to it.
    id: 'quantity',
    type: 'text',
    required: false,
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
    // Not required, and deliberately so. This is the one question on the form
    // with legal weight, which is exactly why nothing here may answer it on a
    // customer's behalf: an assumed "no design yet" recorded against someone
    // who actually holds a licensed file is a false statement on the question
    // where being wrong costs the most. Left blank it arrives blank, which is
    // honest, and the answer gets asked for directly - the same reasoning that
    // removed the requirement grid.
    id: 'copyright',
    type: 'select',
    required: false,
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
    // A noun, not a question. "Already know the material?" was a yes/no
    // question with a text box under it, which got answered "yes" - and it
    // needed two sentences of help to undo that, which is a lot of text for a
    // field sharing a row with another.
    id: 'materialName',
    type: 'text',
    required: false,
    label: { en: 'Material', no: 'Materiale' },
    help: {
      en: 'If you have one in mind - PETG, ASA, TPU.',
      no: 'Hvis du har et i tankene - PETG, ASA, TPU.',
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
    // Paired on a row with the material field, so both labels have half the
    // width they had. "preference"/"-preferanse" was the half that could go:
    // nothing on this form is an instruction.
    label: { en: 'Colour and finish', no: 'Farge og overflate' },
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
      no: 'Ellers kan jeg vise fram arbeidet, for eksempel som et prosjekt på denne nettsiden.',
    },
  },
  {
    id: 'contactLocation',
    type: 'text',
    required: false,
    autocomplete: 'address-level2',
    label: { en: 'Town or area', no: 'Sted eller område' },
    // The old label was just "Location", which got read as "street address".
    // "Town or area" carries that now, so the help only has to say what it is
    // for.
    help: {
      en: 'Roughly where you are, for postage or handover.',
      no: 'Omtrent hvor du er, for frakt eller henting.',
    },
  },
];
