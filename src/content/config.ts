import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
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
