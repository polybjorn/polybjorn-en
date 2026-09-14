/**
 * The shape of `cv.yaml`.
 *
 * YAML arrives through a rollup plugin with no type of its own, so everything
 * read out of it was `any` until this - which is why `astro check` could say
 * nothing about the CV, the one page built entirely from data rather than from
 * markup. The interfaces below are what the template actually reads; they are
 * not the whole file, and a field added to the YAML has to be added here too
 * before the template may use it. That is the trade for having the check.
 *
 * `Localised` is the recurring pattern: most strings exist twice and are
 * chosen by `lang`. `period` is the exception - some are a bare string
 * because they read the same in both languages, so the template tests for it.
 */
export interface Localised {
  en: string;
  no: string;
}

export interface CvEntry {
  en: { title: string; org?: string; desc?: string };
  no: { title: string; org?: string; desc?: string };
  period: string | Localised;
  links?: Record<string, string>;
}

export interface SoftwareGroup {
  category: Localised;
  tools: string[];
}

export interface Cv {
  profile: Localised;
  experience: CvEntry[];
  education: CvEntry[];
  skills: Localised[];
  software: SoftwareGroup[];
  [section: string]: unknown;
}

export const cv: Cv;
