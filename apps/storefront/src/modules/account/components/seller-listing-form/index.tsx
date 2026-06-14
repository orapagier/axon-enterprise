"use client"

import {
  createListing,
  updateListing,
  type ListingFormState,
  type SellerListing,
} from "@lib/data/seller"
import { listOpenPickupWindows, type PickupWindow } from "@lib/data/pickup"
import { resolveImageSrc } from "@lib/util/image-url"
import { sdk } from "@lib/config"
import { syncCustomerHubFromCookie } from "@modules/hub/actions/set-hub"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ListingTypeField from "@modules/producer/components/listing-type-field"
import HarvestDateField from "@modules/producer/components/harvest-date-field"
import PickupWindowSelect from "@modules/producer/components/pickup-window-select"
import EstimatedKgField from "@modules/producer/components/estimated-kg-field"
import { useParams } from "next/navigation"
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react"

type Mode = "create" | "edit"

type FieldDef = {
  name: string
  label: string
  placeholder: string
  type?: "text" | "textarea" | "number" | "url"
  required?: boolean
  helper?: string
  prefix?: string
  suffix?: string
  full?: boolean
  suggestions?: string[]
}

const FIELDS: FieldDef[] = [
  {
    name: "title",
    label: "Listing title",
    placeholder: "Sweet Mangoes from Bukidnon",
    required: true,
    helper: "Shown to buyers as the product name.",
    full: true,
  },
  {
    name: "category",
    label: "Category",
    placeholder: "Fruits",
    suggestions: ["Fruits", "Vegetables", "Leafy Greens", "Root Crops", "Herbs & Spices", "Rice & Grains", "Fish & Seafood", "Meat & Poultry", "Eggs & Dairy", "Coconut & Oil", "Dried & Preserved", "Ready-to-Cook", "Beverages", "Pasalubong"],
    helper: "Helps buyers find your listing.",
  },
  {
    name: "origin_country",
    label: "Hub / Origin",
    placeholder: "Tagum City",
    suggestions: [
      "Tagum City",
      "Davao City",
      "Bukidnon",
      "Cagayan de Oro",
      "General Santos",
      "Zamboanga",
    ],
  },
  {
    name: "price",
    label: "Asking price",
    placeholder: "120",
    type: "number",
    required: true,
    prefix: "₱",
    helper:
      "Per unit (default: per kilogram). The hub may adjust the retail price at approval.",
  },
  {
    name: "unit",
    label: "Unit",
    placeholder: "kg",
    suggestions: ["kg", "piece", "bundle", "tray", "sack"],
  },
  {
    // Direct listings only — hub listings get stock set at approval.
    name: "quantity",
    label: "Available stock",
    placeholder: "50",
    type: "number",
    required: true,
    helper:
      "How much you can sell right now. Buyers see what's left, and every order counts it down automatically.",
  },
  {
    name: "description",
    label: "Description",
    placeholder:
      "Picked this morning. Sweet, perfect for desserts. Available in 1kg, 5kg crates…",
    type: "textarea",
    full: true,
  },
]

const initialState: ListingFormState = {
  ok: false,
  error: null,
  fieldErrors: null,
}

type Props = {
  mode: Mode
  existing?: SellerListing | null
}

export default function SellerListingForm({ mode, existing }: Props) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"
  const action = mode === "create" ? createListing : updateListing

  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    action,
    initialState
  )

  // Category suggestions come straight from the backend DB so producers pick
  // the same categories admin manages — keeping new listings matchable by the
  // storefront's DB-driven category filter. Falls back to the static list if
  // the fetch fails.
  const [dbCategoryNames, setDbCategoryNames] = useState<string[]>([])
  useEffect(() => {
    let active = true
    sdk.client
      .fetch<{ product_categories: { name: string; rank: number | null }[] }>(
        "/store/product-categories",
        { query: { fields: "name,rank", limit: 100 } }
      )
      .then((res) => {
        if (!active) return
        const names = (res.product_categories ?? [])
          .slice()
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
          .map((c) => c.name)
        if (names.length) setDbCategoryNames(names)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const fields = useMemo<FieldDef[]>(
    () =>
      FIELDS.map((f) =>
        f.name === "category" && dbCategoryNames.length
          ? { ...f, suggestions: dbCategoryNames }
          : f
      ),
    [dbCategoryNames]
  )

  const defaults = useMemo<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    if (!existing) return seed
    const meta = (existing.metadata ?? {}) as Record<string, unknown>
    const firstPrice = existing.variants?.[0]?.prices?.[0]?.amount
    seed.title = existing.title ?? ""
    seed.description = existing.description ?? ""
    seed.thumbnail = existing.thumbnail ?? ""
    seed.origin_country = existing.origin_country ?? ""
    seed.category = typeof meta.category === "string" ? meta.category : ""
    seed.unit = typeof meta.unit === "string" ? meta.unit : "kg"
    seed.price = firstPrice ? String(firstPrice) : ""
    seed.quantity =
      existing.stock_quantity != null ? String(existing.stock_quantity) : ""
    seed.harvest_date = typeof meta.harvest_date === "string" ? meta.harvest_date : ""
    // Use listing row status + type from the listing payload
    const listing = (existing as unknown as { listing?: Record<string, unknown> }).listing
    seed.listing_status = typeof listing?.status === "string" ? listing.status : "draft"
    seed.listing_type =
      typeof listing?.listing_type === "string"
        ? listing.listing_type
        : "direct_to_consumer"
    return seed
  }, [existing])

  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    FIELDS.forEach((f) => {
      seed[f.name] = defaults[f.name] ?? ""
    })
    seed.harvest_date = (defaults.harvest_date as string) ?? ""
    seed.pickup_window_id = ""
    seed.estimated_kg = ""
    seed.listing_status = (defaults.listing_status as string) ?? "draft"
    seed.listing_type = (defaults.listing_type as string) ?? "direct_to_consumer"
    return seed
  })

  // Pickup windows for the producer's hub area
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([])
  const [pickupLoading, setPickupLoading] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [hubMissing, setHubMissing] = useState(false)

  useEffect(() => {
    if (!values.harvest_date) {
      setPickupWindows([])
      return
    }

    let cancelled = false
    setPickupLoading(true)
    setPickupError(null)
    setHubMissing(false)

    const load = async (allowRecovery: boolean) => {
      const result = await listOpenPickupWindows(
        values.harvest_date,
        values.harvest_date,
        20
      )
      if (cancelled) return

      if (result.ok) {
        setPickupLoading(false)
        setPickupWindows(result.windows)
        return
      }

      // Producers often pick a hub anonymously before signing up, leaving
      // the cookie set but no DB link. Try a one-shot repair from the
      // cookie before surfacing the CTA.
      if (result.code === "NO_HUB_ASSIGNED" && allowRecovery) {
        const sync = await syncCustomerHubFromCookie()
        if (cancelled) return
        if (sync.ok && sync.slug) {
          await load(false)
          return
        }
        setPickupLoading(false)
        setHubMissing(true)
        return
      }

      setPickupLoading(false)
      setPickupError(result.error ?? "Failed to load pickup windows.")
    }

    load(true).catch(() => {
      if (cancelled) return
      setPickupLoading(false)
      setPickupError("Couldn't reach the server.")
    })

    return () => {
      cancelled = true
    }
  }, [values.harvest_date])

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState<string>(
    existing?.thumbnail ?? ""
  )
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, startUpload] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !fileList[0]) return
    const file = fileList[0]
    setUploadError(null)
    const MAX_BYTES = 4 * 1024 * 1024
    const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "avif"]
    // Some browsers (notably Safari/iOS for .webp) report an empty or
    // application/octet-stream type. Fall back to the extension so we don't
    // reject legitimate images client-side.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const mimeOk = ALLOWED_MIME.includes(file.type)
    const extOk = ALLOWED_EXT.includes(ext)
    if (!mimeOk && !extOk) {
      setUploadError("Use a JPG, PNG, WebP or AVIF image.")
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError("That image is too large — keep it under 4 MB.")
      return
    }
    startUpload(async () => {
      const fd = new FormData()
      fd.append("files", file)
      // Plain fetch to a same-origin route handler — server actions choke on
      // multipart bodies (size limit / origin checks) and surface a bare
      // "Failed to fetch" when they do.
      try {
        const res = await fetch("/api/seller/upload", {
          method: "POST",
          body: fd,
        })
        const data = (await res.json().catch(() => ({}))) as {
          files?: Array<{ url?: string }>
          error?: string
        }
        const url = data.files?.[0]?.url
        if (res.ok && url) {
          setPhotoUrl(url)
        } else {
          setUploadError(data.error ?? "Upload failed. Please try again.")
        }
      } catch {
        setUploadError(
          "Couldn't reach the server — check your connection and try again."
        )
      }
    })
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const isSellToHub = values.listing_type === "sell_to_freshhub"
  const isDraft = values.listing_status === "draft"

  const progressPct = useMemo(() => {
    // Hub-logistics fields live outside FIELDS and are only required when the
    // harvest is committed to a hub pickup slot (sell_to_freshhub). Once the
    // slot is reserved (listing no longer draft) they're locked and shouldn't
    // gate edits to the product details.
    const requiredKeys = [
      // Available stock only applies to direct listings — the hub sets stock
      // for sell_to_freshhub at approval.
      ...FIELDS.filter(
        (f) => f.required && !(f.name === "quantity" && isSellToHub)
      ).map((f) => f.name),
      ...(isSellToHub && isDraft
        ? ["harvest_date", "pickup_window_id", "estimated_kg"]
        : []),
    ]
    const filled = requiredKeys.filter((k) => values[k]?.trim().length).length
    return Math.round((filled / requiredKeys.length) * 100)
  }, [values, isSellToHub, isDraft])
  const ready = progressPct === 100

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl shadow-large border border-grey-10/60 overflow-hidden"
      noValidate
    >
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="thumbnail" value={photoUrl} />
      {existing && <input type="hidden" name="id" value={existing.id} />}
      {/* The type toggle is disabled (non-submitting) once locked in edit
          mode, so relay the value for the server action's validation. */}
      {mode === "edit" && (
        <input type="hidden" name="listing_type" value={values.listing_type} />
      )}

      {/* Banner */}
      <div className="relative px-7 small:px-12 py-7 bg-gradient-to-br from-brand-gold-100 via-brand-cream-100 to-white">
        <div className="flex items-start gap-x-4">
          <span className="text-4xl leading-none">🌾</span>
          <div className="flex-1">
            <div className="flex items-center gap-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-white text-[10px] font-bold text-grey-70 uppercase tracking-[0.14em]">
                {mode === "create" ? "New listing" : "Edit listing"}
              </span>
              <span
                className={`inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] ${
                  ready
                    ? "bg-brand-green-700 text-white"
                    : "bg-white/80 backdrop-blur-sm border border-white text-grey-60"
                }`}
              >
                {ready ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="tabular-nums">{progressPct}%</span>
                )}
                {ready ? "Ready to submit" : "In progress"}
              </span>
            </div>
            <h1 className="font-heading font-bold text-2xl xsmall:text-3xl text-grey-90 leading-tight tracking-[-0.015em]">
              {mode === "create"
                ? "Post a new listing"
                : "Edit listing"}
            </h1>
            <p className="text-body-sm text-grey-60 mt-2 leading-relaxed max-w-xl">
              {isSellToHub
                ? "Sell-to-FreshHub listings start as drafts. Once you submit, the hub receives your harvest, reviews the details, and publishes the product — usually within 24 hours."
                : "Direct listings go live in the shop as soon as you submit. You're the seller, so freshness and quality are your responsibility — buyers see a notice about this."}
            </p>
          </div>
        </div>

        <div className="mt-5 h-1 rounded-full bg-white/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-gold-400 to-brand-gold-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Sell directly (producer is the seller) vs sell to the hub. Locked
          after creation — switching tracks would orphan or require a pickup
          slot reservation. */}
      <ListingTypeField
        value={values.listing_type}
        onChange={(val) =>
          setValues((v) => ({
            ...v,
            listing_type: val,
            // Hub-intake fields don't apply to direct listings.
            harvest_date: val === "direct_to_consumer" ? "" : v.harvest_date,
            pickup_window_id:
              val === "direct_to_consumer" ? "" : v.pickup_window_id,
            estimated_kg: val === "direct_to_consumer" ? "" : v.estimated_kg,
          }))
        }
        disabled={mode === "edit" || !isDraft}
      />

      {/* Hub logistics — sell_to_freshhub commits to a pickup slot */}
      <HarvestDateField
        value={values.harvest_date}
        onChange={(val) => setValues((v) => ({ ...v, harvest_date: val, pickup_window_id: "" }))}
        visible={isSellToHub}
        disabled={!isDraft}
        error={state.fieldErrors?.harvest_date ?? null}
      />

      {hubMissing && isSellToHub ? (
        <div className="px-7 small:px-12 py-5 border-b border-grey-10 bg-grey-5/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
              Pickup window
            </span>
            <span className="text-[10px] text-grey-50">
              Required for Sell to FreshHub
            </span>
          </div>
          <div className="py-4 px-4 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-body-sm font-medium text-amber-900">
              Set your home hub before listing products.
            </p>
            <p className="mt-1 text-caption text-amber-800/90">
              FreshHub pickup windows are scheduled per hub. Pick yours so we
              can show the right slots for your harvest date.
            </p>
            <LocalizedClientLink
              href="/account/profile"
              className="inline-flex items-center gap-x-1.5 mt-3 px-3 py-2 rounded-lg bg-amber-900 text-white text-body-sm font-medium hover:bg-amber-950 transition-colors"
            >
              Pick your home hub
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </LocalizedClientLink>
          </div>
        </div>
      ) : (
        <PickupWindowSelect
          value={values.pickup_window_id}
          onChange={(val) =>
            setValues((v) => ({ ...v, pickup_window_id: val }))
          }
          windows={pickupWindows}
          loading={pickupLoading}
          error={pickupError}
          visible={isSellToHub}
          disabled={!isDraft}
        />
      )}

      <EstimatedKgField
        value={values.estimated_kg}
        onChange={(val) =>
          setValues((v) => ({ ...v, estimated_kg: val }))
        }
        visible={isSellToHub}
        disabled={!isDraft}
        error={state.fieldErrors?.estimated_kg ?? null}
      />

      {/* Product fields */}
      <div className="px-7 small:px-12 py-6">
        <span className="inline-block text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-4">
          Product details
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          {fields.map((f) => {
            // Stock is a direct-listing field; hub intake volume is covered
            // by the estimated kg above.
            if (f.name === "quantity" && isSellToHub) return null

            const value = values[f.name] ?? ""
            const isFilled = value.trim().length > 0
            const err = f.required
              ? state.fieldErrors?.[f.name] ?? null
              : null
            // The stock field reads in the unit the producer sells by.
            const suffix =
              f.name === "quantity" ? values.unit?.trim() || "kg" : f.suffix

            if (f.full) {
              return (
                <label
                  key={f.name}
                  className="sm:col-span-2 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
                      {f.label}{f.required ? " *" : ""}
                    </span>
                    {isFilled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500" />
                    )}
                  </div>
                  <div
                    className={`flex items-center rounded-xl border-2 bg-white transition-all ${
                      err
                        ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
                        : "border-grey-10 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100 focus-within:bg-white"
                    }`}
                  >
                    {f.prefix && (
                      <span className="pl-4 pr-1 text-grey-50 font-semibold">
                        {f.prefix}
                      </span>
                    )}
                    {f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        placeholder={f.placeholder}
                        value={value}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.name]: e.target.value }))
                        }
                        rows={4}
                        className="w-full px-4 py-3 bg-transparent text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none resize-none"
                      />
                    ) : (
                      <input
                        type={f.type ?? "text"}
                        name={f.name}
                        placeholder={f.placeholder}
                        value={value}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.name]: e.target.value }))
                        }
                        list={f.suggestions ? `${f.name}-suggestions` : undefined}
                        inputMode={f.type === "number" ? "numeric" : undefined}
                        autoComplete="off"
                        className={`w-full py-3 bg-transparent text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none ${
                          f.prefix ? "pl-0 pr-4" : "px-4"
                        }`}
                      />
                    )}
                    {suffix && (
                      <span className="pr-4 pl-1 text-grey-50 font-semibold">
                        {suffix}
                      </span>
                    )}
                    {f.suggestions && (
                      <datalist id={`${f.name}-suggestions`}>
                        {f.suggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  {f.suggestions && !isFilled && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {f.suggestions.slice(0, 5).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setValues((v) => ({ ...v, [f.name]: s }))
                          }
                          className="px-2.5 py-1 rounded-full bg-grey-5 hover:bg-brand-green-50 border border-grey-10 hover:border-brand-green-200 text-[11px] text-grey-70 hover:text-brand-green-700 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {err ? (
                    <div className="mt-1.5 text-[11px] text-red-600 font-medium">
                      {err}
                    </div>
                  ) : f.helper ? (
                    <div className="mt-1.5 text-[11px] text-grey-50">{f.helper}</div>
                  ) : null}
                </label>
              )
            }

            return (
              <label
                key={f.name}
                className="flex flex-col"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
                    {f.label}{f.required ? " *" : ""}
                  </span>
                  {isFilled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500" />
                  )}
                </div>
                <div
                  className={`flex items-center rounded-xl border-2 bg-white transition-all ${
                    err
                      ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
                      : "border-grey-10 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100 focus-within:bg-white"
                  }`}
                >
                  {f.prefix && (
                    <span className="pl-4 pr-1 text-grey-50 font-semibold">
                      {f.prefix}
                    </span>
                  )}
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      placeholder={f.placeholder}
                      value={value}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-transparent text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none resize-none"
                    />
                  ) : (
                    <input
                      type={f.type ?? "text"}
                      name={f.name}
                      placeholder={f.placeholder}
                      value={value}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                      list={f.suggestions ? `${f.name}-suggestions` : undefined}
                      inputMode={f.type === "number" ? "numeric" : undefined}
                      autoComplete="off"
                      className={`w-full py-3 bg-transparent text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none ${
                        f.prefix ? "pl-0 pr-4" : "px-4"
                      }`}
                    />
                  )}
                  {suffix && (
                    <span className="pr-4 pl-1 text-grey-50 font-semibold">
                      {suffix}
                    </span>
                  )}
                  {f.suggestions && (
                    <datalist id={`${f.name}-suggestions`}>
                      {f.suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>

                {f.suggestions && !isFilled && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.suggestions.slice(0, 5).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setValues((v) => ({ ...v, [f.name]: s }))
                        }
                        className="px-2.5 py-1 rounded-full bg-grey-5 hover:bg-brand-green-50 border border-grey-10 hover:border-brand-green-200 text-[11px] text-grey-70 hover:text-brand-green-700 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {err ? (
                  <div className="mt-1.5 text-[11px] text-red-600 font-medium">
                    {err}
                  </div>
                ) : f.helper ? (
                  <div className="mt-1.5 text-[11px] text-grey-50">{f.helper}</div>
                ) : null}
              </label>
            )
          })}
        </div>

        {/* Photo uploader */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
              Listing photo
            </span>
            <span className="text-[10px] text-grey-50">
              JPG, PNG, WebP · up to 4 MB
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {photoUrl ? (
            // Preview state — photo is uploaded
            <div className="relative aspect-[16/9] max-w-md rounded-2xl overflow-hidden ring-1 ring-grey-10 bg-grey-5 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageSrc(photoUrl)}
                alt={values.title || "Listing photo"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-grey-90/85 to-transparent pointer-events-none">
                <div className="font-heading font-bold text-white">
                  {values.title || "Listing title"}
                </div>
                {values.price && (
                  <div className="text-caption text-white/80">
                    ₱{values.price}/{values.unit || "kg"}
                  </div>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-x-1.5 pl-3 pr-3.5 py-1.5 rounded-full bg-white text-grey-90 text-caption font-semibold shadow-medium hover:bg-grey-90 hover:text-white transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl("")
                    setUploadError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  disabled={uploading}
                  aria-label="Remove photo"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-grey-70 shadow-medium hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-x-2 text-body-sm font-semibold text-grey-90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-ring">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Replacing…
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Empty state — drop zone / picker
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative aspect-[16/9] max-w-md rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center px-6 py-8 transition-all cursor-pointer ${
                dragOver
                  ? "border-brand-green-500 bg-brand-green-50/60"
                  : uploadError
                    ? "border-red-300 bg-red-50/40"
                    : "border-grey-20 bg-grey-5 hover:border-brand-green-300 hover:bg-brand-green-50/40"
              }`}
            >
              {uploading ? (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green-700 animate-ring mb-3">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <div className="text-body-sm font-semibold text-grey-90">
                    Uploading photo…
                  </div>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-grey-10 mb-3 shadow-soft">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green-700">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <div className="text-body-sm font-semibold text-grey-90">
                    Drop a photo here or{" "}
                    <span className="text-brand-green-700 underline underline-offset-2 decoration-2 decoration-brand-gold-400">
                      browse
                    </span>
                  </div>
                  <div className="text-[11px] text-grey-50 mt-1">
                    Shows up as the cover image on your listing.
                  </div>
                </>
              )}
            </div>
          )}

          {uploadError && !uploading && (
            <div className="mt-2 text-[11px] text-red-600 font-medium flex items-center gap-x-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Top-level error banner — shown when the server action returns
          state.error (auth expired, profile incomplete, validation rejection,
          etc.). Without this, failures are silent and the submit button just
          flickers through "Saving…" back to "Submit for review". */}
      {state.error && (
        <div
          role="alert"
          className="mx-7 small:mx-12 mb-4 -mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800 flex items-start gap-x-2"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-medium">{state.error}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col xsmall:flex-row xsmall:items-center xsmall:justify-between gap-3 px-7 small:px-12 py-5 bg-grey-5/70 border-t border-grey-10">
        <LocalizedClientLink
          href="/account/producer"
          className="text-body-sm font-medium text-grey-60 hover:text-grey-90 transition-colors text-left"
        >
          Cancel
        </LocalizedClientLink>

        <button
          type="submit"
          disabled={pending || !ready}
          className={`group inline-flex items-center justify-center gap-x-2 px-6 py-3 rounded-xl text-body-sm font-semibold transition-all disabled:cursor-not-allowed shadow-medium ${
            ready && !pending
              ? "bg-brand-green-700 hover:bg-brand-green-800 text-white hover:-translate-y-0.5 hover:shadow-large"
              : "bg-grey-90/70 text-white/80"
          }`}
        >
          {pending ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-ring">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Saving…
            </>
          ) : mode === "create" ? (
            <>
              {isSellToHub ? "Submit for review" : "Publish listing"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          ) : (
            <>
              Save changes
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}