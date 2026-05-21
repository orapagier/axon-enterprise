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
      className={`inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em] ${
        isDirect
          ? "bg-blue-50 text-blue-700 border border-blue-100"
          : "bg-purple-50 text-purple-700 border border-purple-100"
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