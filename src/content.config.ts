import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Astro 6 removed the legacy content-collections API, so this moved up from
// src/content/config.ts and gained an explicit loader. The glob loader derives
// `id` from the filename, which matches what `slug` produced before, so the
// project URLs are unchanged.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    thumb: z.string().optional(),
    thumbAlt: z.string().optional(),
    // Shown in the top right corner, in this order, where a page with a
    // Norwegian counterpart shows the flag. Articles have none.
    links: z.array(z.object({
      label: z.string(),
      href: z.string().url(),
      icon: z.enum(['github', 'obsidian']),
    })).default([]),
    draft: z.boolean().default(false),
  }),
});

// Writing is English only, by decision 2026-09-25 (polybjorn-en #107), so its
// pages pass `enOnly` and there is no /no mirror. It carries no cover or thumb:
// the projects card makes its image conditional already, and leaving the fields
// out means this route needs no Cloudinary helper and no lightbox.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, writing };
