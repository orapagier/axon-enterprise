"use client"

import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react"

type CartSelectionContextValue = {
  /** Line ids that are in stock and therefore tickable. */
  selectableIds: string[]
  /** Currently ticked line ids (always a subset of selectableIds). */
  selectedIds: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  /** True when every selectable line is ticked. */
  allSelected: boolean
  /** True when at least one selectable line is ticked. */
  someSelected: boolean
  toggleAll: () => void
}

const CartSelectionContext = createContext<CartSelectionContextValue | null>(
  null
)

/** Returns the selection context, or null when rendered outside a provider
 * (e.g. the line-item preview used in the checkout summary). */
export const useCartSelection = (): CartSelectionContextValue | null =>
  useContext(CartSelectionContext)

export const CartSelectionProvider = ({
  selectableIds,
  children,
}: {
  selectableIds: string[]
  children: ReactNode
}) => {
  // Open with everything in stock ticked, the way Shopee starts with all items
  // selected.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectableIds)
  )

  const selectableSet = useMemo(() => new Set(selectableIds), [selectableIds])

  const value = useMemo<CartSelectionContextValue>(() => {
    // Keep the working selection inside the current selectable universe — items
    // may have been removed or gone out of stock since the provider mounted.
    const effective = selectableIds.filter((id) => selected.has(id))
    return {
      selectableIds,
      selectedIds: effective,
      isSelected: (id) => selected.has(id) && selectableSet.has(id),
      toggle: (id) => {
        if (!selectableSet.has(id)) return
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return next
        })
      },
      allSelected:
        selectableIds.length > 0 && effective.length === selectableIds.length,
      someSelected: effective.length > 0,
      toggleAll: () => {
        setSelected((prev) => {
          const within = selectableIds.filter((id) => prev.has(id))
          return within.length === selectableIds.length
            ? new Set()
            : new Set(selectableIds)
        })
      },
    }
  }, [selected, selectableSet, selectableIds])

  return (
    <CartSelectionContext.Provider value={value}>
      {children}
    </CartSelectionContext.Provider>
  )
}
