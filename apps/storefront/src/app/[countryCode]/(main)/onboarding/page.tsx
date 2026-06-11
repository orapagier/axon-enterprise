import { retrieveCustomer } from "@lib/data/customer"
import OnboardingForm from "@modules/account/components/onboarding-form"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Complete your profile",
  description:
    "Finish setting up your Mindanao Fresh Hub account before buying or selling.",
}

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function OnboardingPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  // Read the stored account type with legacy aliasing — dev accounts created
  // before the CPT rename still carry "buyer"/"seller" in metadata.
  type RoleStored =
    | "consumer"
    | "producer"
    | "trader"
    | "rider"
    | "buyer"
    | "seller"
  const rawRole = customer.metadata?.account_type as RoleStored | undefined
  const accountType: "consumer" | "producer" | "trader" | "rider" =
    rawRole === "seller"
      ? "producer"
      : rawRole === "buyer"
        ? "consumer"
        : (rawRole ?? "consumer")
  const profileCompleted = Boolean(customer.metadata?.profile_completed)

  if (profileCompleted) {
    redirect(`/${countryCode}/account`)
  }

  // Riders have no onboarding form (their profile is marked complete at
  // signup); if one lands here anyway, send them home instead of a 404.
  if (accountType === "rider") {
    redirect(`/${countryCode}/account`)
  }

  if (
    accountType !== "consumer" &&
    accountType !== "producer" &&
    accountType !== "trader"
  ) {
    notFound()
  }

  const isProducer = accountType === "producer"
  const isTrader = accountType === "trader"

  // Prefill anything we already know about the customer. On re-onboarding,
  // an existing default-shipping address is the most authoritative source
  // for the address fields; metadata is the fallback.
  const meta = (customer.metadata ?? {}) as Record<string, string | undefined>
  const fullName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim()
  const existingAddress =
    (customer.addresses ?? []).find((a) => a.is_default_shipping) ??
    (customer.addresses ?? [])[0] ??
    null

  let defaults: Partial<Record<string, string>>
  if (isProducer) {
    defaults = {
      business_name: meta.business_name ?? customer.company_name ?? "",
      primary_hub: existingAddress?.city ?? meta.primary_hub ?? "",
      contact_phone: customer.phone ?? "",
      products_offered: meta.products_offered ?? "",
      address_1:
        existingAddress?.address_1 ?? meta.farm_address_1 ?? "",
      province: existingAddress?.province ?? meta.farm_province ?? "",
      postal_code:
        existingAddress?.postal_code ?? meta.farm_postal_code ?? "",
    }
  } else if (isTrader) {
    defaults = {
      business_name: meta.business_name ?? customer.company_name ?? "",
      business_type: meta.business_type ?? "",
      contact_phone: customer.phone ?? "",
      default_city: existingAddress?.city ?? meta.default_city ?? "",
      address_1:
        existingAddress?.address_1 ?? meta.default_address_1 ?? "",
      province:
        existingAddress?.province ?? meta.default_province ?? "",
      postal_code:
        existingAddress?.postal_code ?? meta.default_postal_code ?? "",
      estimated_monthly_volume: meta.estimated_monthly_volume ?? "",
    }
  } else {
    // Consumer
    defaults = {
      display_name: meta.display_name ?? fullName,
      phone: customer.phone ?? "",
      default_city: existingAddress?.city ?? meta.default_city ?? "",
      buyer_bio: meta.buyer_bio ?? "",
      address_1:
        existingAddress?.address_1 ?? meta.default_address_1 ?? "",
      province:
        existingAddress?.province ?? meta.default_province ?? "",
      postal_code:
        existingAddress?.postal_code ?? meta.default_postal_code ?? "",
    }
  }

  return (
    <div className="relative bg-grey-5 min-h-[calc(100vh-104px)] overflow-hidden">
      {/* Ambient flourishes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-green-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full bg-brand-gold-200/30 blur-3xl"
      />

      <div className="relative content-container py-10 small:py-14">
        <div className="max-w-3xl mx-auto">
          {/* Greeting + step indicator */}
          <div className="flex flex-col items-center text-center mb-8">
            <span className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full bg-white border border-grey-10 shadow-soft mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500" />
              <span className="text-[10px] font-bold text-grey-70 uppercase tracking-[0.18em]">
                Almost there
              </span>
            </span>
            <h1 className="font-heading italic font-bold text-[28px] xsmall:text-[36px] small:text-[44px] text-grey-90 leading-[1.05] tracking-[-0.02em]">
              Welcome to the Hub,{" "}
              <span className="not-italic text-brand-green-700">
                {customer.first_name ||
                  (customer.email?.split("@")[0] ?? "friend")}
              </span>
              <span className="text-brand-gold-500">.</span>
            </h1>
            <p className="text-body-sm text-grey-50 mt-3 max-w-md leading-relaxed">
              {isProducer
                ? "A few quick details so our admins can verify your farm."
                : isTrader
                  ? "A few quick details so we can activate your trader account."
                  : "A few quick details so producers know who they're shipping to."}
            </p>

            {/* Progress steps */}
            <ol className="flex items-center justify-center gap-x-2 small:gap-x-4 mt-6">
              {[
                { label: "Verify email", done: true },
                { label: "Complete profile", active: true },
                {
                  label:
                    isProducer || isTrader
                      ? "Admin review"
                      : "Start shopping",
                },
              ].map((s, i, arr) => (
                <li key={s.label} className="flex items-center">
                  <div className="flex items-center gap-x-2">
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-caption font-bold transition-all ${
                        s.done
                          ? "bg-brand-green-600 text-white"
                          : s.active
                            ? "bg-grey-90 text-white ring-4 ring-grey-90/10"
                            : "bg-white text-grey-40 border border-grey-20"
                      }`}
                    >
                      {s.done ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={`text-caption font-semibold hidden xsmall:inline ${
                        s.active
                          ? "text-grey-90"
                          : s.done
                            ? "text-brand-green-700"
                            : "text-grey-40"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className={`mx-2 small:mx-4 h-px w-8 small:w-16 ${
                        s.done ? "bg-brand-green-300" : "bg-grey-20"
                      }`}
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* The actual functional form */}
          <OnboardingForm accountType={accountType} defaults={defaults} />

          {/* Footnote */}
          <p className="text-caption text-grey-50 text-center mt-6 max-w-lg mx-auto leading-relaxed">
            We&rsquo;ll never share your details with third parties.{" "}
            {isProducer
              ? "Producer profiles are reviewed by Mindanao Fresh Hub admins, not buyers."
              : isTrader
                ? "Trader business details are reviewed by Mindanao Fresh Hub admins before bulk pricing activates."
                : "You can change any of this later from your account settings."}
          </p>
        </div>
      </div>
    </div>
  )
}
