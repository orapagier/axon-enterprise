"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP,
  type DeliveryHub,
} from "@lib/util/delivery-hub-types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
  /** Resolved from the customer's saved address — tailors the shipping copy. */
  hub?: DeliveryHub
}

const ProductTabs = ({ product, hub }: ProductTabsProps) => {
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
      component: <ShippingInfoTab hub={hub} />,
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

const ShippingInfoTab = ({ hub }: { hub?: DeliveryHub }) => {
  const noHub = hub && !hub.isHubCity
  return (
    <div className="text-body-sm py-6 space-y-4">
      <div className="flex items-start gap-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FastDelivery size="16" color="#16a34a" />
        </div>
        <div>
          {noHub ? (
            <>
              <span className="font-medium text-grey-80">
                No hub in {hub!.city} yet
              </span>
              <p className="text-grey-50 mt-0.5">
                We&apos;re expanding city by city. If you&apos;d like to bring
                the Hub to {hub!.city}, we&apos;d love to talk —{" "}
                <a
                  href={`/partner-hub`}
                  className="text-brand-green-700 font-medium underline-offset-2 hover:underline"
                >
                  become a partner hub
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <span className="font-medium text-grey-80">
                Free delivery in {hub?.city ?? "your hub city"}
              </span>
              <p className="text-grey-50 mt-0.5">
                Order before 12 PM for that day&apos;s 4 PM dispatch. After
                cut-off, a flat ₱{DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP} delivery
                fee applies — roughly the one-way fare from your address to
                our hub.
              </p>
            </>
          )}
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
