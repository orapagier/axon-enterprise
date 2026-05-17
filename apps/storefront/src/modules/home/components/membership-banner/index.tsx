import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Hexagon from "@modules/common/icons/hexagon"

const MembershipBanner = () => {
  return (
    <section className="section-padding">
      <div className="content-container">
        <div className="relative overflow-hidden rounded-3xl bg-brand-cream-100 border border-brand-gold-200">
          {/* Decorative hexagons */}
          <div className="absolute -right-8 -top-8 opacity-10">
            <Hexagon size="200" color="#eab308" />
          </div>
          <div className="absolute -right-4 bottom-8 opacity-5">
            <Hexagon size="120" color="#eab308" />
          </div>

          <div className="relative z-10 grid grid-cols-1 small:grid-cols-2 gap-10 items-center p-8 small:p-16">
            {/* Left: Content */}
            <div className="flex flex-col gap-y-6">
              <div className="flex items-center gap-x-2">
                <Hexagon size="20" color="#eab308" />
                <span className="text-caption font-semibold text-brand-gold-700 uppercase tracking-wider">
                  Premium Membership
                </span>
              </div>
              <h2 className="text-h1 small:text-display font-heading text-grey-90">
                Join the Fresh Hub family
              </h2>
              <ul className="flex flex-col gap-y-3">
                {[
                  "Exclusive member-only prices",
                  "Priority delivery slots",
                  "Early access to seasonal harvests",
                  "Earn reward points on every order",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-x-3 text-body text-grey-60">
                    <div className="w-5 h-5 rounded-full bg-brand-gold-100 flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    {benefit}
                  </li>
                ))}
              </ul>
              <LocalizedClientLink
                href="/account"
                className="inline-flex items-center justify-center w-fit px-8 py-3.5 bg-gradient-gold text-grey-90 font-semibold text-body rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5"
              >
                Learn more
              </LocalizedClientLink>
            </div>

            {/* Right: Large decorative hexagon */}
            <div className="hidden small:flex items-center justify-center">
              <div className="relative">
                <Hexagon size="240" color="#fef9c3" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Hexagon size="160" color="#fef08a" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Hexagon size="80" color="#eab308" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MembershipBanner
