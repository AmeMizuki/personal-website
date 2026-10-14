import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    category: z.string().default('misc'),
  }),
})

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date(),
  }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    stack: z.array(z.string()).default([]),
    link: z.string().url().refine(value => /^https?:\/\//i.test(value), 'Use an HTTP(S) URL').optional(),
    repo: z.string().url().refine(value => /^https?:\/\//i.test(value), 'Use an HTTP(S) URL').optional(),
    images: z.array(z.object({
      src: z.union([
        z.string().regex(/^\/(?![\/\\])[^\\\s]*$/, 'Use a /public-path image URL'),
        z.string().url().refine(value => /^https?:\/\//i.test(value), 'Use an HTTP(S) image URL'),
      ]),
      alt: z.string().min(1),
    })).default([]),
  }),
})

export const collections = { journal, notes, projects }
