"use client"

import {
  createListing,
  updateListing,
  uploadListingPhoto,
  type ListingFormState,
  type SellerListing,
} from "@lib/data/seller"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"
import {
  useActionState,
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
    suggestions: ["Fruits", "Vegetables", "Leafy Greens", "Herbs", "Root Crops", "Fish"],
    helper: "Helps buyers find your listing.",
  },
  {
    name: "origin_country",
    label: "Hub / Origin",
    placeholder: "Bukidnon",
    suggestions: ["Bukidnon", "Davao", "Cagayan de Oro", "General Santos", "Zamboanga"],
  },
  {
    name: "price",
    label: "Price",
    placeholder: "120",
    type: "number",
    required: true,
    prefix: "₱",
    helper: "Per unit (default: per kilogram).",
  },
  {
    name: "unit",
    label: "Unit",
    placeholder: "kg",
    suggestions: ["kg", "piece", "bundle", "tray", "sack"],
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
    seed.selling_mode = typeof meta.selling_mode === "string" ? meta.selling_mode : "direct"
    seed.harvest_date = typeof meta.harvest_date === "string" ? meta.harvest_date : ""
    return seed
  }, [existing])

  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    FIELDS.forEach((f) => {
      seed[f.name] = defaults[f.name] ?? ""
    })
    seed.selling_mode = (defaults.selling_mode as string) ?? "direct"
    seed.harvest_date = (defaults.harvest_date as string) ?? ""
    return seed
  })

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
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    if (!ALLOWED.includes(file.type)) {
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
      const result = await uploadListingPhoto(fd)
      if (result.ok && result.url) {
        setPhotoUrl(result.url)
      } else {
        setUploadError(result.error ?? "Upload failed.")
      }
    })
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const progressPct = useMemo(() => {
    const required = FIELDS.filter((f) => f.required)
    if (!required.length) return 100
    const filled = required.filter((f) => values[f.name]?.trim().length).length
    return Math.round((filled / required.length) * 100)
  }, [values])
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
              Listings start as drafts. Once you submit, our team reviews the
              details and publishes them to the Hub — usually within 24 hours.
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

      {/* Selling mode */}
      <div className="px-7 small:px-12 py-5 border-b border-grey-10 bg-grey-5/30">
        <span className="inline-block text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-3">
          Selling mode
        </span>
        <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
          {([
            { value: "direct", icon: "🛒", label: "Direct to consumer", desc: "List on the marketplace — consumers buy directly from you." },
            { value: "hub", icon: "🏭", label: "Sell to FreshHub", desc: "Sell your harvest in bulk to FreshHub at wholesale rates." },
          ] as const).map((opt) => {
            const active = (values.selling_mode ?? "direct") === opt.value
            return (
              <label
                key={opt.value}
                className={`relative flex items-start gap-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                  active
                    ? "border-brand-green-500 bg-brand-green-50/30 shadow-soft"
                    : "border-grey-10 bg-white hover:border-grey-20"
                }`}
              >
                <input
                  type="radio"
                  name="selling_mode"
                  value={opt.value}
                  checked={active}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, selling_mode: e.target.value }))
                  }
                  className="sr-only"
                />
                <span className="shrink-0 text-xl mt-0.5">{opt.icon}</span>
                <div>
                  <div className="text-body-sm font-semibold text-grey-90">
                    {opt.label}
                    {active && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-brand-green-700 text-[10px] font-bold text-white uppercase tracking-wider">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-caption text-grey-50 mt-1 leading-relaxed">
                    {opt.desc}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Harvest date — hub-only */}
      {(values.selling_mode ?? "direct") === "hub" && (
        <div className="px-7 small:px-12 py-5 border-b border-grey-10 bg-brand-cream-50/40">
          <div className="flex items-start gap-x-3 mb-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 text-sm shrink-0">
              📅
            </span>
            <div>
              <span className="block text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
                Harvest date <span className="text-brand-green-600">*</span>
              </span>
              <p className="text-[11px] text-grey-50 mt-0.5 leading-relaxed">
                FreshHub collects from your area once a week — we need at
                least 7 days&apos; notice to schedule pickup. Set the date
                your harvest will be ready.
              </p>
            </div>
          </div>
          <div className="max-w-xs">
            <div
              className={`relative flex items-center bg-white border rounded-xl transition-all overflow-hidden ${
                state?.fieldErrors?.harvest_date
                  ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
                  : "border-grey-20 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100"
              }`}
            >
              <input
                type="date"
                name="harvest_date"
                min={(() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 7)
                  return d.toISOString().slice(0, 10)
                })()}
                value={values.harvest_date ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, harvest_date: e.target.value }))
                }
                className="w-full px-4 py-3 bg-transparent text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none cursor-pointer"
              />
              <span className="pr-4 text-grey-30 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
            </div>
            {state?.fieldErrors?.harvest_date ? (
              <div className="mt-1.5 text-[11px] text-red-600 font-medium">
                {state.fieldErrors.harvest_date}
              </div>
            ) : (
              <div className="mt-1.5 text-[11px] text-grey-50">
                Must be at least 7 days from today.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-7 small:px-12 py-7">
        {state?.error && !pending && (
          <div className="flex items-start gap-x-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-body-sm font-medium">{state.error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 small:grid-cols-2 gap-5">
          {FIELDS.map((f) => {
            const err = state?.fieldErrors?.[f.name]
            const value = values[f.name] ?? ""
            const isFilled = value.trim().length > 0
            return (
              <label
                key={f.name}
                className={`block ${f.full ? "small:col-span-2" : ""}`}
              >
                <span className="flex items-center justify-between text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-2">
                  <span>
                    {f.label}
                    {f.required && <span className="text-brand-green-600 ml-1">*</span>}
                  </span>
                </span>

                <div
                  className={`relative flex items-center bg-grey-5 border rounded-xl transition-all overflow-hidden ${
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
                  {f.suffix && (
                    <span className="pr-4 pl-1 text-grey-50 font-semibold">
                      {f.suffix}
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
                src={photoUrl}
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
              Submit for review
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
