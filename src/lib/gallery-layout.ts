/**
 * Justified layout algorithm (Flickr-style).
 *
 * Groups images into rows where each row fills the container width
 * while maintaining aspect ratios and consistent row heights.
 *
 * ## Algorithm Overview
 *
 * 1. **Accumulate images into a row** until the cumulative aspect ratio
 *    would result in a row height within tolerance of the target.
 *
 * 2. **Calculate row height** using: `height = (containerWidth - spacing) / sumOfAspectRatios`
 *
 * 3. **When row height ≤ targetHeight × (1 + tolerance)**, finalize the row
 *    and start a new one.
 *
 * 4. **Incomplete final row** uses the target height to avoid super-wide images.
 *
 * ## Design Decisions
 *
 * - **ROW_HEIGHT_TOLERANCE (0.25)**: Allows 25% variation for consistent rows
 * - **Target heights**: 320px mobile, 600px desktop for visual impact
 * - **Images maintain aspect ratio**: Never cropped or stretched
 */

import { GALLERY_CONFIG } from '@/lib/constants'

const { DEFAULT_WIDTH, DEFAULT_HEIGHT, ROW_HEIGHT_TOLERANCE } = GALLERY_CONFIG

export interface ImageData {
  src: string
  width?: number
  height?: number
  [key: string]: unknown
}

export interface RowImage<T extends ImageData> {
  data: T
  displayWidth: number
  displayHeight: number
  originalIndex: number
}

export interface Row<T extends ImageData> {
  images: RowImage<T>[]
  height: number
}

/**
 * Compute a justified layout for a set of images.
 *
 * @param images - Array of image data with optional width/height
 * @param containerWidth - Available width for the layout
 * @param targetHeight - Target row height
 * @param spacing - Gap between images
 * @returns Array of rows with computed dimensions
 *
 * @example
 * const rows = computeJustifiedLayout(images, 1200, 600, 8)
 * rows.forEach(row => {
 *   row.images.forEach(img => {
 *     console.log(img.displayWidth, img.displayHeight)
 *   })
 * })
 */
export function computeJustifiedLayout<T extends ImageData>(
  images: T[],
  containerWidth: number,
  targetHeight: number,
  spacing: number
): Row<T>[] {
  if (containerWidth <= 0 || images.length === 0) return []

  const rows: Row<T>[] = []
  let currentRow: RowImage<T>[] = []
  let currentRowAspectSum = 0

  images.forEach((img, idx) => {
    const w = img.width || DEFAULT_WIDTH
    const h = img.height || DEFAULT_HEIGHT
    const aspect = w / h

    currentRow.push({
      data: img,
      displayWidth: 0,
      displayHeight: 0,
      originalIndex: idx,
    })
    currentRowAspectSum += aspect

    // Calculate what height this row would have if we used all images so far
    const totalSpacing = (currentRow.length - 1) * spacing
    const rowHeight = (containerWidth - totalSpacing) / currentRowAspectSum

    // If row height is within tolerance of target, finalize this row
    if (rowHeight <= targetHeight * (1 + ROW_HEIGHT_TOLERANCE)) {
      // Finalize row with calculated dimensions
      const finalHeight = rowHeight
      currentRow.forEach((rowImg) => {
        const imgW = rowImg.data.width || DEFAULT_WIDTH
        const imgH = rowImg.data.height || DEFAULT_HEIGHT
        const imgAspect = imgW / imgH
        rowImg.displayHeight = finalHeight
        rowImg.displayWidth = finalHeight * imgAspect
      })

      rows.push({ images: [...currentRow], height: finalHeight })
      currentRow = []
      currentRowAspectSum = 0
    }
  })

  // Handle remaining images in incomplete row
  if (currentRow.length > 0) {
    // For incomplete rows, use target height to avoid super-wide images
    const finalHeight = Math.min(
      targetHeight,
      (containerWidth - (currentRow.length - 1) * spacing) / currentRowAspectSum
    )

    currentRow.forEach((rowImg) => {
      const imgW = rowImg.data.width || DEFAULT_WIDTH
      const imgH = rowImg.data.height || DEFAULT_HEIGHT
      const imgAspect = imgW / imgH
      rowImg.displayHeight = finalHeight
      rowImg.displayWidth = finalHeight * imgAspect
    })

    rows.push({ images: currentRow, height: finalHeight })
  }

  return rows
}

/**
 * Get the appropriate target row height based on container width.
 */
export function getTargetRowHeight(containerWidth: number): number {
  const { TARGET_ROW_HEIGHT_MOBILE, TARGET_ROW_HEIGHT_DESKTOP, BREAKPOINT_DESKTOP } =
    GALLERY_CONFIG
  return containerWidth >= BREAKPOINT_DESKTOP
    ? TARGET_ROW_HEIGHT_DESKTOP
    : TARGET_ROW_HEIGHT_MOBILE
}
