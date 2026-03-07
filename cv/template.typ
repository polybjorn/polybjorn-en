// CV Template — Polybjorn
// Usage: typst compile cv/template.typ cv/output/cv-en.pdf --input lang=en --root .
//        typst compile cv/template.typ cv/output/cv-no.pdf --input lang=no --root .

// --- Configuration ---

#let lang = sys.inputs.at("lang", default: "en")
#let data = yaml("../src/data/cv.yaml")
#let contact = yaml("../src/data/contact.yaml")

#let labels = (
  en: (
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    software: "Software Skills",
  ),
  no: (
    experience: "Arbeidserfaring",
    education: "Utdannelse",
    skills: "Ferdigheter",
    software: "Programvare",
  ),
)

#let label = labels.at(lang)

// --- Brand colors ---

#let color-body = rgb("#111111")
#let color-secondary = rgb("#222222")
#let color-heading = rgb("#333333")
#let color-muted = rgb("#8A8F99")
#let color-accent = rgb("#6AAEEE")
#let color-box-bg = rgb("#e8e8ee")
#let section-gap = 16pt

// --- Page setup ---

#set page(
  paper: "a4",
  margin: (top: 15mm, bottom: 15mm, left: 20mm, right: 20mm),
)

#set text(
  font: "Helvetica Neue",
  size: 8.5pt,
  fill: color-body,
)

#set par(
  leading: 0.75em,
  justify: false,
)

// --- Heading styles ---

#show heading.where(level: 1): it => {
  set text(size: 24pt, weight: "bold", fill: color-body)
  block(above: 0pt, below: 2pt, it.body)
}

#show heading.where(level: 2): it => {
  set text(size: 11pt, weight: "bold", fill: color-body)
  block(above: 0pt, below: 6pt, it.body)
}

// --- Helper functions ---

#let experience-entry(title: "", org: "", period: "", desc: none) = {
  block(above: 14pt, below: 0pt, {
    grid(
      columns: (72pt, 1fr),
      gutter: 10pt,
      text(size: 8pt, fill: color-muted, period),
      {
        text(weight: "bold", size: 8.5pt)[#title for #org]
        if desc != none {
          text(fill: color-secondary, size: 8pt, desc)
        }
      },
    )
  })
}

#let education-entry(title: "", org: "", period: "") = {
  block(above: 12pt, below: 0pt, {
    text(size: 8pt, fill: color-muted, period)
    h(6pt)
    text(weight: "bold", size: 8.5pt, org)
    linebreak()
    h(50pt)
    text(size: 8pt, fill: color-secondary, title)
  })
}

#let software-box(category, tools) = {
  block(
    width: 100%,
    fill: color-box-bg,
    radius: 4pt,
    inset: (x: 12pt, y: 8pt),
    above: 6pt,
    {
      align(center, text(weight: "bold", size: 9pt, fill: color-heading, category))
      v(6pt)
      // Icon grid — replace text cells with image() when icons are ready
      let cols = calc.min(tools.len(), 6)
      grid(
        columns: (1fr,) * cols,
        row-gutter: 6pt,
        column-gutter: 4pt,
        ..tools.map(tool => align(center, {
          // Placeholder: icon goes here
          // image("icons/" + tool.replace(" ", "-").lower() + ".svg", width: 16pt)
          text(size: 7.5pt, fill: color-secondary, tool)
        }))
      )
    }
  )
}

// ============================================================
// PAGE 1
// ============================================================

// --- Header: Name + Photo ---

#let personal = contact.personal.at(lang)

#grid(
  columns: (1fr, auto),
  gutter: 16pt,
  {
    heading(level: 1)[Bjørn Andreas Andersen]
    block(above: 12pt, text(size: 9pt, fill: color-secondary, personal.born))
    block(above: 8pt, text(size: 9pt, fill: color-secondary, personal.address))
  },
  box(
    width: 100pt,
    height: 100pt,
    radius: 50pt,
    clip: true,
    image("images/profile-photo.png", width: 100pt, height: 100pt),
  ),
)

// --- Skills + Contact ---

#v(-16pt)
#block(above: 0pt, below: 0pt, grid(
  columns: (1fr, auto),
  gutter: 20pt,
  {
    heading(level: 2)[#label.skills]
    {
      let skills = data.skills.filter(s => s.at("cv", default: true))
      for (i, skill) in skills.enumerate() {
        [· #skill.at(lang)]
        if i < skills.len() - 1 { [\ ] }
      }
    }
  },
  {
    v(34pt)
    align(right, {
      text(size: 9.5pt, contact.phone)
      linebreak()
      text(size: 9.5pt, contact.email)
      linebreak()
      text(size: 9.5pt, contact.website.at(lang))
    })
  },
))

// --- Education ---

#v(section-gap)
== #label.education

#for item in data.education {
  let loc = item.at(lang)
  education-entry(
    title: loc.title,
    org: loc.org,
    period: item.period,
  )
}

// --- Experience ---

#v(section-gap)
== #label.experience

#for item in data.experience {
  let loc = item.at(lang)
  experience-entry(
    title: loc.title,
    org: loc.org,
    period: item.period,
    desc: loc.at("desc", default: none),
  )
}

// --- Certifications + References ---

#let certs = data.certifications.at(lang)

#v(section-gap)

== #certs.title

#{
  let items = certs.items
  for (i, item) in items.enumerate() {
    [· #item]
    if i < items.len() - 1 { [\ ] }
  }
}

#v(1fr)
#align(right, text(style: "italic", fill: color-muted, size: 9pt, data.references.at(lang)))

// ============================================================
// PAGE 2
// ============================================================

#pagebreak()

// --- Software Skills ---

== #label.software

#for cat in data.software.filter(c => c.at("cv", default: true)) {
  software-box(cat.category.at(lang), cat.tools)
}

// --- Client List ---

#v(16pt)

#let client-data = data.clients
== #client-data.at(lang).title

#v(4pt)

#{
  let items = client-data.list
  let cols = 3
  let rows = calc.ceil(items.len() / cols)
  let cells = ()
  for i in range(rows) {
    for c in range(cols) {
      let idx = c * rows + i
      if idx < items.len() {
        cells.push(text(size: 8.5pt, items.at(idx)))
      } else {
        cells.push([])
      }
    }
  }
  grid(
    columns: (1fr, 1fr, 1fr),
    row-gutter: 4pt,
    ..cells,
  )
}
