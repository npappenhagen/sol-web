import { defineCollection, z } from 'astro:content'

const imageSchema = z.object({
  src: z.string(),
  hidden: z.boolean().default(false),
  date_taken: z.string().optional(),
  hue: z.number().optional(),
  tags: z.array(z.string()).optional(),
  // Image dimensions for smart aspect ratio display
  width: z.number().optional(),
  height: z.number().optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  // Hero-safe: true if this image works well in full-bleed hero contexts
  // (landscape orientation, breathing room, not tightly cropped)
  hero_safe: z.boolean().optional(),
})

/** Focal point value: number 0-100 or string percentage */
const focalPointSchema = z.union([
  z.string(),
  z.number().min(0).max(100),
]).optional()

const heroImageSchema = z.object({
  src: z.string().min(1),
  focal_x: focalPointSchema,
  focal_y: focalPointSchema,
  // Image dimensions for smart aspect ratio display
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
})

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['portraits', 'family', 'maternity', 'couples', 'branding', 'events', 'architecture']),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: z.string(),
    cover_position: z.enum(['top', 'center', 'bottom', 'left', 'right']).default('center'),
    cover_focal_x: focalPointSchema,
    cover_focal_y: focalPointSchema,
    cover_width: z.number().optional(),
    cover_height: z.number().optional(),
    cover_orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
    // Hero carousel settings
    carousel_mode: z.enum(['manual', 'auto']).default('auto'),
    carousel_count: z.number().default(4),
    hero_images: z.array(heroImageSchema).optional(),
    hero_carousel_speed: z.number().min(1).max(30).default(6),
    images: z.array(imageSchema).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
    sort_mode: z.enum(['manual', 'date_desc', 'rainbow_reverse', 'random', 'session_spread', 'color_spread']).default('manual'),
  }),
})

// Alias for backward compatibility with service carousel images
const carouselImageSchema = heroImageSchema

const subcategorySchema = z.object({
  label: z.string(),
  filter: z.string(),
})

const packageSchema = z.object({
  name: z.string(),
  duration: z.string(),
  starting_price: z.number().nullable().optional(),
  price_note: z.string().optional(),
  includes: z.array(z.string()),
})

const serviceSchema = z.object({
  name: z.string(),
  tagline: z.string().optional(),
  description: z.string(),
  ideal_for: z.array(z.string()).optional(),
  packages: z.array(packageSchema).optional(),
  what_to_expect: z.string().optional(),
  starting_note: z.string().optional(),
  image: z.string(),
  carousel_images: z.array(carouselImageSchema).optional(),
  carousel_mode: z.enum(['manual', 'auto']).default('auto'),
  carousel_count: z.number().default(5),
  portfolio_slug: z.string().optional(),
  subcategories: z.array(subcategorySchema).optional(),
})

const processStepSchema = z.object({
  number: z.string(),
  title: z.string(),
  description: z.string(),
})

const locationSchema = z.object({
  heading: z.string(),
  description: z.string(),
  areas: z.array(z.string()).optional(),
})

const closingSchema = z.object({
  heading: z.string(),
  subheading: z.string().optional(),
  cta_text: z.string(),
})

const pages = defineCollection({
  type: 'data',
  schema: z.discriminatedUnion('_page', [
    z.object({
      _page: z.literal('home'),
      carousel_mode: z.enum(['manual', 'auto']).default('auto'),
      carousel_categories: z.array(z.string()).optional(),
      carousel_count: z.number().default(8),
      hero_images: z
        .array(
          z.union([
            z.string(),
            z.object({
              image: z.string(),
              focal_x: focalPointSchema,
              focal_y: focalPointSchema,
            }),
          ]),
        )
        .transform((items) =>
          items.map((item) =>
            typeof item === 'string' ? { image: item } : item,
          ),
        ),
      hero_position: z.enum(['top', 'center', 'bottom', 'left', 'right']).default('center'),
      hero_focal_x: focalPointSchema,
      hero_focal_y: focalPointSchema,
      hero_carousel_speed: z.number().min(1).max(30).default(6),
      hero_heading: z.string(),
      intro_label: z.string(),
      intro_heading: z.string(),
      intro_body: z.string(),
      intro_headshot: z.string().optional(),
      stats: z.array(z.object({ number: z.string(), label: z.string() })),
      featured_slugs: z.array(z.string()),
    }),
    z.object({
      _page: z.literal('about'),
      carousel_mode: z.enum(['manual', 'auto']).default('auto'),
      carousel_categories: z.array(z.string()).optional(),
      carousel_count: z.number().default(4),
      hero_images: z
        .array(
          z.union([
            z.string(),
            z.object({
              image: z.string(),
              focal_x: focalPointSchema,
              focal_y: focalPointSchema,
            }),
          ]),
        )
        .transform((items) =>
          items.map((item) =>
            typeof item === 'string' ? { image: item } : item,
          ),
        ),
      hero_position: z.enum(['top', 'center', 'bottom', 'left', 'right']).default('center'),
      hero_focal_x: focalPointSchema,
      hero_focal_y: focalPointSchema,
      hero_carousel_speed: z.number().min(1).max(30).default(6),
      heading: z.string(),
      subheading: z.string(),
      bio: z.string(),
      headshot: z.string(),
      headshots: z.array(z.string()).optional(),
    }),
    z.object({
      _page: z.literal('services'),
      page_heading: z.string(),
      page_intro: z.string().optional(),
      hero_images: z
        .array(
          z.union([
            z.string(),
            z.object({
              image: z.string(),
              focal_x: focalPointSchema,
              focal_y: focalPointSchema,
            }),
          ]),
        )
        .transform((items) =>
          items.map((item) =>
            typeof item === 'string' ? { image: item } : item,
          ),
        )
        .optional(),
      hero_position: z.enum(['top', 'center', 'bottom', 'left', 'right']).default('center'),
      hero_carousel_speed: z.number().min(1).max(30).default(8),
      location: locationSchema.optional(),
      process: z.object({
        heading: z.string(),
        steps: z.array(processStepSchema),
      }).optional(),
      services: z.array(serviceSchema),
      closing: closingSchema.optional(),
    }),
    z.object({
      _page: z.literal('site'),
      nav_logo: z.string(),
      footer_logo: z.string().optional(),
      logo_alt: z.string().default('Sol Photography'),
    }),
  ]),
})

export const collections = { portfolio, pages }
