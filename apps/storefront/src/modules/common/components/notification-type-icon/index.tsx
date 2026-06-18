/**
 * Small circular icon keyed off a notification's coarse `type` ("order" |
 * "delivery" | "dispute" | …). Shared by the header dropdown, the inbox list,
 * and the detail page so the visual language stays consistent.
 */

type Props = {
  type?: string | null
  size?: "sm" | "md"
  className?: string
}

const VISUALS: Record<
  string,
  { ring: string; text: string; icon: React.ReactNode }
> = {
  order: {
    ring: "bg-brand-green-50 text-brand-green-700",
    text: "text-brand-green-700",
    icon: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
  },
  delivery: {
    ring: "bg-brand-gold-100 text-brand-gold-700",
    text: "text-brand-gold-700",
    icon: (
      <>
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
  },
  dispute: {
    ring: "bg-red-50 text-red-600",
    text: "text-red-600",
    icon: (
      <>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  },
}

const DEFAULT = {
  ring: "bg-grey-10 text-grey-60",
  text: "text-grey-60",
  icon: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
}

const NotificationTypeIcon = ({ type, size = "md", className = "" }: Props) => {
  const v = (type && VISUALS[type]) || DEFAULT
  const box = size === "sm" ? "w-8 h-8" : "w-10 h-10"
  const dim = size === "sm" ? 15 : 18

  return (
    <span
      className={`shrink-0 ${box} rounded-full flex items-center justify-center ${v.ring} ${className}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {v.icon}
      </svg>
    </span>
  )
}

export default NotificationTypeIcon
