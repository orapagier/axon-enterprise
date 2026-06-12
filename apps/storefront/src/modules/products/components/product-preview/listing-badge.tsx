type Props = {
  listingType?: string | null
}

/**
 * Small inline badge shown on product cards so buyers know whether
 * the producer delivers directly or sells through FreshHub.
 */
export default function ListingBadge({ listingType }: Props) {
  if (!listingType) return null

  const isDirect = listingType === "direct_to_consumer"

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md bg-white/95 text-[9px] font-bold uppercase tracking-[0.12em] shadow-medium whitespace-nowrap ${
        isDirect ? "text-blue-700" : "text-purple-700"
      }`}
      title={
        isDirect
          ? "Producer delivers directly to you"
          : "Fulfilled by FreshHub"
      }
    >
      {isDirect ? "Producer Direct" : "FreshHub Verified"}
    </span>
  )
}