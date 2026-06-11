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

const LoginTemplate = () => {
  return (
    <div className="relative min-h-[calc(100vh-100px)] bg-grey-5">
      <div className="grid small:grid-cols-2 min-h-[calc(100vh-100px)]">
        {/* Left brand panel */}
        <aside className="relative hidden small:flex flex-col justify-between p-12 medium:p-16 overflow-hidden bg-gradient-to-br from-brand-green-900 via-brand-green-800 to-brand-green-700 text-white">
          {/* Decorative orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full bg-brand-gold-400/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 w-[360px] h-[360px] rounded-full bg-brand-green-400/20 blur-3xl"
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
            <LocalizedClientLink
              href="/"
              className="inline-flex items-center gap-x-2 text-body-sm font-semibold tracking-wide"
            >
              <span className="text-2xl">🌿</span>
              <span className="font-heading text-h3">Mindanao Fresh Hub</span>
            </LocalizedClientLink>
          </div>

          <div className="relative">
            <h2 className="font-heading text-4xl medium:text-5xl leading-[1.05] text-white">
              Fresh produce,{" "}
              <span className="italic text-brand-gold-300">delivered</span>{" "}
              from our farms to your door.
            </h2>
            <p className="mt-5 text-body text-white/75 leading-relaxed max-w-md">
              Sign in to track orders, save favorite farms, and check out in
              one tap.
            </p>

            <ul className="mt-10 space-y-5 max-w-md">
              {VALUE_PROPS.map((p) => (
                <li key={p.title} className="flex items-start gap-x-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-lg">
                    {p.icon}
                  </span>
                  <div>
                    <div className="text-body-sm font-semibold">{p.title}</div>
                    <div className="text-caption text-white/65 leading-relaxed mt-0.5">
                      {p.description}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-x-3 text-caption text-white/60">
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
            <span>Built for farmers, cooks and home kitchens across Mindanao.</span>
          </div>
        </aside>

        {/* Right form panel */}
        <main className="relative flex items-center justify-center p-6 small:p-10 medium:p-14">
          {/* Mobile brand bar */}
          <div className="absolute top-6 left-6 small:hidden">
            <LocalizedClientLink
              href="/"
              className="inline-flex items-center gap-x-2 text-body-sm font-semibold text-grey-80"
            >
              <span className="text-lg">🌿</span>
              <span className="font-heading">Mindanao Fresh Hub</span>
            </LocalizedClientLink>
          </div>

          <div className="w-full max-w-md mt-16 small:mt-0">
            <AuthCard />
          </div>
        </main>
      </div>
    </div>
  )
}

export default LoginTemplate
