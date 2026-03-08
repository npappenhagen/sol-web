/**
 * Context-aware starter messages for the inquiry widget.
 * Pre-populates the message field based on where the user clicked from.
 */

export const STARTER_MESSAGES: Record<string, string> = {
  // Portfolio galleries
  portraits:
    "Hi! I'm interested in booking a portrait session. I'd love to hear about your availability and packages.",
  branding:
    "Hi! I'm looking for professional branding photography for my business. Could you share more about your process?",
  events:
    "Hi! I'm planning a retreat and would love to capture it beautifully. Can we chat about what you offer?",
  architecture:
    "Hi! I have an architecture/interior project I'd like photographed. Are you available for a consultation?",

  // Portrait sub-categories
  family:
    "Hi! I'd love to book a family session. Can you tell me more about what's included and your availability?",
  couples:
    "Hi! My partner and I are interested in a couples session. What does that look like with you?",
  maternity:
    "Hi! I'm expecting and would love to capture this special time. Do you have availability for a maternity session?",

  // Service-specific (maps to portfolio slugs for now)
  portrait:
    "Hi! I saw your portrait packages and I'm interested in learning more about booking a session.",
  retreat:
    "Hi! I'd love to learn more about retreat photography and what's included.",
}

/**
 * Get the starter message for a given context.
 * Returns empty string for unknown contexts (generic inquiry).
 */
export function getStarterMessage(context: string | null): string {
  if (!context) return ''
  return STARTER_MESSAGES[context.toLowerCase()] ?? ''
}

/**
 * Placeholder message pools organized by visitor persona.
 * These are hint texts shown in the textarea before the user types.
 */
const PLACEHOLDER_POOL = {
  local_family: [
    "We live in Tamarindo and want to capture our growing family...",
    "Our kids are finally at that age where they'll actually smile for photos...",
    "We've been meaning to get family photos before the kids get any bigger...",
    "Our family just moved to Flamingo and we'd love photos in our new home...",
    "Looking for someone to capture our Sunday beach mornings as a family...",
  ],
  visiting_family: [
    "My parents are visiting from the States and I want to surprise them with a session...",
    "We have family coming to stay next month — would love to capture everyone together...",
    "My sister's visiting for the first time and we want to document her trip...",
    "Extended family reunion coming up — hoping to get everyone in one frame...",
  ],
  professional: [
    "I need updated headshots for my LinkedIn and website...",
    "Starting a new role and need fresh professional photos...",
    "Our team is growing and we'd love consistent headshots for everyone...",
    "I'm a realtor and need new photos for my marketing materials...",
  ],
  local_business: [
    "We just opened a cafe in Tamarindo and need photos for our menu and socials...",
    "I run a surf school and want to refresh our website imagery...",
    "We're launching a new product line and need lifestyle shots...",
    "Our yoga studio needs photos that capture the vibe of our space...",
    "I'm a personal chef and want to showcase my work for private clients...",
  ],
  tourist: [
    "We're spending two weeks in Guanacaste and want to capture the trip...",
    "This is our honeymoon and we'd love some photos to remember it...",
    "We're celebrating our anniversary in Costa Rica and want portraits...",
    "First international trip with our toddler — want to remember everything...",
    "We'll be in Tamarindo for a week and would love a beach session...",
  ],
  special_occasion: [
    "We're expecting our first baby in a few months...",
    "My daughter's quinceañera is coming up and we want beautiful portraits...",
    "We just got engaged on the beach and want more photos to celebrate...",
    "It's my partner's 40th and I want to gift them a portrait session...",
  ],
  retreats: [
    "I'm hosting a wellness retreat and want to capture the experience...",
    "Our company is doing an offsite in Costa Rica — can you photograph it?",
    "Planning a girls' trip and we'd love some fun group shots...",
  ],
}

/**
 * Context-specific placeholder subsets.
 * Maps page contexts to relevant persona pools.
 */
const CONTEXT_PLACEHOLDERS: Record<string, string[]> = {
  portraits: [
    ...PLACEHOLDER_POOL.local_family,
    ...PLACEHOLDER_POOL.visiting_family,
    ...PLACEHOLDER_POOL.special_occasion,
    ...PLACEHOLDER_POOL.tourist,
  ],
  // Portrait sub-categories
  family: [
    ...PLACEHOLDER_POOL.local_family,
    ...PLACEHOLDER_POOL.visiting_family,
  ],
  couples: [
    ...PLACEHOLDER_POOL.tourist.filter(p => p.includes('honeymoon') || p.includes('anniversary') || p.includes('engaged')),
    ...PLACEHOLDER_POOL.special_occasion.filter(p => p.includes('engaged') || p.includes('partner')),
    "We're celebrating our love story and want photos to match...",
    "My partner and I want candid, natural couple photos...",
  ],
  maternity: [
    ...PLACEHOLDER_POOL.special_occasion.filter(p => p.includes('expecting') || p.includes('baby')),
    "I'm in my third trimester and want to capture this moment...",
    "We're expecting twins and want beautiful maternity photos...",
  ],
  branding: [
    ...PLACEHOLDER_POOL.professional,
    ...PLACEHOLDER_POOL.local_business,
  ],
  events: [
    ...PLACEHOLDER_POOL.retreats,
    ...PLACEHOLDER_POOL.tourist,
    ...PLACEHOLDER_POOL.special_occasion,
  ],
}

/** All placeholders combined for generic context */
const ALL_PLACEHOLDERS: string[] = Object.values(PLACEHOLDER_POOL).flat()

/**
 * Get a random placeholder message appropriate for the given context.
 * Returns a varied hint text that resonates with visitor personas.
 */
export function getPlaceholder(context: string | null): string {
  const pool = context && CONTEXT_PLACEHOLDERS[context.toLowerCase()]
    ? CONTEXT_PLACEHOLDERS[context.toLowerCase()]
    : ALL_PLACEHOLDERS

  return pool[Math.floor(Math.random() * pool.length)]
}
