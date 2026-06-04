import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div className="flex flex-col items-center gap-y-2 border-t border-grey-10 pt-6 text-center">
      <p className="text-body-sm text-grey-50">Need a hand with your order?</p>
      <div className="flex items-center gap-x-3 text-body-sm">
        <LocalizedClientLink
          href="/contact"
          className="font-medium text-brand-green-700 underline-offset-2 transition-colors hover:text-brand-green-800 hover:underline"
        >
          Contact support
        </LocalizedClientLink>
        <span className="h-1 w-1 rounded-full bg-grey-30" />
        <LocalizedClientLink
          href="/contact"
          className="font-medium text-brand-green-700 underline-offset-2 transition-colors hover:text-brand-green-800 hover:underline"
        >
          Returns &amp; exchanges
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Help
