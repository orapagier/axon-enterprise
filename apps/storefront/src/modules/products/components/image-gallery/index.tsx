"use client"

import { HttpTypes } from "@medusajs/types"
import { resolveImageSrc } from "@lib/util/image-url"
import Image from "next/image"
import { useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [active, setActive] = useState(0)
  // The images prop changes when a variant is selected; clamp so a stale
  // index never points past the new array.
  const safeIndex = images.length ? Math.min(active, images.length - 1) : 0
  const current = images[safeIndex]

  if (!images.length) {
    return (
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-gradient-to-br from-brand-green-50 via-white to-brand-cream-100 ring-1 ring-grey-10 flex flex-col items-center justify-center gap-y-3">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-soft border border-grey-10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green-600">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </span>
        <span className="text-body-sm text-grey-50">No photo yet</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main stage */}
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-grey-5 ring-1 ring-grey-10 shadow-medium">
        {!!current?.url && (
          <Image
            key={current.id}
            src={resolveImageSrc(current.url)}
            priority
            className="absolute inset-0 object-cover"
            alt={`Product image ${safeIndex + 1}`}
            fill
            sizes="(max-width: 576px) 100vw, (max-width: 1024px) 100vw, 55vw"
          />
        )}
        {/* Soft vignette keeps light-on-light photos from bleeding into the page */}
        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-grey-90/5 pointer-events-none" />

        {images.length > 1 && (
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-grey-90/60 backdrop-blur-sm text-white text-caption font-semibold tabular-nums">
            {safeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnail selector */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2.5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === safeIndex}
              className={`relative aspect-square overflow-hidden rounded-xl bg-grey-5 transition-all ${
                index === safeIndex
                  ? "ring-2 ring-brand-green-600 ring-offset-2 ring-offset-brand-cream-100"
                  : "ring-1 ring-grey-10 opacity-70 hover:opacity-100 hover:ring-brand-green-300"
              }`}
            >
              {!!image.url && (
                <Image
                  src={resolveImageSrc(image.url)}
                  className="absolute inset-0 object-cover"
                  alt={`Product thumbnail ${index + 1}`}
                  fill
                  sizes="120px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
