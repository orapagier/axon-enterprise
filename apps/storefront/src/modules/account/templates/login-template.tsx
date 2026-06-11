import AuthCard from "@modules/account/components/auth-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Hub } from "@modules/hub/data/hubs"

type LoginTemplateProps = {
  hubs?: Hub[]
  currentHubSlug?: string | null
  googleEnabled?: boolean
  googleError?: string | null
}

const VALUE_PROPS = [
  {
    icon: "🌾",
    title: "Directly from the farm",
    description:
      "We source straight from Mindanao's growers — no middlemen between plot and plate.",
  },
  {
    icon: "📦",
    title: "Short, cold-chain delivery",
    description:
      "Picked, packed and chilled within hours so it lands on your table at its peak.",
  },
  {
    icon: "🔒",
    title: "Honest, transparent pricing",
    description:
      "Premium at the farmgate, fair at the doorstep. We publish margins; nothing is hidden.",
  },
]

const LoginTemplate = ({
  hubs = [],
  currentHubSlug = null,
  googleEnabled = false,
  googleError = null,
}: LoginTemplateProps) => {
  return (
    <div className="relative min-h-[calc(100vh-100px)] bg-grey-5 overflow-hidden">
      {/* Page background decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-brand-green-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full bg-brand-gold-100/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 small:px-8 py-10 small:py-14">
        {/* Brand mark above the card */}
        <LocalizedClientLink
          href="/"
          className="inline-flex items-center gap-x-2 text-body-sm font-semibold text-grey-80 mb-6"
        >
          <span className="text-xl">🌿</span>
          <span className="font-heading text-h3 text-grey-90">
            Mindanao Fresh Hub
          </span>
        </LocalizedClientLink>

        {/* Floating card */}
        <div className="w-full max-w-5xl grid small:grid-cols-[5fr_6fr] bg-white rounded-3xl shadow-xl border border-grey-10 overflow-hidden">
          {/* Brand panel */}
          <aside className="relative hidden small:flex flex-col justify-between p-8 medium:p-10 overflow-hidden bg-gradient-to-br from-brand-green-900 via-brand-green-800 to-brand-green-700 text-white">
            {/* Decorative orbs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-16 w-[320px] h-[320px] rounded-full bg-brand-gold-400/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-12 w-[280px] h-[280px] rounded-full bg-brand-green-400/20 blur-3xl"
            />
            {/* Subtle pattern */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative">
              <h2 className="font-heading text-3xl medium:text-4xl leading-[1.05] text-white">
                Fresh produce,{" "}
                <span className="italic text-brand-gold-300">delivered</span>{" "}
                from our farms to your door.
              </h2>
              <p className="mt-4 text-body-sm text-white/75 leading-relaxed max-w-md">
                Sign in to track orders, save favorite farms, and check out in
                one tap.
              </p>

              <ul className="mt-8 space-y-4 max-w-md">
                {VALUE_PROPS.map((p) => (
                  <li key={p.title} className="flex items-start gap-x-3.5">
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-lg">
                      {p.icon}
                    </span>
                    <div>
                      <div className="text-body-sm font-semibold">
                        {p.title}
                      </div>
                      <div className="text-caption text-white/65 leading-relaxed mt-0.5">
                        {p.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex items-center gap-x-3 text-caption text-white/60 mt-10">
              <div className="flex -space-x-2">
                {["🧑‍🌾", "👩‍🍳", "👨‍🍳"].map((e, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-sm"
                  >
                    {e}
                  </span>
                ))}
              </div>
              <span>
                Built for farmers, cooks and home kitchens across Mindanao.
              </span>
            </div>
          </aside>

          {/* Form panel */}
          <main className="flex items-center justify-center p-6 small:p-10 medium:p-12">
            <div className="w-full max-w-md">
              <AuthCard
                hubs={hubs}
                currentHubSlug={currentHubSlug}
                googleEnabled={googleEnabled}
                googleError={googleError}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LoginTemplate
