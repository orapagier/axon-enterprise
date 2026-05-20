"use client"

import { deleteListing, type SellerListing } from "@lib/data/seller"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"
import { useState, useTransition } from "react"

type Props = {
  listings: SellerListing[]
  isVerified: boolean
  businessName?: string
  errorCode?: string
  errorMessage?: string
}

const STATUS_CHIP: Record<
  SellerListing["status"],
  { label: string; cls: string }
> = {
  draft: {
    label: "Draft",
    cls: "bg-grey-90 text-white",
  },
  proposed: {
    label: "In review",
    cls: "bg-brand-gold-400 text-grey-90",
  },
  published: {
    label: "Live",
    cls: "bg-brand-green-700 text-white",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-500 text-white",
  },
}

const formatPrice = (listing: SellerListing): string => {
  const amount = listing.variants?.[0]?.prices?.find(
    (p) => p.currency_code?.toLowerCase() === "php"
  )?.amount
  if (!amount) return "—"
  return `₱${amount.toLocaleString()}/${(listing.metadata?.unit as string) ?? "kg"}`
}

export default function SellerDashboard({
  listings,
  isVerified,
  businessName,
  errorCode,
  errorMessage,
}: Props) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = {
    draft: listings.filter((l) => l.status === "draft").length,
    published: listings.filter((l) => l.status === "published").length,
    proposed: listings.filter((l) => l.status === "proposed").length,
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this draft listing? This can't be undone.")) return
    setDeletingId(id)
    startTransition(() => {
      void deleteListing(id, countryCode)
    })
  }

  // Onboarding-incomplete path → CTA to finish profile.
  if (errorCode === "PROFILE_INCOMPLETE") {
    return (
      <div className="bg-white rounded-3xl border border-brand-gold-200 p-8 small:p-10 shadow-soft">
        <div className="flex items-start gap-x-4">
          <span className="text-3xl">📝</span>
          <div>
            <h2 className="font-heading font-bold text-h2 text-grey-90 tracking-[-0.015em]">
              Finish your producer profile first
            </h2>
            <p className="text-body-sm text-grey-60 mt-2 leading-relaxed">
              You need to complete your producer profile before we can review
              your listings.
            </p>
            <LocalizedClientLink
              href="/onboarding"
              className="inline-flex mt-4 items-center gap-x-2 px-5 py-2.5 rounded-full bg-brand-green-700 hover:bg-brand-green-800 text-white text-body-sm font-semibold transition-colors"
            >
              Complete profile
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header card */}
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <div className="flex flex-col xsmall:flex-row xsmall:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-x-2.5 mb-2">
              <span className="text-[10px] font-bold text-grey-50 uppercase tracking-[0.18em]">
                Producer dashboard
              </span>
              {isVerified ? (
                <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-brand-green-50 text-brand-green-700 text-[10px] font-bold uppercase tracking-wider border border-brand-green-100">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-brand-gold-100 text-brand-gold-800 text-[10px] font-bold uppercase tracking-wider border border-brand-gold-200">
                  Pending review
                </span>
              )}
            </div>
            <h1 className="font-heading font-bold text-h1 small:text-display text-grey-90 leading-[1.05] tracking-[-0.02em]">
              {businessName || "Your listings"}
              <span className="text-brand-gold-500">.</span>
            </h1>
            <p className="text-body-sm text-grey-50 mt-2 leading-relaxed">
              {isVerified
                ? "Manage your produce listings, edit prices, and remove drafts."
                : "We're reviewing your seller account. You can still draft listings — they'll go live once you're verified."}
            </p>
          </div>
          <LocalizedClientLink
            href="/account/producer/listings/new"
            className="group inline-flex items-center gap-x-2 pl-5 pr-4 py-3 rounded-full bg-brand-green-700 hover:bg-brand-green-800 text-white text-body-sm font-semibold transition-all shadow-medium hover:shadow-large hover:-translate-y-0.5 w-fit"
          >
            New listing
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold-400 text-grey-90">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </LocalizedClientLink>
        </div>

        {/* Stat row */}
        <div className="mt-6 grid grid-cols-3 gap-3 small:gap-4">
          <div className="rounded-2xl border border-grey-10 bg-grey-5 px-4 py-3">
            <div className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums">
              {counts.published}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
              Live
            </div>
          </div>
          <div className="rounded-2xl border border-brand-gold-200 bg-brand-cream-50 px-4 py-3">
            <div className="font-heading font-bold text-h1 text-brand-gold-700 leading-none tabular-nums">
              {counts.proposed}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-brand-gold-800 font-semibold mt-1.5">
              In review
            </div>
          </div>
          <div className="rounded-2xl border border-grey-10 bg-white px-4 py-3">
            <div className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums">
              {counts.draft}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
              Drafts
            </div>
          </div>
        </div>

        {/* Verification notice */}
        {!isVerified && !errorMessage && (
          <div className="mt-5 p-4 rounded-xl bg-brand-cream-50 border border-brand-gold-200">
            <div className="flex items-start gap-x-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-gold-700 mt-0.5 shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div>
                <div className="text-body-sm font-semibold text-brand-gold-900">
                  Verification in progress
                </div>
                <div className="text-caption text-brand-gold-800 mt-0.5 leading-relaxed">
                  Our team is reviewing your seller account. You can draft
                  listings now and submit them for review — they&apos;ll be
                  published as soon as both checks pass.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-grey-20 p-10 text-center">
          <div className="text-4xl mb-3">🌾</div>
          <div className="font-heading font-bold text-h2 text-grey-90 tracking-[-0.015em]">
            No listings yet
          </div>
          <p className="text-body-sm text-grey-50 mt-2 max-w-md mx-auto">
            Post your first harvest and we&apos;ll review it within 24 hours.
          </p>
          <LocalizedClientLink
            href="/account/producer/listings/new"
            className="inline-flex mt-5 items-center gap-x-2 px-5 py-2.5 rounded-full bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold transition-colors"
          >
            Post your first listing
          </LocalizedClientLink>
        </div>
      ) : (
        <ul className="grid grid-cols-1 small:grid-cols-2 gap-4">
          {listings.map((l) => {
            const chip = STATUS_CHIP[l.status]
            return (
              <li
                key={l.id}
                className="group bg-white rounded-2xl border border-grey-10/70 shadow-soft hover:shadow-large hover:border-brand-green-200 transition-all overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-cream-50 to-grey-5 overflow-hidden">
                  {l.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.thumbnail}
                      alt={l.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-grey-30 text-4xl">
                      📷
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.14em] shadow-medium ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                </div>

                <div className="flex flex-col flex-1 p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-brand-green-700 mb-1">
                    {(l.metadata?.category as string) || "Uncategorised"}
                  </div>
                  <h3 className="font-heading font-bold text-body-lg text-grey-90 leading-tight line-clamp-2">
                    {l.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-x-2 text-caption text-grey-50">
                    {l.origin_country && (
                      <>
                        <span>{l.origin_country}</span>
                        <span className="w-1 h-1 rounded-full bg-grey-30" />
                      </>
                    )}
                    <span className="font-semibold text-grey-80 tabular-nums">
                      {formatPrice(l)}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 flex items-center gap-2 border-t border-grey-10 mt-4">
                    <LocalizedClientLink
                      href={`/account/producer/listings/${l.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-x-1.5 py-2 rounded-lg border border-grey-20 text-grey-80 text-caption font-semibold hover:bg-grey-90 hover:text-white hover:border-grey-90 transition-all"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </LocalizedClientLink>
                    {l.status === "draft" && (
                      <button
                        type="button"
                        disabled={pending && deletingId === l.id}
                        onClick={() => handleDelete(l.id)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-grey-20 text-grey-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                        aria-label="Delete listing"
                      >
                        {pending && deletingId === l.id ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-ring">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
