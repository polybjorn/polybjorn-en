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
    cover: z.string().url().optional(),
    coverAlt: z.string().optional(),
    thumb: z.string().url().optional(),
    thumbAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
