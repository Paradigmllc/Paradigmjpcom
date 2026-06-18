import { defineCollection, z } from 'astro:content'

const blogCollection = defineCollection({
  schema: z.object({
    draft: z.boolean().default(false),
    title: z.string(),
    snippet: z.string(),
    image: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    publishDate: z.string().transform((str) => new Date(str)),
    author: z.string().default('Paradigm'),
    category: z.string(),
    tags: z.array(z.string()),
  }),
})

export const collections = {
  blog: blogCollection,
}
