import { HttpTypes } from "@medusajs/types"
import { resolveImageSrc } from "@lib/util/image-url"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  return (
    <div className="flex flex-col gap-4">
      {images.map((image, index) => {
        return (
          <div
            key={image.id}
            className="relative aspect-square w-full overflow-hidden bg-grey-5 rounded-2xl shadow-soft"
            id={image.id}
          >
            {!!image.url && (
              <Image
                src={resolveImageSrc(image.url)}
                priority={index <= 2 ? true : false}
                className="absolute inset-0 rounded-2xl object-cover"
                alt={`Product image ${index + 1}`}
                fill
                sizes="(max-width: 576px) 100vw, (max-width: 1024px) 100vw, 55vw"
                style={{
                  objectFit: "cover",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ImageGallery
