/**
 * Parse context from inquiry hash URL.
 * E.g., #inquiry?context=portraits returns "portraits"
 */
export function parseInquiryHash(hash: string): string | null {
  if (!hash.includes('inquiry')) return null
  const queryStart = hash.indexOf('?')
  if (queryStart === -1) return null
  const params = new URLSearchParams(hash.slice(queryStart + 1))
  return params.get('context')
}

/**
 * Check if a hash contains an inquiry trigger.
 */
export function isInquiryHash(hash: string): boolean {
  return hash.includes('inquiry')
}
