/**
 * Centralized constants for Sol Photography.
 * Reduces magic numbers and ensures consistency across the codebase.
 */

// ============================================================================
// Site Identity
// ============================================================================

export const SITE_NAME = 'Sol Photography'
export const SITE_URL = 'https://solphotography.net'
export const SITE_DESCRIPTION = 'Sol Photography — portrait, branding, and retreat photography.'
export const THEME_COLOR = '#F5F0E8'

// Social profiles for structured data
export const SOCIAL_PROFILES = [
  'https://www.instagram.com/sol__photography_/',
] as const

// Business location for local SEO
export const BUSINESS_LOCATION = {
  name: 'Sol Photography',
  founder: 'Laurel',
  addressLocality: 'Guanacaste',
  addressCountry: 'CR',
} as const

// Service areas for local SEO (Guanacaste beach towns + resorts)
export const SERVICE_AREAS = [
  // Region
  'Costa Rica',
  'Guanacaste',
  'Peninsula Papagayo',
  'Gulf of Papagayo',
  // Beach towns
  'Tamarindo',
  'Playa Flamingo',
  'Playa Conchal',
  'Brasilito',
  'Potrero',
  'Playa Grande',
  'Las Catalinas',
  'Zapotal',
  'Playa Langosta',
  'Sugar Beach',
  'Playa Panama',
  'Hacienda Pinilla',
  'Liberia',
  // Resorts (people search "photographer near [resort]")
  'Westin Reserva Conchal',
  'W Costa Rica Reserva Conchal',
  'JW Marriott Guanacaste',
  'Four Seasons Peninsula Papagayo',
  'Andaz Peninsula Papagayo',
  'Margaritaville Playa Flamingo',
  'Casa Chameleon Las Catalinas',
] as const

// ============================================================================
// Gallery Configuration
// ============================================================================

export const GALLERY_CONFIG = {
  /** Target row height on mobile devices (px) */
  TARGET_ROW_HEIGHT_MOBILE: 320,
  /** Target row height on desktop devices (px) */
  TARGET_ROW_HEIGHT_DESKTOP: 600,
  /** Breakpoint for desktop layout (px) */
  BREAKPOINT_DESKTOP: 768,
  /** Tolerance for row height variation (0.25 = 25%) */
  ROW_HEIGHT_TOLERANCE: 0.25,
  /** Minimum swipe distance to trigger navigation (px) */
  SWIPE_THRESHOLD: 50,
  /** Gap between gallery images (px) */
  SPACING: 8,
  /** Default image width when not specified */
  DEFAULT_WIDTH: 1500,
  /** Default image height when not specified */
  DEFAULT_HEIGHT: 1000,
} as const

// ============================================================================
// Carousel Configuration
// ============================================================================

export const CAROUSEL_CONFIG = {
  /** Initial number of images to render */
  INITIAL_COUNT: 12,
  /** Number of images to load per batch */
  BATCH_SIZE: 8,
  /** Distance from edge to trigger loading (px) */
  LOAD_THRESHOLD: 200,
} as const

// ============================================================================
// Bento Grid Configuration
// ============================================================================

export const BENTO_CONFIG = {
  /** Images per bento module (1 hero + 4 grid) */
  IMAGES_PER_MODULE: 5,
  /** Initial modules to render */
  INITIAL_MODULES: 1,
  /** Distance from bottom to trigger load (px) */
  LOAD_THRESHOLD: 400,
} as const

// ============================================================================
// Content Categories
// ============================================================================

/** Portrait sub-categories for filtering */
export const PORTRAIT_SUBCATEGORIES = ['family', 'couples', 'maternity'] as const
export type PortraitSubcategory = (typeof PORTRAIT_SUBCATEGORIES)[number]

/** All portfolio categories */
export const PORTFOLIO_CATEGORIES = [
  'portraits',
  'family',
  'maternity',
  'couples',
  'branding',
  'events',
  'architecture',
] as const
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number]

/** Service types for structured data */
export const SERVICE_TYPES = [
  'Portrait Photography',
  'Branding Photography',
  'Retreat Photography',
] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  /** Default OG image path */
  OG_IMAGE: '/media/site/og-image.jpg',
  /** Default carousel speed (seconds per image) */
  CAROUSEL_SPEED: 6,
  /** Default carousel image count */
  CAROUSEL_COUNT: 8,
} as const
