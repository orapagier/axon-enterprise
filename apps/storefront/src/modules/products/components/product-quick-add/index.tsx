"use client"

import { addToCart } from "@lib/data/cart"
import { getProductUnit, getUnitLabel } from "@lib/util/unit"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

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

      {/* In-card overlay */}
      {isOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 bg-white rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.08)] animate-enter">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -top-3 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-medium hover:bg-grey-5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="p-3 flex flex-col gap-2.5">
            {/* Options */}
            {hasOptions && (
              <div className="flex flex-col gap-2">
                {(product.options || []).map((option) => (
                  <div key={option.id}>
                    <span className="text-[10px] font-semibold text-grey-50 uppercase tracking-wider mb-1 block">
                      {option.title}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(option.values ?? []).map((v) => (
                        <button
                          key={v.value}
                          onClick={() => setOptionValue(option.id, v.value)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-all duration-150 ${
                            options[option.id] === v.value
                              ? "border-brand-green-500 bg-brand-green-50 text-brand-green-700"
                              : "border-grey-20 text-grey-50 hover:border-grey-40"
                          }`}
                        >
                          {v.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-grey-50 uppercase tracking-wider">
                Qty
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={decrementQty}
                  disabled={quantity <= 1 || isAdding}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-grey-5 border border-grey-10 text-grey-60 hover:text-brand-green-700 transition-colors disabled:opacity-40"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="text-caption font-bold text-grey-90 tabular-nums w-8 text-center" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={incrementQty}
                  disabled={quantity >= maxQuantity || isAdding}
                  aria-label="Increase quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-grey-5 border border-grey-10 text-grey-60 hover:text-brand-green-700 transition-colors disabled:opacity-40"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
              className={`w-full py-2 rounded-lg font-semibold text-caption transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
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
        </div>
      )}
    </>
  )
}
