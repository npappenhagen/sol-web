import { defineCollection, z } from 'astro:content';

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['portraits', 'branding', 'events', 'architecture']),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: z.string(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
  }),
});

const serviceSchema = z.object({
  name: z.string(),
  description: z.string(),
  starting_note: z.string().optional(),
  image: z.string(),
  portfolio_slug: z.string().optional(),
});

const pages = defineCollection({
  type: 'data',
  schema: z.discriminatedUnion('_page', [
    z.object({
      _page: z.literal('home'),
      hero_images: z.array(z.string()),
      hero_heading: z.string(),
      intro_label: z.string(),
      intro_heading: z.string(),
      intro_body: z.string(),
      stats: z.array(z.object({ number: z.string(), label: z.string() })),
      featured_slugs: z.array(z.string()),
    }),
    z.object({
      _page: z.literal('about'),
      hero_image: z.string(),
      heading: z.string(),
      subheading: z.string(),
      bio: z.string(),
      headshot: z.string(),
    }),
    z.object({
      _page: z.literal('services'),
      page_heading: z.string(),
      page_intro: z.string().optional(),
      services: z.array(serviceSchema),
    }),
  ]),
});

export const collections = { portfolio, pages };
