/**
 * Focal point calculation utilities for image object-position.
 * Consolidates the repeated presetMap and position calculation logic.
 */

export type FocalPreset = 'top' | 'center' | 'bottom' | 'left' | 'right'

const PRESET_MAP: Record<FocalPreset, string> = {
  top: 'center top',
  center: 'center center',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center',
}

/**
 * Calculate the CSS object-position value from focal point coordinates or preset.
 *
 * @param focalX - X coordinate (0-100) or null
 * @param focalY - Y coordinate (0-100) or null
 * @param preset - Fallback preset position if focal coordinates not provided
 * @returns CSS object-position value (e.g., "50% 30%" or "center top")
 */
export function getObjectPosition(
  focalX?: number | string | null,
  focalY?: number | string | null,
  preset: FocalPreset = 'center'
): string {
  const x = focalX != null ? Number(focalX) : null
  const y = focalY != null ? Number(focalY) : null

  if (x != null && y != null && !isNaN(x) && !isNaN(y)) {
    return `${x}% ${y}%`
  }

  return PRESET_MAP[preset] ?? 'center center'
}
