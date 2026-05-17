import LocalizedClientLink from "@modules/common/components/localized-client-link"

const categories = [
  {
    name: "Vegetables",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=560&fit=crop",
    href: "/store",
  },
  {
    name: "Fruits",
    image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=560&fit=crop",
    href: "/store",
  },
  {
    name: "Herbs",
    image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=560&fit=crop",
    href: "/store",
  },
  {
    name: "Root Crops",
    image: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400&h=560&fit=crop",
    href: "/store",
  },
  {
    name: "Leafy Greens",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=560&fit=crop",
    href: "/store",
  },
  {
    name: "Fish",
    image: "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=560&fit=crop",
    href: "/store",
  },
]

const CategoryShowcase = () => {
  return (
    <section className="section-padding bg-white">
      <div className="content-container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-caption font-semibold text-brand-green-600 uppercase tracking-wider">
              Browse
            </span>
            <h2 className="text-h1 font-heading text-grey-90 mt-2">
              Shop by Category
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="hidden xsmall:inline-flex items-center gap-x-1 text-body-sm font-medium text-grey-50 hover:text-grey-80 transition-colors"
          >
            View all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </LocalizedClientLink>
        </div>

        <div className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-6 gap-4">
          {categories.map((category) => (
            <LocalizedClientLink
              key={category.name}
              href={category.href}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
            >
              {/* Image */}
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="text-body-sm font-semibold text-white">
                  {category.name}
                </span>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoryShowcase
