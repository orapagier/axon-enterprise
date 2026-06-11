"use client"

import {
  completeOnboarding,
  type OnboardingState,
} from "@lib/data/onboarding"
import { hubSlugForCity, provinceForCity } from "@lib/constants/hub-cities"
import { validatePhone } from "@lib/util/phone"
import BarangayCombobox from "@modules/common/components/barangay-combobox"
import CityCombobox from "@modules/common/components/city-combobox"
import { useParams } from "next/navigation"
import { useActionState, useMemo, useState } from "react"

type AccountType = "consumer" | "producer" | "trader"

type FieldDef = {
  name: string
  label: string
  placeholder: string
  icon: string
  type?: "text" | "tel" | "textarea" | "city" | "barangay"
  required?: boolean
  helper?: string
  suggestions?: string[]
  /** Span both columns on small+ screens (good for street address). */
  full?: boolean
  /** For barangay fields: which form field holds the city value. */
  cityField?: string
}

const MINDANAO_PROVINCE_SUGGESTIONS = [
  "Davao del Norte",
  "Davao del Sur",
  "Davao de Oro",
  "Bukidnon",
  "Misamis Oriental",
  "South Cotabato",
]

const CONSUMER_FIELDS: FieldDef[] = [
  {
    name: "display_name",
    label: "Display name",
    placeholder: "Jelmar Orapa",
    icon: "👤",
    required: true,
    helper: "Shown to producers when you place orders.",
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
    type: "city",
    required: true,
    helper: "Pick the city with the hub that will serve you.",
  },
  {
    name: "barangay",
    label: "Barangay",
    placeholder: "Type to search barangay",
    icon: "📍",
    type: "barangay",
    required: true,
    full: true,
    cityField: "default_city",
    helper: "Select the barangay where you'd like deliveries.",
  },
  {
    name: "province",
    label: "Province",
    placeholder: "Davao del Norte",
    icon: "📍",
    required: true,
    suggestions: MINDANAO_PROVINCE_SUGGESTIONS,
    helper: "Filled in automatically when you pick a city.",
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

const PRODUCER_FIELDS: FieldDef[] = [
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
    type: "city",
    required: true,
    helper: "The hub city you'll sell through.",
  },
  {
    name: "barangay",
    label: "Barangay",
    placeholder: "Type to search barangay",
    icon: "📍",
    type: "barangay",
    required: true,
    full: true,
    cityField: "primary_hub",
    helper: "The barangay where your farm or business is located.",
  },
  {
    name: "province",
    label: "Province",
    placeholder: "Davao del Norte",
    icon: "📍",
    required: true,
    suggestions: MINDANAO_PROVINCE_SUGGESTIONS,
    helper: "Filled in automatically when you pick a city.",
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

const TRADER_FIELDS: FieldDef[] = [
  {
    name: "business_name",
    label: "Business name",
    placeholder: "Café Aroma, Mindanao Bistro…",
    icon: "🏪",
    required: true,
  },
  {
    name: "business_type",
    label: "Business type",
    placeholder: "Restaurant, café, retail…",
    icon: "🤝",
    required: true,
    suggestions: [
      "Restaurant",
      "Café",
      "Retail store",
      "Distributor",
      "Hotel",
      "Catering",
    ],
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
    label: "Delivery address",
    placeholder: "Building, street, barangay",
    icon: "🏢",
    required: true,
    full: true,
    helper: "Where we'll deliver your standing orders.",
  },
  {
    name: "default_city",
    label: "City / municipality",
    placeholder: "Tagum City",
    icon: "🏙️",
    type: "city",
    required: true,
    helper: "Pick the city with the hub that will serve you.",
  },
  {
    name: "barangay",
    label: "Barangay",
    placeholder: "Type to search barangay",
    icon: "📍",
    type: "barangay",
    required: true,
    full: true,
    cityField: "default_city",
    helper: "Select the barangay where you'd like deliveries.",
  },
  {
    name: "province",
    label: "Province",
    placeholder: "Davao del Norte",
    icon: "📍",
    required: true,
    suggestions: MINDANAO_PROVINCE_SUGGESTIONS,
    helper: "Filled in automatically when you pick a city.",
  },
  {
    name: "postal_code",
    label: "Postal code",
    placeholder: "8100",
    icon: "📮",
    helper: "Optional — helps us route deliveries efficiently.",
  },
  {
    name: "estimated_monthly_volume",
    label: "Estimated monthly volume",
    placeholder: "e.g. 200 kg of vegetables, 50 kg of fruit",
    icon: "📦",
    type: "textarea",
    helper:
      "Optional — helps us match you with the right producers and pricing.",
  },
]

const ROLE_COPY: Record<
  AccountType,
  { eyebrow: string; title: string; subtitle: string; icon: string }
> = {
  consumer: {
    eyebrow: "Consumer profile",
    title: "Tell us a bit about yourself",
    subtitle:
      "Your consumer profile is visible to the Hub so producers can confirm who they're shipping to.",
    icon: "🧺",
  },
  producer: {
    eyebrow: "Producer profile",
    title: "Tell us about your farm",
    subtitle:
      "We'll review your details and notify you once your producer account is verified. Your profile stays private until then.",
    icon: "🌾",
  },
  trader: {
    eyebrow: "Trader profile",
    title: "Tell us about your business",
    subtitle:
      "Trader accounts unlock bulk pricing and standing weekly orders. We'll confirm your business details before activating.",
    icon: "🤝",
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

const FIELDS_BY_ROLE: Record<AccountType, FieldDef[]> = {
  consumer: CONSUMER_FIELDS,
  producer: PRODUCER_FIELDS,
  trader: TRADER_FIELDS,
}

// Banner / progress-bar palette per role. Producer + Trader use the gold/cream
// tone (gated by admin verification); Consumer gets the green tone (open
// signup, immediate use).
const ROLE_PALETTE: Record<
  AccountType,
  { banner: string; bar: string }
> = {
  consumer: {
    banner: "bg-gradient-to-br from-brand-green-50 via-white to-white",
    bar: "bg-gradient-to-r from-brand-green-500 to-brand-green-700",
  },
  producer: {
    banner: "bg-gradient-to-br from-brand-gold-100 via-brand-cream-100 to-white",
    bar: "bg-gradient-to-r from-brand-gold-400 to-brand-gold-600",
  },
  trader: {
    banner: "bg-gradient-to-br from-brand-gold-100 via-brand-cream-100 to-white",
    bar: "bg-gradient-to-r from-brand-gold-400 to-brand-gold-600",
  },
}

export default function OnboardingForm({ accountType, defaults = {} }: Props) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"
  const isProducer = accountType === "producer"
  const isTrader = accountType === "trader"
  const needsAdminVerification = isProducer || isTrader
  const fields = FIELDS_BY_ROLE[accountType]
  const copy = ROLE_COPY[accountType]
  const palette = ROLE_PALETTE[accountType]

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

  // Track which fields the user has blurred at least once. We only show
  // client-side validation errors after a field is touched so users aren't
  // shown errors before they've finished typing.
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Live phone validation. Runs against libphonenumber-js using the URL
  // country slug (/ph, /dk, etc.) — so a PH-shaped number under /dk would
  // fail here the same way the server would reject it.
  const phoneFields = useMemo(
    () => fields.filter((f) => f.type === "tel").map((f) => f.name),
    [fields]
  )

  const clientErrors = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const name of phoneFields) {
      if (!touched[name]) continue
      const raw = (values[name] ?? "").trim()
      if (!raw) continue // empty handled by required-check on submit
      const result = validatePhone(raw, countryCode)
      if (!result.ok) out[name] = result.reason
    }
    return out
  }, [phoneFields, touched, values, countryCode])

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
      <div className={`relative px-7 small:px-12 py-8 ${palette.banner}`}>
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
            className={`h-full rounded-full transition-all duration-500 ease-out ${palette.bar}`}
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
            // Server errors (after submit) win over client errors so the user
            // always sees the authoritative reason.
            const serverErr = state?.fieldErrors?.[f.name]
            const clientErr = clientErrors[f.name]
            const err = serverErr ?? clientErr
            const value = values[f.name] ?? ""
            const isFilled = value.trim().length > 0
            const isPhone = f.type === "tel"
            const isValidPhone =
              isPhone && isFilled && !clientErr && !serverErr
            const onBlur = () =>
              setTouched((t) => (t[f.name] ? t : { ...t, [f.name]: true }))
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
                      {isValidPhone ? "Looks good" : "Saved as you go"}
                    </span>
                  )}
                </span>

                {f.type === "city" ? (
                  <>
                    <CityCombobox
                      value={value || null}
                      onChange={(city) =>
                        setValues((v) => ({
                          ...v,
                          [f.name]: city,
                          // City drives the rest of the cascade: clear the
                          // barangay (it belongs to the old city) and refill
                          // the province.
                          barangay: "",
                          province: provinceForCity(city) ?? v.province ?? "",
                        }))
                      }
                      label=""
                      required={f.required}
                      invalid={!!err}
                      data-testid={`onboarding-${f.name}`}
                    />
                    <input type="hidden" name={f.name} value={value} />
                  </>
                ) : f.type === "barangay" ? (
                  <>
                    <BarangayCombobox
                      hubSlug={hubSlugForCity(values[f.cityField ?? "default_city"] ?? "")}
                      value={value || null}
                      onChange={(b) =>
                        setValues((v) => ({ ...v, [f.name]: b }))
                      }
                      label=""
                      required={f.required}
                      invalid={!!err}
                      data-testid={`onboarding-${f.name}`}
                    />
                    <input type="hidden" name={f.name} value={value} />
                  </>
                ) : f.type === "textarea" ? (
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
                    onBlur={onBlur}
                    list={f.suggestions ? `${f.name}-suggestions` : undefined}
                    autoComplete="off"
                    inputMode={isPhone ? "tel" : undefined}
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
                          setValues((v) => {
                            const next = { ...v, [f.name]: s }
                            if (f.name === "default_city" || f.name === "primary_hub") {
                              next.barangay = ""
                            }
                            return next
                          })
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

        {/* Verification callout — both Producers and Traders need admin OK
            before their account fully unlocks. Copy adapts per role. */}
        {needsAdminVerification && (
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
                  {isProducer
                    ? "Once you save these basics, we'll ask for a valid ID, your farm address, and any organic / quality certifications you hold."
                    : "Once you save these basics, we'll ask for proof of business (DTI / SEC / Mayor's permit) so we can activate bulk pricing on your account."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col xsmall:flex-row xsmall:items-center xsmall:justify-end gap-3 px-7 small:px-12 py-5 bg-grey-5/70 border-t border-grey-10">
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

