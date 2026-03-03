import { useState } from 'react';

interface Props {
  images: string[];
  title: string;
}

export default function GalleryGrid({ images, title }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox(i => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightbox(i => (i !== null ? (i + 1) % images.length : null));
  const close = () => setLightbox(null);

  return (
    <>
      <ul className="columns-2 md:columns-3 gap-3 space-y-3 px-6 py-12 max-w-7xl mx-auto">
        {images.map((src, idx) => (
          <li key={src} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setLightbox(idx)}
              className="block w-full cursor-zoom-in overflow-hidden"
              aria-label={`Open ${title} image ${idx + 1}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="w-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </button>
          </li>
        ))}
      </ul>

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white text-3xl p-4 hover:opacity-70"
            aria-label="Previous image"
          >
            ‹
          </button>

          <img
            src={images[lightbox]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 text-white text-3xl p-4 hover:opacity-70"
            aria-label="Next image"
          >
            ›
          </button>

          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 text-white text-2xl p-4 hover:opacity-70"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
