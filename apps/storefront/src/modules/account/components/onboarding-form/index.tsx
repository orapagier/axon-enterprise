"use client"

import {
  completeOnboarding,
  deferOnboarding,
  type OnboardingState,
} from "@lib/data/onboarding"
import { useParams } from "next/navigation"
import {
  useActionState,
  useMemo,
  useState,
  useTransition,
} from "react"

type AccountType = "buyer" | "seller"

type FieldDef = {
  name: string
  label: string
  placeholder: string
  icon: string
  type?: "text" | "tel" | "textarea"
  required?: boolean
  helper?: string
  suggestions?: string[]
  /** Span both columns on small+ screens (good for street address). */
  full?: boolean
}

const MINDANAO_CITY_SUGGESTIONS = [
  "Tagum City",
  "Davao City",
  "Panabo City",
  "Cagayan de Oro",
  "General Santos",
  "Butuan City",
]

const MINDANAO_PROVINCE_SUGGESTIONS = [
  "Davao del Norte",
  "Davao del Sur",
  "Davao de Oro",
  "Bukidnon",
  "Misamis Oriental",
  "South Cotabato",
]

const BUYER_FIELDS: FieldDef[] = [
  {
    name: "display_name",
    label: "Display name",
    placeholder: "Jelmar Orapa",
    icon: "👤",
    required: true,
    helper: "Shown to sellers when you place orders.",
  },
  {
    name: "phone",
    label: "Phone number",
    placeholder: "0917 555 0144",
    icon: "📞",
    type: "tel",
    required: true,
    helper: "We'll only contact you about deliveries.",
  },
  {
    name: "address_1",
    label: "Street address",
    placeholder: "House #, street, sitio, barangay",
    icon: "🏠",
    required: true,
    full: true,
    helper:
      "Used as your default delivery address. You can add more addresses later.",
  },
  {
    name: "default_city",
    label: "City / municipality",
    placeholder: "Tagum City",
    icon: "🏙️",
    required: true,
    suggestions: MINDANAO_CITY_SUGGESTIONS,
  },
  {
    name: "province",
    label: "Province",
    placeholder: "Davao del Norte",
    icon: "📍",
    required: true,
    suggestions: MINDANAO_PROVINCE_SUGGESTIONS,
  },
  {
    name: "postal_code",
    label: "Postal code",
    placeholder: "8100",
    icon: "📮",
    helper: "Optional — speeds up delivery dispatch when known.",
  },
  {
    name: "buyer_bio",
    label: "A bit about you",
    placeholder: "Café owner, home cook, restaurateur…",
    icon: "✨",
    type: "textarea",
  },
]

const SELLER_FIELDS: FieldDef[] = [
  {
    name: "business_name",
    label: "Business / Farm name",
    placeholder: "Bukidnon Highland Farms",
    icon: "🌾",
    required: true,
  },
  {
    name: "contact_phone",
    label: "Contact phone",
    placeholder: "0917 555 0144",
    icon: "📞",
    type: "tel",
    required: true,
  },
  {
    name: "address_1",
    label: "Farm / business address",
    placeholder: "Sitio, barangay, landmark, road name",
    icon: "🏡",
    required: true,
    full: true,
    helper: "Where our team can visit for verification.",
  },
  {
    name: "primary_hub",
    label: "City / municipality",
    placeholder: "Tagum City",
    icon: "🏙️",
    required: true,
    suggestions: MINDANAO_CITY_SUGGESTIONS,
  },
  {
    name: "province",
    label: "Province",
    placeholder: "Davao del Norte",
    icon: "📍",
    required: true,
    suggestions: MINDANAO_PROVINCE_SUGGESTIONS,
  },
  {
    name: "postal_code",
    label: "Postal code",
    placeholder: "8100",
    icon: "📮",
    helper: "Optional — helps us route pickups efficiently.",
  },
  {
    name: "products_offered",
    label: "What you grow / catch",
    placeholder: "Tomatoes, leafy greens, tilapia…",
    icon: "🪴",
    type: "textarea",
    required: true,
    helper: "Used to recommend you to relevant buyers.",
  },
]

const ROLE_COPY: Record<
  AccountType,
  { eyebrow: string; title: string; subtitle: string; icon: string }
> = {
  buyer: {
    eyebrow: "Buyer profile",
    title: "Tell us a bit about yourself",
    subtitle:
      "Your buyer profile is visible to the Hub so sellers can confirm who they're shipping to.",
    icon: "🧺",
  },
  seller: {
    eyebrow: "Seller profile",
    title: "Tell us about your farm",
    subtitle:
      "We'll review your details and notify you once your seller account is verified. Your profile stays private until then.",
    icon: "🌾",
  },
}

const initialState: OnboardingState = {
  ok: false,
  error: null,
  fieldErrors: null,
}

type Props = {
  accountType: AccountType
  /** Pre-fill any keys we already know. */
  defaults?: Partial<Record<string, string>>
}

export default function OnboardingForm({ accountType, defaults = {} }: Props) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"
  const isSeller = accountType === "seller"
  const fields = isSeller ? SELLER_FIELDS : BUYER_FIELDS
  const copy = ROLE_COPY[accountType]

  const [state, formAction, pending] = useActionState<
    OnboardingState,
    FormData
  >(completeOnboarding, initialState)

  // Track field values locally so we can drive progress + persist on submit retry.
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce(
      (acc, f) => ({ ...acc, [f.name]: defaults[f.name] ?? "" }),
      {}
    )
  )

  const [deferPending, startDefer] = useTransition()

  // Live progress bar
  const progressPct = useMemo(() => {
    const required = fields.filter((f) => f.required)
    if (!required.length) return 100
    const filled = required.filter((f) => values[f.name]?.trim().length).length
    return Math.round((filled / required.length) * 100)
  }, [values, fields])

  const allRequiredFilled = progressPct === 100

  return (
    <form
      action={formAction}
      className="bg-white rounded-3xl shadow-large border border-grey-10/60 overflow-hidden"
      noValidate
    >
      <input type="hidden" name="countryCode" value={countryCode} />

      {/* Banner */}
      <div
        className={`relative px-7 small:px-12 py-8 ${
          isSeller
            ? "bg-gradient-to-br from-brand-gold-100 via-brand-cream-100 to-white"
            : "bg-gradient-to-br from-brand-green-50 via-white to-white"
        }`}
      >
        <div className="flex items-start gap-x-4">
          <span className="text-4xl leading-none drop-shadow-sm">
            {copy.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-white text-[10px] font-bold text-grey-70 uppercase tracking-[0.14em]">
                {copy.eyebrow}
              </span>
              {/* Live progress chip */}
              <span
                className={`inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] ${
                  allRequiredFilled
                    ? "bg-brand-green-600 text-white"
                    : "bg-white/80 backdrop-blur-sm border border-white text-grey-60"
                }`}
              >
                {allRequiredFilled ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="tabular-nums">{progressPct}%</span>
                )}
                {allRequiredFilled ? "Ready" : "In progress"}
              </span>
            </div>
            <h1 className="font-heading font-bold text-2xl xsmall:text-3xl small:text-4xl text-grey-90 leading-tight tracking-[-0.015em]">
              {copy.title}
            </h1>
            <p className="text-body-sm text-grey-60 mt-2 leading-relaxed max-w-lg">
              {copy.subtitle}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1 rounded-full bg-white/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isSeller
                ? "bg-gradient-to-r from-brand-gold-400 to-brand-gold-600"
                : "bg-gradient-to-r from-brand-green-500 to-brand-green-700"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-7 small:px-12 py-7">
        {/* Top-level error */}
        {state?.error && !pending && (
          <div className="flex items-start gap-x-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 mb-5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-body-sm font-medium">{state.error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 small:grid-cols-2 gap-5">
          {fields.map((f) => {
            const err = state?.fieldErrors?.[f.name]
            const value = values[f.name] ?? ""
            const isFilled = value.trim().length > 0
            return (
              <label
                key={f.name}
                className={`block ${
                  f.type === "textarea" || f.full ? "small:col-span-2" : ""
                }`}
              >
                <span className="flex items-center justify-between text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-2">
                  <span>
                    <span className="mr-1.5">{f.icon}</span>
                    {f.label}
                    {f.required && (
                      <span className="text-brand-green-600 ml-1">*</span>
                    )}
                  </span>
                  {isFilled && !err && (
                    <span className="inline-flex items-center gap-x-1 text-[10px] text-brand-green-700 normal-case tracking-normal">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved as you go
                    </span>
                  )}
                </span>

                {f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    placeholder={f.placeholder}
                    value={value}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.name]: e.target.value }))
                    }
                    rows={3}
                    className={`w-full px-4 py-3 bg-grey-5 border rounded-xl text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:ring-2 focus:bg-white transition-all resize-none ${
                      err
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-grey-10 focus:border-brand-green-300 focus:ring-brand-green-100"
                    }`}
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
                    autoComplete="off"
                    className={`w-full px-4 py-3 bg-grey-5 border rounded-xl text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      err
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-grey-10 focus:border-brand-green-300 focus:ring-brand-green-100"
                    }`}
                  />
                )}

                {/* Suggestion chips */}
                {f.suggestions && !isFilled && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.suggestions.map((s) => (
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

                {/* Datalist for accessibility / native autocomplete */}
                {f.suggestions && (
                  <datalist id={`${f.name}-suggestions`}>
                    {f.suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}

                {err ? (
                  <div className="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-x-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {err}
                  </div>
                ) : f.helper ? (
                  <div className="mt-1.5 text-[11px] text-grey-50">
                    {f.helper}
                  </div>
                ) : null}
              </label>
            )
          })}
        </div>

        {/* Seller-only callout */}
        {isSeller && (
          <div className="mt-6 p-4 rounded-xl bg-brand-cream-50 border border-brand-gold-200">
            <div className="flex items-start gap-x-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand-gold-700 mt-0.5 shrink-0"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div>
                <div className="text-body-sm font-semibold text-brand-gold-900">
                  Next: documents &amp; verification
                </div>
                <div className="text-caption text-brand-gold-800 mt-0.5 leading-relaxed">
                  Once you save these basics, we&apos;ll ask for a valid ID,
                  your farm address, and any organic / quality certifications
                  you hold.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col xsmall:flex-row xsmall:items-center xsmall:justify-between gap-3 px-7 small:px-12 py-5 bg-grey-5/70 border-t border-grey-10">
        <button
          type="button"
          disabled={deferPending}
          onClick={() => startDefer(() => deferOnboarding(countryCode))}
          className="text-body-sm font-medium text-grey-60 hover:text-grey-90 transition-colors disabled:opacity-50 text-left"
        >
          {deferPending ? "Skipping…" : "I'll do this later"}
        </button>

        <button
          type="submit"
          disabled={pending || !allRequiredFilled}
          className={`group inline-flex items-center justify-center gap-x-2 px-6 py-3 rounded-xl text-body-sm font-semibold transition-all disabled:cursor-not-allowed shadow-medium ${
            allRequiredFilled && !pending
              ? "bg-brand-green-700 hover:bg-brand-green-800 text-white hover:-translate-y-0.5 hover:shadow-large"
              : "bg-grey-90/70 text-white/80"
          }`}
        >
          {pending ? (
            <>
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
              Saving…
            </>
          ) : (
            <>
              Save &amp; continue
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

