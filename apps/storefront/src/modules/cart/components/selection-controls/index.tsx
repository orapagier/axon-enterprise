"use client"

import { Checkbox } from "@modules/common/components/ui"
import { useEffect, useRef } from "react"
import { useCartSelection } from "../selection-context"

/** Header checkbox that ticks/unticks every in-stock line at once. */
export const SelectAllCheckbox = () => {
  const selection = useCartSelection()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current && selection) {
      ref.current.indeterminate =
        selection.someSelected && !selection.allSelected
    }
  }, [selection])

  if (!selection) return null

  return (
    <Checkbox
      ref={ref}
      checked={selection.allSelected}
      onChange={selection.toggleAll}
      aria-label="Select all items"
      data-testid="select-all-checkbox"
    />
  )
}

/** Per-row checkbox marking a single line for checkout. Disabled for
 * out-of-stock items, which can't be ordered. */
export const CartItemCheckbox = ({
  itemId,
  disabled,
}: {
  itemId: string
  disabled?: boolean
}) => {
  const selection = useCartSelection()
  if (!selection) return null

  return (
    <Checkbox
      checked={selection.isSelected(itemId)}
      onChange={() => selection.toggle(itemId)}
      disabled={disabled}
      aria-label="Select item for checkout"
      data-testid="cart-item-checkbox"
    />
  )
}
