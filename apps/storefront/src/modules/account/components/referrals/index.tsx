"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import type { ReferralPanel } from "@lib/data/referrals"

const statusLabel: Record<string, string> = {
  rewarded: "Bonus earned",
  pending: "Awaiting credit",
  void: "Voided",
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
}

export default function ReferralPanelView({ panel }: { panel: ReferralPanel }) {
  const { countryCode } = useParams() as { countryCode: string }
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  // Build the share link from the live origin so it works on localhost, the
  // tunnel, and production without a configured base URL.
  const shareLink = useMemo(() => {
    if (!panel.code) return ""
    const origin =
      typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/${countryCode || "ph"}/account?ref=${panel.code}`
  }, [panel.code, countryCode])

  const copy = async (value: string, key: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
    } catch {
      /* insecure origin — field is still selectable */
    }
  }

  const availableCredits = panel.credits.filter((c) => !c.used)

  return (
    <div className="flex flex-col gap-y-6">
      {/* Share card */}
      <div className="bg-white rounded-2xl border border-grey-10 shadow-soft overflow-hidden">
        <div className="px-6 small:px-7 py-5 border-b border-grey-10">
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            Your referral code
          </h3>
          <p className="text-caption text-grey-50 mt-0.5 leading-relaxed">
            Send this code or link to friends. They enter it when they sign up
            or upgrade.
          </p>
        </div>

        <div className="px-6 small:px-7 py-5 flex flex-col gap-y-4">
          <div>
            <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-2 block">
              Code
            </span>
            <div className="flex items-stretch gap-x-2">
              <div className="flex-1 px-4 py-3 bg-grey-5 border border-grey-10 rounded-xl text-grey-90 font-mono text-h3 tracking-[0.15em] select-all">
                {panel.code || "—"}
              </div>
              <button
                type="button"
                onClick={() => copy(panel.code, "code")}
                className="px-4 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white text-body-sm font-semibold transition-colors shrink-0"
              >
                {copied === "code" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-2 block">
              Share link
            </span>
            <div className="flex items-stretch gap-x-2">
              <input
                readOnly
                value={shareLink}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 px-4 py-3 bg-grey-5 border border-grey-10 rounded-xl text-body-sm text-grey-70 font-mono"
              />
              <button
                type="button"
                onClick={() => copy(shareLink, "link")}
                className="px-4 rounded-xl border border-grey-20 hover:border-grey-40 text-grey-90 text-body-sm font-semibold transition-colors shrink-0"
              >
                {copied === "link" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credit balance */}
      <div className="bg-white rounded-2xl border border-grey-10 shadow-soft overflow-hidden">
        <div className="px-6 small:px-7 py-5 border-b border-grey-10 flex items-center justify-between">
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            Store credit
          </h3>
          <span className="text-h3 font-heading text-brand-green-700">
            ₱{panel.balance}
          </span>
        </div>

        <div className="px-6 small:px-7 py-5">
          {availableCredits.length === 0 ? (
            <p className="text-body-sm text-grey-50 leading-relaxed">
              No credit yet. When someone you referred upgrades, a ₱
              {panel.bonus_php} credit code appears here — paste it in the
              discount box at checkout.
            </p>
          ) : (
            <>
              <p className="text-caption text-grey-50 mb-3 leading-relaxed">
                Paste a code in the discount box at checkout. Each works once.
              </p>
              <ul className="flex flex-col gap-y-2">
                {availableCredits.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-center gap-x-2 p-3 rounded-xl bg-brand-green-50/50 border border-brand-green-100"
                  >
                    <span className="flex-1 font-mono text-body-sm text-grey-90 tracking-wide">
                      {c.code}
                    </span>
                    <span className="text-caption font-semibold text-brand-green-700">
                      ₱{c.amount}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(c.code, c.code)}
                      className="px-3 py-1.5 rounded-lg bg-brand-green-700 hover:bg-brand-green-800 text-white text-caption font-semibold transition-colors"
                    >
                      {copied === c.code ? "Copied!" : "Copy"}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-white rounded-2xl border border-grey-10 shadow-soft overflow-hidden">
        <div className="px-6 small:px-7 py-5 border-b border-grey-10">
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            People you've referred
          </h3>
        </div>
        <div className="px-6 small:px-7 py-5">
          {panel.referrals.length === 0 ? (
            <p className="text-body-sm text-grey-50 leading-relaxed">
              No referrals yet. Share your code to get started.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-grey-10">
              {panel.referrals.map((r, i) => (
                <li
                  key={`${r.referee}-${i}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="text-body-sm font-medium text-grey-90">
                      {r.referee}
                    </div>
                    <div className="text-[11px] text-grey-50">
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                  <span
                    className={`text-caption font-semibold px-2.5 py-1 rounded-full ${
                      r.status === "rewarded"
                        ? "bg-brand-green-50 text-brand-green-700"
                        : r.status === "pending"
                          ? "bg-brand-gold-100 text-brand-gold-800"
                          : "bg-grey-10 text-grey-50"
                    }`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
