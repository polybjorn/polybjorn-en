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

// Which ownership answers each order type leaves standing.
//
// "Hvem eier designet?" asks where the design came from, so the answer above it
// rules some of them out by contradiction: someone who has just said they have
// nothing but an idea cannot also hold a licensed file, and someone who has a
// finished file does not have "no design yet". The dropdown is a popup, closed
// until it is opened, so every answer that cannot be true is a line to read and
// dismiss on the one question here with legal weight.
//
// The rule is contradiction, not likelihood. An option stays unless the answer
// above makes it false, which is why each list is longer than the obvious one:
// a physical part to copy is most often a scan, but it can equally be your own
// part whose file is lost, or someone else's with their blessing - and those
// are the answers that decide whether it can be printed at all. Filter by what
// is likely instead and the honest answer is the one that goes missing,
// invisibly, from a list nobody can see is short.
//
// What each list drops:
// - file: the file exists, so only "no design yet" contradicts it. A scan
//   someone already did is a real provenance for a finished file.
// - sketch: a licensed file and a scan both name an artefact this answer says
//   is not there. Measurements taken off a part somebody else made are the
//   same case as the part itself, so that answer stays here too.
// - physical: there is a part, so "no design yet" is false, and a purchased
//   file is not what is in the room. A scan goes with them: someone who had
//   one would have answered "a finished 3D file" a question earlier - the scan
//   is the work being asked for, not something they arrive with. What is left
//   is who designed the original, which is the whole of what this question
//   needs to know: usually somebody else, occasionally them, rarely somebody
//   else who said yes.
// - idea: there is no design, so one answer is the only one that can be true -
//   and one answer left is not a question. A dropdown holding a single option
//   is a click that cannot be wrong, and the answer it would record is the one
//   just given a question higher up, which the brief carries directly above it.
//   So the form hides the row in that case rather than offering a list of one
//   (IntakeForm.astro), and records nothing: any list of one is treated this
//   way, so a later edit to the lists above needs no second decision here.
//
// Nothing here answers on anyone's behalf: it removes only answers the visitor
// has already contradicted, and the field stays blank until it is picked (the
// copyright field below says why that matters). Without script nothing is
// filtered and the native dropdown lists all five - the behaviour up to now,
// which is not wrong, only longer.
export const COPYRIGHT_BY_ORDER_TYPE = {
  file: ['own', 'licensed', 'scan', 'permitted'],
  sketch: ['own', 'owned-part', 'permitted', 'none-yet'],
  physical: ['own', 'owned-part', 'permitted'],
  idea: ['none-yet'],
};

// The order here is the order the enquiry is read in. The worker walks this
// array to build the brief it stores for pi-rovar (workers/enquiry/index.js),
// so this list and the form's own layout are two halves of one contract: the
// rows in IntakeForm.astro decide what a visitor sees, and this decides what
// arrives in the mail. When they disagree, the brief lists answers in an order
// nobody filled them in, which is the state this was in until #22 - size after
// ownership, quantity in with the file upload, and the design questions split
// across the middle.
//
// So: move a question in the form, move it here. Read the rows in
// IntakeForm.astro left to right and top to bottom and this list should match
// them exactly. Nothing enforces it - there is no test that can tell a
// deliberate order from a drifted one - so it is a thing to check by eye when
// the form changes.
export const BASE_FIELDS = [
  {
    // The help said "a short label, if you have one" - one half of that is what
    // an example shows by being one, and the other half is true of every
    // question here that is not marked otherwise.
    //
    // The example is the first concrete thing anyone reads on this form, so it
    // sets what the form appears to be for - and no single word does that on
    // its own. A set of them, one picked per visit (IntakeForm.astro), says the
    // range of work this is for rather than nominating one part as typical.
    //
    // They are all the same kind of answer: a functional part with a reason to
    // be printed rather than bought. An earlier single example, "Hyllebrakett",
    // made the whole page sound like it was asking about the cheapest thing a
    // printer can make.
    //
    // The markup renders the first of these, so a visitor without script still
    // gets one. Keep that in mind when reordering: the first is the default.
    id: 'projectName',
    type: 'text',
    required: false,
    label: { en: 'Project or part name', no: 'Prosjekt- eller delnavn' },
    placeholders: {
      en: ['Sensor housing', 'Assembly jig', 'Impeller', 'Gearbox cover', 'Cable duct', 'Measuring jig'],
      no: ['Sensorhus', 'Monteringsjigg', 'Pumpehjul', 'Girkassedeksel', 'Kabelkanal', 'Målejigg'],
    },
  },
  {
    // The prompts are in the box. The one thing lost by moving them there,
    // which is worth knowing before moving them back: a placeholder goes at the
    // first keystroke, and on this field it is a list of what to cover rather
    // than an example of how to answer - so it disappears exactly when someone
    // starts working through it. Everywhere else on the form the hint is an
    // example, and an example has done its job by the time you are typing.
    id: 'description',
    type: 'textarea',
    required: true,
    label: { en: 'Describe the part and what it is for', no: 'Beskriv delen og hva den skal brukes til' },
    placeholder: {
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
    // Hidden, not removed: the field's own button says "Velg filer" two lines
    // below, so the heading above it was the same instruction twice. The text
    // still names the question in the receipt and for a screen reader.
    labelHidden: true,
    label: { en: 'Attach files', no: 'Legg ved filer' },
    help: {
      en: 'Photos, sketches or 3D files. 10 MB per file.',
      no: 'Bilder, skisser eller 3D-filer. 10 MB per fil.',
    },
  },
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
    // Not required, and deliberately so. This is the one question on the form
    // with legal weight, which is exactly why nothing here may answer it on a
    // customer's behalf: an assumed "no design yet" recorded against someone
    // who actually holds a licensed file is a false statement on the question
    // where being wrong costs the most. Left blank it arrives blank, which is
    // honest, and the answer gets asked for directly - the same reasoning that
    // removed the requirement grid.
    //
    // Which of the five are offered depends on the order type above - see
    // COPYRIGHT_BY_ORDER_TYPE. That removes answers, it never picks one, so
    // the paragraph above still holds.
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
      // The answer someone holding a broken part actually has, and the one
      // this list went without: they own the thing, somebody else designed it,
      // and nobody asked anyone's permission. Without it that enquiry either
      // skips the question or picks something untrue - on the one question here
      // where being wrong costs the most - and skipping looks the same as not
      // reading it.
      //
      // Named for the fact, not for the permission. "Someone else's design - no
      // permission" invites a lie by making the honest answer sound like an
      // admission; whether it matters is a conversation (own use, a design
      // right long expired, a shape that is purely functional), and that
      // conversation starts from what is true.
      { value: 'owned-part', en: 'A part I own, designed by someone else', no: 'En del jeg eier, designet av andre' },
      { value: 'permitted', en: "Someone else's design - shared with permission", no: 'Andres design - delt med tillatelse' },
      { value: 'none-yet', en: 'No design yet - starting from a description', no: 'Ikke noe design ennå - starter fra en beskrivelse' },
    ],
  },
  {
    // Same move as materialName below: the examples go in the box. The help
    // said three things - state a unit, either unit is fine, a guess is fine -
    // and a filled-in example says the first two on its own. The third is
    // already in the label, which says "approximate".
    //
    // The axes are in the box, standing at the right-hand end of it, which is
    // why the label no longer carries them. They were in the label because a
    // placeholder would have taken them away at the first keystroke - which is
    // exactly when knowing which number is which starts to matter. A note that
    // stays put has neither problem, and it leaves the label as two words.
    id: 'size',
    type: 'text',
    required: false,
    label: { en: 'Approximate size', no: 'Omtrentlig størrelse' },
    placeholder: { en: '120 x 80 x 40 mm', no: '120 x 80 x 40 mm' },
    boxNote: { en: 'L x W x H', no: 'L x B x H' },
  },
  {
    // Optional since the printed-or-model question went: with nothing left to
    // say "this one only wants the file", a required quantity would stop that
    // enquiry on a question that does not apply to it.
    // The help existed to say a range is allowed. An example that is a range
    // says the same thing in four characters.
    id: 'quantity',
    type: 'text',
    required: false,
    label: { en: 'How many?', no: 'Hvor mange?' },
    placeholder: { en: '5, or 5 to 10', no: '5, eller 5 til 10' },
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
    // No examples at all here, unlike ORDER_TYPES. Every option went through a
    // stage of carrying a line of grey text under it, and at twelve options
    // that was the shape of the whole question: a list you read twice. Each
    // label says its own thing instead, which cost a word or two in four of
    // them - "Brannhemmende" rather than "Brann", the requirement instead of
    // the hazard, is the pattern.
    //
    // The rule that fell out of it: if an option needs a note to be understood,
    // the note belongs in the label. An example earns its place where the
    // answer is a judgement rather than a word (ORDER_TYPES' "Bare en idé",
    // where the example says what follows from picking it).
    //
    // The question asks what matters rather than what the part must withstand.
    // It was "does it need to handle any of these?", which worked while every
    // option was a thing to survive - but a part that touches food or has to
    // insulate is not withstanding anything, and those requirements rule
    // materials in and out as hard as heat does. The labels are noun phrases
    // under either question, so they did not have to change.
    //
    // Ordered in pairs, because the list runs in two columns and fills left to
    // right: wet and weather, then temperature, then chemical and fire, then
    // the two mechanical pairs, then the two that are neither. A single column
    // on a narrow screen reads in the same order.
    id: 'materialProperties',
    type: 'checkboxGroup',
    required: false,
    // Six plain options on the left, the six named ones on the right. See
    // .option-groups in IntakeField.astro - a question with no advanced options
    // gets one full-width list and needs no flag for it.
    // The six below the fold. Half of these questions only come up in specific
    // work, and a requirement nobody has is still a line everybody reads.
    advancedLabel: { en: 'Special requirements', no: 'Spesielle krav' },
    label: { en: 'Important for the part?', no: 'Viktig for delen?' },
    options: [
      {
        // "Hele året" carries the frost, which is the point of the label: a
        // year outdoors in this country is sun and frost both, so nobody goes
        // hunting for a separate tick for the cold. It also fixes the grammar -
        // "Utendørs, sol og frost" joined an adverb to two nouns with a comma
        // and read as a translation, which it was.
        value: 'outdoor',
        label: { en: 'Outdoors all year', no: 'Utendørs hele året' },
      },
      {
        value: 'water',
        label: { en: 'Water or damp', no: 'Vann eller fukt' },
      },
      {
        // "Varme" on its own got ticked for anything that ever felt warm. The
        // adjective narrows it and the number settles it: 60 degrees is where
        // PLA starts to let go, so it is the line that decides whether this is
        // a material question at all. A qualifier rather than an example - it
        // measures the label instead of illustrating it, and it is short enough
        // to sit on the same line.
        value: 'heat',
        label: { en: 'High heat', no: 'Høy varme' },
        qualifier: { en: '> 60 °C', no: '> 60 °C' },
      },
      {
        // The property, in Norwegian word order. "Belastning uten å henge" was
        // English phrasing carried across word by word, and it described an
        // outcome where the labels around it name a property: Brannhemmende,
        // Antistatisk, and now this.
        value: 'rigid',
        label: { en: 'Stiff under load', no: 'Stiv under belastning' },
      },
      {
        // The material, not the motion. "Being bent on purpose" was meant to
        // ask for TPU and instead caught anything that moves: a hinge can be
        // rigid parts on a pin, which is a question about clearances and has
        // nothing to do with a flexible filament. Naming what the material has
        // to be cannot be read the other way.
        value: 'flex',
        label: { en: 'Soft or rubbery', no: 'Mykt eller gummiaktig' },
      },
      {
        // "Slitasje" is the word for wear; "daglig bruk" was saying how often
        // rather than what happens to the part.
        value: 'wear',
        label: { en: 'Wear and impact', no: 'Slitasje og støt' },
      },
      {
        // Named for the case that is left once "utendørs hele året" has taken
        // the obvious one - cold indoors. "Kulde" beside that option was the
        // same tick twice over.
        //
        // "Kjølerom", not "kjølelager": a lager is a building, not a condition
        // a part sits in.
        advanced: true,
        value: 'cold',
        label: { en: 'Freezer or cold room', no: 'Fryser eller kjølerom' },
      },
      {
        // "eller olje" in the label, not "olje, drivstoff" in small grey next
        // to it. The qualifier slot is for a measurement or a standard - a
        // number you either have or do not - and the two options that use it
        // read that way. A suggestion in the same grey read as a different kind
        // of thing wearing the same clothes.
        //
        // Oil is the word worth the two syllables: someone whose part sits in
        // engine oil or grease does not necessarily file that under chemicals,
        // where anyone thinking of fuel or solvent already does.
        advanced: true,
        value: 'chemicals',
        label: { en: 'Chemicals or oil', no: 'Kjemikalier eller olje' },
      },
      {
        // The requirement, not the hazard. "Brann" read as surviving a fire,
        // which is not what anyone means by it, and needed a note to say so.
        //
        // The qualifier is the standard a flame-retardant filament is sold
        // against: UL 94 rates HB / V-2 / V-1 / V-0, and V-0 is what anyone
        // with a real requirement here is asking for. It tells them the right
        // thing is being asked, and tells everyone else there is a standard to
        // have an answer about.
        advanced: true,
        value: 'fire',
        label: { en: 'Fire retardant', no: 'Brannhemmende' },
        qualifier: { en: 'UL94 V-0', no: 'UL94 V-0' },
      },
      {
        advanced: true,
        value: 'friction',
        label: { en: 'Rubbing against other parts', no: 'Friksjon mot andre deler' },
      },
      {
        advanced: true,
        value: 'contact',
        label: { en: 'Food or skin contact', no: 'Mat- eller hudkontakt' },
      },
      {
        // One end of the scale, not both. The label named insulating and
        // conducting together while the qualifier named the band between them:
        // surface resistivity runs from conductive under 10⁴ Ω, through
        // static-dissipative at 10⁶-10⁹, to insulating above 10¹². A range
        // cannot stand for two opposite ends.
        //
        // Insulating is the half that went, because it is what plastic does
        // anyway: asking whether a part must insulate is asking whether it must
        // go on being what it already is, and nearly every filament answers
        // yes. Draining static is the half that needs a material chosen for it,
        // and 10⁶-10⁹ Ω is exactly that material's band.
        //
        // A part that has to insulate to a stated dielectric strength is a real
        // requirement, and a rarer one: that arrives as kV/mm in the
        // description, from someone who knows to say so.
        advanced: true,
        value: 'electrical',
        // "Antistatisk", the way it is actually written. "Lede vekk statisk"
        // was English phrasing in Norwegian words: "statisk" is not a noun on
        // its own there, it wants "statisk elektrisitet" after it, and that
        // makes the label half again as long as any other. The adjective is
        // also the same shape as "Brannhemmende" two rows up - the requirement
        // named in one word - and the ohms say which end of the scale it means.
        label: { en: 'Antistatic', no: 'Antistatisk' },
        qualifier: { en: '10⁶-10⁹ Ω', no: '10⁶-10⁹ Ω' },
      },
    ],
  },
  {
    // A noun, not a question. "Already know the material?" was a yes/no
    // question with a text box under it, which got answered "yes" - and it
    // needed two sentences of help to undo that, which is a lot of text for a
    // field sharing a row with another.
    //
    // The examples are in the box rather than under it. Half a row is not wide
    // enough for a line of help, so it wrapped, and a wrapped hint under a
    // one-word label was most of the height of the field. A placeholder can
    // carry them because they are only examples: the label says what the field
    // is, and nothing here is needed to answer it.
    id: 'materialName',
    type: 'text',
    required: false,
    label: { en: 'Material', no: 'Materiale' },
    placeholder: { en: 'PETG, ASA, TPU', no: 'PETG, ASA, TPU' },
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
    // "A date, or no fixed date is fine" was two facts: what to type, and that
    // you do not have to have one. The example carries the first and the label
    // carries the second, which is better placed there anyway - it is read
    // before the field rather than after it. This one shares a row with the
    // budget, so a line of help under it wrapped.
    id: 'targetDate',
    type: 'text',
    required: false,
    label: { en: 'Deadline, if you have one', no: 'Frist, hvis du har en' },
    placeholder: { en: '15 October', no: '15. oktober' },
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
    id: 'contactName',
    type: 'text',
    required: true,
    autocomplete: 'name',
    // required counts a space as an answer, so " " got through. Nothing beyond
    // that is checkable: a rule strict enough to reject "Bj" also rejects Bo
    // and Li, and this is a name someone is telling me on purpose.
    pattern: '.*\\S.*',
    label: { en: 'Name', no: 'Navn' },
  },
  {
    // Signal used to be folded into the phone field ("Phone or Signal"),
    // which read as if it were one contact method when it's really two -
    // and it made the section intro's "phone or email, at least one" claim
    // technically inaccurate (Signal wasn't actually one of the two named
    // options). Its own field also drops the need to pattern-match "does
    // this look like a phone number" to decide whether to reveal a
    // separate "prefer Signal" checkbox.
    // An example of the shape, now that the page refuses one that is not a
    // number - better to show it than to refuse it afterwards.
    id: 'contactPhone',
    type: 'text',
    inputType: 'tel',
    autocomplete: 'tel',
    required: false,
    placeholder: { en: '+47 123 45 678', no: '+47 123 45 678' },
    label: { en: 'Phone', no: 'Telefon' },
  },
  {
    id: 'contactCompany',
    type: 'text',
    required: false,
    autocomplete: 'organization',
    label: { en: 'Company', no: 'Firma' },
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
    // The old label was just "Location", which got read as "street address".
    // "Town or area" carries that, and a town in the box carries it again - so
    // the help, which said what the answer was for, is gone. What it is for is
    // the one thing lost: the reason anyone is being asked where they live.
    // Say so directly if that turns out to matter.
    id: 'contactLocation',
    type: 'text',
    required: false,
    autocomplete: 'address-level2',
    // Haugesund, not a town picked at random: an example here is the one place
    // name on the page, so it may as well be the one that says where the work
    // is done from - which is also what makes "for frakt eller henting" obvious
    // without the sentence that used to say it.
    placeholder: { en: 'Haugesund', no: 'Haugesund' },
    label: { en: 'Town or area', no: 'Sted eller område' },
  },
  {
    // "eller lenke" rather than "eller signal.me-lenke": this field is half a
    // row wide, and a placeholder that does not fit is cut off with nothing to
    // say it was. A username is the case that needs showing anyway - the shape
    // with the digits on the end is not something anyone guesses - and if what
    // gets typed is neither, the refusal names all three forms.
    id: 'contactSignal',
    type: 'text',
    required: false,
    placeholder: { en: 'name.42 or a link', no: 'navn.42 eller lenke' },
    label: { en: 'Signal', no: 'Signal' },
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
    //
    // No help text. It said "otherwise I may show the work, for example as a
    // project on this site", which stated a default nobody had agreed to: it
    // reads as a licence taken by an unticked box, and it is the tick that is
    // the request, not the blank. Saying less leaves the question where it
    // belongs - a customer asking for confidentiality gets it, and anything I
    // want to publish is asked for separately, when there is something to show
    // and someone to ask.
    id: 'confidential',
    type: 'checkbox',
    required: false,
    label: {
      en: 'Treat this enquiry as confidential',
      no: 'Behandle henvendelsen konfidensielt',
    },
  },
];
