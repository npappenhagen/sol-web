/**
 * Content loading utilities with error handling.
 * Wraps Astro content collection functions with validation and fallbacks.
 */

import { getEntry, getCollection, type CollectionEntry } from 'astro:content'

/**
 * Load a page singleton with error handling.
 * @throws Error if the page entry doesn't exist
 */
export async function loadPageEntry<T extends 'home' | 'about' | 'services' | 'site'>(
  pageId: T
): Promise<CollectionEntry<'pages'>> {
  const entry = await getEntry('pages', pageId)
  if (!entry) {
    throw new Error(`Missing required page entry: pages/${pageId}`)
  }
  return entry
}

/**
 * Load a portfolio gallery with error handling.
 * @throws Error if the portfolio entry doesn't exist
 */
export async function loadPortfolioGallery(
  slug: string
): Promise<CollectionEntry<'portfolio'>> {
  const entry = await getEntry('portfolio', slug)
  if (!entry) {
    throw new Error(`Missing portfolio entry: portfolio/${slug}`)
  }
  return entry
}

/**
 * Load all portfolio entries.
 */
export async function loadAllPortfolios(): Promise<CollectionEntry<'portfolio'>[]> {
  return getCollection('portfolio')
}

/**
 * Load portfolio entries by category.
 */
export async function loadPortfoliosByCategory(
  category: string
): Promise<CollectionEntry<'portfolio'>[]> {
  const portfolios = await getCollection('portfolio')
  return portfolios.filter((p) => p.data.category === category)
}

/**
 * Safely get an optional page entry.
 * Returns null instead of throwing if entry doesn't exist.
 */
export async function loadPageEntryOptional<
  T extends 'home' | 'about' | 'services' | 'site'
>(pageId: T): Promise<CollectionEntry<'pages'> | null> {
  try {
    return await getEntry('pages', pageId)
  } catch {
    return null
  }
}

/**
 * Safely get an optional portfolio entry.
 * Returns null instead of throwing if entry doesn't exist.
 */
export async function loadPortfolioOptional(
  slug: string
): Promise<CollectionEntry<'portfolio'> | null> {
  try {
    return await getEntry('portfolio', slug)
  } catch {
    return null
  }
}
