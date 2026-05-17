const path = require("path")

module.exports = {
  darkMode: "class",
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      colors: {
        grey: {
          0: "#FFFFFF",
          5: "#F9FAFB",
          10: "#F3F4F6",
          20: "#E5E7EB",
          30: "#D1D5DB",
          40: "#9CA3AF",
          50: "#6B7280",
          60: "#4B5563",
          70: "#374151",
          80: "#1F2937",
          90: "#111827",
        },
        "brand-green": {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        "brand-gold": {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
        "brand-cream": {
          50: "#fffef7",
          100: "#fefce8",
          200: "#fdf8d1",
          300: "#faf0a8",
          400: "#f5e47a",
          500: "#edd54e",
          600: "#d4b82e",
          700: "#ab9121",
          800: "#846e1b",
          900: "#5e4e16",
        },
      },
      borderRadius: {
        none: "0px",
        soft: "2px",
        base: "4px",
        rounded: "8px",
        large: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        circle: "9999px",
      },
      boxShadow: {
        soft: "0 2px 8px 0 rgba(0,0,0,0.04), 0 1px 2px 0 rgba(0,0,0,0.03)",
        medium: "0 4px 16px 0 rgba(0,0,0,0.06), 0 2px 4px 0 rgba(0,0,0,0.04)",
        large: "0 8px 32px 0 rgba(0,0,0,0.08), 0 4px 8px 0 rgba(0,0,0,0.04)",
        xl: "0 16px 48px 0 rgba(0,0,0,0.1), 0 8px 16px 0 rgba(0,0,0,0.06)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        34: "8.5rem",
        38: "9.5rem",
        42: "10.5rem",
      },
      maxWidth: {
        "8xl": "100rem",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "body-sm": ["0.875rem", { lineHeight: "1.375rem" }],
        body: ["1rem", { lineHeight: "1.625rem" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        h3: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        h2: ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        h1: ["2rem", { lineHeight: "2.5rem", fontWeight: "700" }],
        display: ["2.75rem", { lineHeight: "3.25rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "4rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-xl": ["4.5rem", { lineHeight: "5rem", fontWeight: "700", letterSpacing: "-0.03em" }],
        "3xl": "2rem",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Ubuntu",
          "sans-serif",
        ],
        heading: [
          "var(--font-playfair)",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
        brand: [
          "var(--font-dm-serif)",
          "DM Serif Display",
          "Georgia",
          "serif",
        ],
      },
      backgroundImage: {
        "gradient-green": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        "gradient-gold": "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
        "gradient-green-soft": "linear-gradient(180deg, rgba(22,163,74,0.05) 0%, rgba(22,163,74,0) 100%)",
        "gradient-hero": "linear-gradient(135deg, #14532d 0%, #166534 30%, #16a34a 100%)",
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-right": "slide-out-right 200ms ease-in",
        leave: "leave 150ms ease-in forwards",
      },
    },
  },
  plugins: [require("tailwindcss-radix")()],
}
