"use client"

import { addToCart } from "@lib/data/cart"
import { getProductUnit, getUnitLabel } from "@lib/util/unit"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

type QuickAddProps = {
  product: HttpTypes.StoreProduct
  mode: "cart" | "buy"
  variant?: "default" | "icon"
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductQuickAdd({ product, mode, variant = "default" }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const countryCode = useParams().countryCode as string
  const router = useRouter()
  const unit = getProductUnit(product)

  const hasOptions = (product.variants?.length ?? 0) > 1

  // Preselect if single variant
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return undefined
    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) return true
    if (selectedVariant?.allow_backorder) return true
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    )
      return true
    return false
  }, [selectedVariant])

  const maxQuantity = useMemo(() => {
    if (!selectedVariant) return 99
    if (!selectedVariant.manage_inventory) return 99
    if (selectedVariant.allow_backorder) return 99
    return Math.max(1, selectedVariant.inventory_quantity || 0)
  }, [selectedVariant])

  const handleClick = async () => {
    // Always open the popup so the customer can pick quantity (and options, if any)
    setQuantity(1)
    setIsOpen(true)
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })

    setIsAdding(false)
    setAdded(true)

    if (mode === "buy") {
      setIsOpen(false)
      router.push(`/${countryCode}/cart`)
    } else {
      // Show success briefly then close
      setTimeout(() => {
        setAdded(false)
        setIsOpen(false)
      }, 1200)
    }
  }

  const decrementQty = () => setQuantity((q) => Math.max(1, q - 1))
  const incrementQty = () =>
    setQuantity((q) => Math.min(maxQuantity, q + 1))

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  return (
    <>
      {/* Trigger button */}
      {variant === "icon" ? (
        <button
          onClick={handleClick}
          disabled={isAdding}
          aria-label={`Add ${product.title} to cart`}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-brand-green-700 hover:bg-brand-green-800 text-white shadow-medium hover:shadow-large ring-1 ring-brand-green-800/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isAdding ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ring"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : added ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          )}
        </button>
      ) : mode === "cart" ? (
        <button
          onClick={handleClick}
          disabled={isAdding}
          className="flex-1 py-2 px-3 bg-brand-green-600 hover:bg-brand-green-700 text-white text-caption font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          {isAdding ? "Adding..." : added ? "Added!" : "Add to Cart"}
        </button>
      ) : (
        <button
          onClick={handleClick}
          disabled={isAdding}
          className="flex-1 py-2 px-3 bg-brand-gold-500 hover:bg-brand-gold-400 text-grey-90 text-caption font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          {isAdding ? "Processing..." : "Buy Now"}
        </button>
      )}

      {/* Options popup/modal – portaled to body to avoid hover/blur conflicts with parent card */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 animate-enter">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-grey-5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Product info */}
            <div className="flex items-center gap-2.5 mb-3">
              {product.thumbnail && (
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-10 h-10 rounded-lg object-cover bg-grey-5"
                />
              )}
              <div>
                <h3 className="text-body-sm font-semibold text-grey-90 line-clamp-1">
                  {product.title}
                </h3>
                <p className="text-caption text-grey-50">
                  Select options
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-y-3 mb-3">
              {(product.options || []).map((option) => (
                <div key={option.id}>
                  <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider mb-1.5 block">
                    {option.title}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(option.values ?? []).map((v) => (
                      <button
                        key={v.value}
                        onClick={() => setOptionValue(option.id, v.value)}
                        className={`px-3 py-1.5 rounded-lg text-caption font-medium border transition-all duration-150 ${
                          options[option.id] === v.value
                            ? "border-brand-green-500 bg-brand-green-50 text-brand-green-700"
                            : "border-grey-20 text-grey-60 hover:border-grey-40 hover:text-grey-80"
                        }`}
                      >
                        {v.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity selector */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider">
                  Quantity
                </span>
                {selectedVariant?.manage_inventory &&
                  !selectedVariant.allow_backorder &&
                  inStock && (
                    <span className="text-caption text-grey-50">
                      {maxQuantity} {getUnitLabel(unit, maxQuantity)} available
                    </span>
                  )}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-grey-20 bg-grey-5 p-1">
                <button
                  type="button"
                  onClick={decrementQty}
                  disabled={quantity <= 1 || isAdding}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-grey-10 text-grey-70 hover:text-brand-green-700 hover:border-brand-green-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <div
                  className="flex-1 flex items-baseline justify-center gap-x-1"
                  aria-live="polite"
                >
                  <span className="text-caption font-bold text-grey-90 tabular-nums">
                    {quantity}
                  </span>
                  <span className="text-caption text-grey-60">
                    {getUnitLabel(unit, quantity)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={incrementQty}
                  disabled={quantity >= maxQuantity || isAdding}
                  aria-label="Increase quantity"
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-grey-10 text-grey-70 hover:text-brand-green-700 hover:border-brand-green-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || !inStock || isAdding}
              className={`w-full py-2.5 rounded-lg font-semibold text-caption transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === "buy"
                  ? "bg-brand-gold-500 hover:bg-brand-gold-400 text-grey-90"
                  : "bg-brand-green-600 hover:bg-brand-green-700 text-white"
              }`}
            >
              {!selectedVariant
                ? "Select options"
                : !inStock
                ? "Out of stock"
                : isAdding
                ? "Adding..."
                : added
                ? "Added!"
                : mode === "buy"
                ? `Buy ${quantity} ${getUnitLabel(unit, quantity)} now`
                : `Add ${quantity} ${getUnitLabel(unit, quantity)} to cart`}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
