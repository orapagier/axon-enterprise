"use client"

import { clx } from "@modules/common/components/ui"
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import ChevronDown from "@modules/common/icons/chevron-down"

type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">

const CartItemSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder = "Select...", className, children, ...props }, ref) => {
    const innerRef = useRef<HTMLSelectElement>(null)
    const [isPlaceholder, setIsPlaceholder] = useState(false)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    useEffect(() => {
      if (innerRef.current && innerRef.current.value === "") {
        setIsPlaceholder(true)
      } else {
        setIsPlaceholder(false)
      }
    }, [innerRef.current?.value])

    return (
      <div
        className={clx(
          "relative inline-flex items-center txt-compact-small rounded-lg border border-gray-200 bg-white text-ui-fg-base hover:border-gray-300 transition-colors",
          className,
          {
            "text-ui-fg-subtle": isPlaceholder,
          }
        )}
      >
        <select
          ref={innerRef}
          {...props}
          className="appearance-none bg-transparent border-none pl-3 pr-8 py-2 outline-none cursor-pointer text-sm"
        >
          <option disabled value="">
            {placeholder}
          </option>
          {children}
        </select>
        <span className="absolute right-2 pointer-events-none text-ui-fg-subtle">
          <ChevronDown size="14" />
        </span>
      </div>
    )
  }
)

CartItemSelect.displayName = "CartItemSelect"

export default CartItemSelect
