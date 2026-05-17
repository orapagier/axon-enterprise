"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Product Details",
      component: <ProductInfoTab product={product} />,
    },
    {
      label: "Freshness & Storage",
      component: <FreshnessTab />,
    },
    {
      label: "Delivery Info",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full border-t border-grey-10 pt-6">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  return (
    <div className="text-body-sm py-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <div className="flex flex-col gap-y-1">
          <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">Weight</span>
          <p className="text-grey-70">{product.weight ? `${product.weight} g` : "-"}</p>
        </div>
        <div className="flex flex-col gap-y-1">
          <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">Origin</span>
          <p className="text-grey-70">{product.origin_country ? product.origin_country : "Mindanao, PH"}</p>
        </div>
        <div className="flex flex-col gap-y-1">
          <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">Type</span>
          <p className="text-grey-70">{product.type ? product.type.value : "-"}</p>
        </div>
        <div className="flex flex-col gap-y-1">
          <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">Category</span>
          <p className="text-grey-70">{product.material ? product.material : "Fresh Produce"}</p>
        </div>
      </div>
    </div>
  )
}

const FreshnessTab = () => {
  return (
    <div className="text-body-sm py-6 space-y-4">
      <div className="flex items-start gap-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Refresh size="16" color="#16a34a" />
        </div>
        <div>
          <span className="font-medium text-grey-80">Harvested fresh</span>
          <p className="text-grey-50 mt-0.5">
            Picked within 24 hours of packing for maximum freshness.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Back size="16" color="#16a34a" />
        </div>
        <div>
          <span className="font-medium text-grey-80">Storage tips</span>
          <p className="text-grey-50 mt-0.5">
            Store in a cool, dry place or refrigerate. Best consumed within 3–5 days of delivery.
          </p>
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-body-sm py-6 space-y-4">
      <div className="flex items-start gap-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FastDelivery size="16" color="#16a34a" />
        </div>
        <div>
          <span className="font-medium text-grey-80">Free delivery</span>
          <p className="text-grey-50 mt-0.5">
            Free delivery within hub cities across Mindanao. Orders placed before 2 PM are delivered next day.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Refresh size="16" color="#16a34a" />
        </div>
        <div>
          <span className="font-medium text-grey-80">Freshness guarantee</span>
          <p className="text-grey-50 mt-0.5">
            Not happy with the freshness? Contact us within 24 hours of delivery for a full replacement.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
