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
    // Set when a piece is revised after publishing. `date` stays the
    // publication date, so ordering and the RSS pubDate do not move.
    updated: z.date().optional(),
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
    // Published and reachable at its own URL, but kept off the projects
    // listing, the feed and the sitemap. For something shareable by link
    // before it is announced.
    unlisted: z.boolean().default(false),
  }),
});

export const collections = { projects };
