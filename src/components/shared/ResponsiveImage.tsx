import { getSrcSet, getSizes, getDefaultSrc, hasVariants } from '@/lib/image-url'

interface Props {
  src: string
  alt?: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  fetchPriority?: 'high' | 'low' | 'auto'
  sizes?: 'gallery' | 'hero' | 'thumbnail' | string
  style?: React.CSSProperties
  onLoad?: () => void
}

/**
 * Responsive image component with automatic srcset for portfolio images.
 *
 * For portfolio images (in /media/portfolio/), automatically generates srcset
 * using pre-generated WebP variants from the sync script.
 *
 * For other images (page assets, etc.), renders a standard img tag.
 */
export default function ResponsiveImage({
  src,
  alt = '',
  width,
  height,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  sizes = 'gallery',
  style,
  onLoad,
}: Props) {
  // Only portfolio images have variants
  const useVariants = hasVariants(src)

  // Determine sizes attribute
  const sizesAttr =
    typeof sizes === 'string' && ['gallery', 'hero', 'thumbnail'].includes(sizes)
      ? getSizes(sizes as 'gallery' | 'hero' | 'thumbnail')
      : sizes

  if (useVariants) {
    return (
      <picture>
        {/* WebP srcset */}
        <source
          type="image/webp"
          srcSet={getSrcSet(src)}
          sizes={sizesAttr}
        />
        {/* Fallback to original JPEG */}
        <img
          src={getDefaultSrc(src)}
          alt={alt}
          width={width}
          height={height}
          className={className}
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          sizes={sizesAttr}
          style={style}
          onLoad={onLoad}
        />
      </picture>
    )
  }

  // Non-portfolio images: standard img tag
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      style={style}
      onLoad={onLoad}
    />
  )
}
