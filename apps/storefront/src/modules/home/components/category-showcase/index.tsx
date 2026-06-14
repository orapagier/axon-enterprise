import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Category = {
  name: string
  image: string
  href: string
  count: string
  accent: string
  span: string
  size: "feature" | "medium" | "small"
}

const categories: Category[] = [
  {
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1100&h=1400&fit=crop&auto=format&q=85",
    href: "/store?category=fruits",
    count: "64 picks",
    accent: "Sweet & ripe",
    span: "small:col-span-6 small:row-span-2",
    size: "feature",
  },
  {
    name: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=600&fit=crop&auto=format&q=85",
    href: "/store?category=vegetables",
    count: "86 picks",
    accent: "Just harvested",
    span: "small:col-span-3 small:row-span-1",
    size: "medium",
  },
  {
    name: "Herbs",
    image:
      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&h=600&fit=crop&auto=format&q=85",
    href: "/store?category=herbs",
    count: "22 picks",
    accent: "Aromatic",
    span: "small:col-span-3 small:row-span-1",
    size: "medium",
  },
  {
    name: "Root Crops",
    image:
      "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=600&h=600&fit=crop&auto=format&q=85",
    href: "/store?category=root-crops",
    count: "31 picks",
    accent: "Earth-grown",
    span: "small:col-span-3 small:row-span-1",
    size: "medium",
  },
  {
    name: "Fish",
    image:
      "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&h=600&fit=crop&auto=format&q=85",
    href: "/store?category=fish",
    count: "17 picks",
    accent: "Wild-caught",
    span: "small:col-span-3 small:row-span-1",
    size: "medium",
  },
]

const CategoryShowcase = () => {
  return (
    <section className="section-viewport bg-grey-5 w-full">
      <div className="content-container w-full">
        {/* Section header — refined */}
        <div className="flex flex-col xsmall:flex-row xsmall:items-end justify-between gap-5 mb-6 small:mb-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-7 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.18em]">
                Browse the Hub
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[42px] small:leading-[1.02] text-grey-90 tracking-[-0.022em]">
              Every aisle, <span className="italic text-brand-green-700">in season</span>
              <span className="text-brand-gold-500">.</span>
            </h2>
            <p className="text-body-sm text-grey-50 mt-2 max-w-md leading-relaxed">
              Six staple aisles, stocked daily by the farmers nearest your hub.
            </p>
          </div>
          <LocalizedClientLink
            href="/store"
            className="group inline-flex items-center gap-x-2 px-5 py-3 rounded-full bg-grey-90 text-white text-body-sm font-medium hover:bg-brand-green-700 transition-colors w-fit"
          >
            Browse all 248 picks
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
          </LocalizedClientLink>
        </div>

        {/* Bento grid — 12-col / 2-row that actually fits */}
        <div className="grid grid-cols-2 xsmall:grid-cols-2 small:grid-cols-12 small:grid-rows-2 gap-3 small:h-[min(calc(100vh-280px),520px)]">
          {categories.map((category, i) => {
            const isFeature = category.size === "feature"
            const isMedium = category.size === "medium"
            return (
              <LocalizedClientLink
                key={category.name}
                href={category.href}
                className={`group relative rounded-2xl overflow-hidden ${category.span} ${
                  isFeature
                    ? "aspect-square small:aspect-auto"
                    : "aspect-[4/3] small:aspect-auto"
                } shadow-soft hover:shadow-large transition-all duration-500 ring-1 ring-grey-10/60`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[1200ms] ease-out"
                />

                {/* Layered gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-grey-90/85 via-grey-90/15 to-transparent" />

                {/* Number marker */}
                <div className="absolute top-3 left-4 small:top-4 small:left-5">
                  <span className="font-heading italic text-white/70 text-body-sm tracking-tight">
                    No. {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Hover arrow chip */}
                <div className="absolute top-3 right-3 small:top-4 small:right-4 w-8 h-8 small:w-9 small:h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 small:p-5">
                  <span className="inline-block text-[10px] uppercase tracking-[0.2em] text-brand-gold-300 font-semibold mb-1">
                    {category.accent}
                  </span>
                  <h3
                    className={`font-heading text-white leading-tight tracking-[-0.01em] ${
                      isFeature
                        ? "text-[32px] small:text-[48px]"
                        : isMedium
                          ? "text-h2 small:text-[28px]"
                          : "text-h2"
                    }`}
                  >
                    {category.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-x-2">
                    <span className="text-caption text-white/70 tabular-nums">
                      {category.count}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <span className="text-caption text-white/70 group-hover:text-brand-gold-300 transition-colors">
                      Shop now
                    </span>
                  </div>
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default CategoryShowcase
