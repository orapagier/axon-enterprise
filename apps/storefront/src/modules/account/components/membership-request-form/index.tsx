"use client"

import { requestMembership } from "@lib/data/customer"
import {
  isPayoutChannelConfigured,
  MEMBERSHIP_FEE_PHP,
  MEMBERSHIP_PAYOUT,
  methodNeedsReference,
  type MembershipPaymentMethod,
} from "@lib/util/membership"
import { useActionState, useEffect, useState } from "react"

type FormState = { ok: boolean; error: string | null }

const INITIAL: FormState = { ok: false, error: null }

const METHODS: ReadonlyArray<{
  id: MembershipPaymentMethod
  icon: string
  blurb: string
}> = [
  {
    id: "otc",
    icon: "💵",
    blurb: "Walk in and pay cash at your hub counter. No reference needed — the cashier matches you by account email.",
  },
  {
    id: "gcash",
    icon: "📱",
    blurb: "Send via the GCash app, then paste the 13-digit reference below.",
  },
]

type Props = {
  // Override the header so the same form serves both the Hub Member upgrade
  // and the Producer/Trader yearly registration on the Account types page.
  heading?: string
  subheading?: string
  // Referral code already attached to the account (from a `?ref=` signup link),
  // used to prefill the optional referral field.
  defaultReferralCode?: string
}

export default function MembershipRequestForm({
  heading,
  subheading,
  defaultReferralCode = "",
}: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestMembership,
    INITIAL
  )

  const [method, setMethod] = useState<MembershipPaymentMethod>("otc")
  const [reference, setReference] = useState("")
  const [referralCode, setReferralCode] = useState(defaultReferralCode)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const channel = MEMBERSHIP_PAYOUT[method]
  const channelReady = isPayoutChannelConfigured(channel)
  const needsReference = methodNeedsReference(method)
  const referenceLooksValid = !needsReference || reference.trim().length >= 4

  const handleCopy = async (value: string, key: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
    } catch {
      // Clipboard API can fail on insecure origins — silently ignore;
      // the field is still selectable.
    }
  }

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-grey-10 shadow-soft overflow-hidden"
      data-testid="membership-request-form"
    >
      <header className="px-6 small:px-7 py-5 border-b border-grey-10 flex items-start gap-x-4">
        <span className="w-10 h-10 rounded-xl bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 flex items-center justify-center text-lg shrink-0">
          💳
        </span>
        <div>
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            {heading ?? `Submit your ₱${MEMBERSHIP_FEE_PHP} payment`}
          </h3>
          <p className="text-caption text-grey-50 mt-0.5 leading-relaxed max-w-md">
            {subheading ??
              "Pay in cash at the counter or via GCash, then submit here. An admin verifies the payment and activates you — usually within a business day."}
          </p>
        </div>
      </header>

      <fieldset className="px-6 small:px-7 py-5 border-b border-grey-10">
        <legend className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-3">
          1. Choose how you paid
        </legend>
        <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
          {METHODS.map((m) => {
            const selected = method === m.id
            const available = isPayoutChannelConfigured(MEMBERSHIP_PAYOUT[m.id])
            return (
              <label
                key={m.id}
                className={`relative flex items-start gap-x-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  selected
                    ? "border-brand-green-600 bg-brand-green-50/50 shadow-soft"
                    : "border-grey-10 bg-grey-5 hover:border-grey-30"
                } ${!available ? "opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={m.id}
                  checked={selected}
                  onChange={() => setMethod(m.id)}
                  className="sr-only"
                />
                <span className="text-xl leading-none mt-0.5">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-x-2">
                    <span className="text-body-sm font-semibold text-grey-90">
                      {MEMBERSHIP_PAYOUT[m.id].label}
                    </span>
                    {!available && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-grey-50">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <div className="text-caption text-grey-50 mt-1 leading-relaxed">
                    {m.blurb}
                  </div>
                </div>
                <span
                  aria-hidden
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected
                      ? "border-brand-green-600 bg-brand-green-600"
                      : "border-grey-20 bg-white"
                  }`}
                >
                  {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="px-6 small:px-7 py-5 border-b border-grey-10">
        <div className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-3">
          {method === "otc"
            ? `2. Pay ₱${MEMBERSHIP_FEE_PHP} at the counter`
            : `2. Send ₱${MEMBERSHIP_FEE_PHP} to`}
        </div>
        {method === "otc" ? (
          <div className="rounded-xl bg-grey-5 border border-grey-10 p-4 flex items-start gap-x-3">
            <span className="text-xl leading-none mt-0.5">🏪</span>
            <div className="text-body-sm text-grey-70 leading-relaxed">
              Visit your hub counter and pay{" "}
              <b className="text-grey-90">₱{MEMBERSHIP_FEE_PHP} in cash</b>.
              Tell the cashier the email on your FreshHub account so the admin
              can match your payment. You can submit this request before or
              after paying — activation happens once the cash is verified.
            </div>
          </div>
        ) : channelReady ? (
          <div className="rounded-xl bg-grey-5 border border-grey-10 p-4 space-y-3">
            <PaymentLine
              label="Account name"
              value={channel.accountName || "—"}
              copyKey="name"
              copied={copied}
              onCopy={() => handleCopy(channel.accountName, "name")}
            />
            <PaymentLine
              label={method === "gcash" ? "GCash number" : "Account number"}
              value={channel.accountNumber}
              copyKey="number"
              copied={copied}
              onCopy={() => handleCopy(channel.accountNumber, "number")}
              mono
            />
            {channel.note && (
              <div className="text-caption text-grey-50 leading-relaxed">
                {channel.note}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-brand-cream-50 border border-brand-gold-200 p-4 flex items-start gap-x-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-gold-700 mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div className="text-body-sm font-semibold text-brand-gold-900">
                Receiving account not yet published
              </div>
              <div className="text-caption text-brand-gold-800 mt-0.5 leading-relaxed">
                Message the Fresh Hub team to arrange payment, then return here
                to submit your reference number.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 small:px-7 py-5">
        {needsReference ? (
          <label className="block">
            <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-2 block">
              3. Paste your payment reference
            </span>
            <input
              type="text"
              name="payment_reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
              placeholder={
                method === "gcash" ? "e.g. 1234567890123" : "e.g. BPI-2026-0511-0007"
              }
              autoComplete="off"
              className="w-full px-4 py-3 bg-grey-5 border border-grey-10 rounded-xl text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:ring-2 focus:bg-white focus:border-brand-green-300 focus:ring-brand-green-100 transition-all font-mono"
            />
            <div className="mt-1.5 text-[11px] text-grey-50">
              Found on the GCash confirmation screen or your bank deposit slip.
            </div>
          </label>
        ) : (
          <div className="text-caption text-grey-50 leading-relaxed">
            <span className="font-semibold text-grey-70 uppercase tracking-[0.06em]">
              3. Submit
            </span>{" "}
            — no reference number needed for cash. Submitting puts you in the
            verification queue so the admin can activate you as soon as the
            cashier confirms your payment.
          </div>
        )}

        {state.error && !pending && (
          <div className="mt-4 flex items-start gap-x-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-body-sm font-medium">{state.error}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !referenceLooksValid}
          className={`mt-5 group inline-flex items-center justify-center gap-x-2 px-6 py-3 rounded-xl text-body-sm font-semibold transition-all disabled:cursor-not-allowed shadow-medium ${
            referenceLooksValid && !pending
              ? "bg-brand-green-700 hover:bg-brand-green-800 text-white hover:-translate-y-0.5 hover:shadow-large"
              : "bg-grey-90/70 text-white/80"
          }`}
        >
          {pending ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-ring"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Submitting…
            </>
          ) : (
            <>
              Submit for verification
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
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function PaymentLine({
  label,
  value,
  copyKey,
  copied,
  onCopy,
  mono,
}: {
  label: string
  value: string
  copyKey: string
  copied: string | null
  onCopy: () => void
  mono?: boolean
}) {
  const isCopied = copied === copyKey
  return (
    <div className="flex items-center justify-between gap-x-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-grey-50">
          {label}
        </div>
        <div
          className={`text-body-sm text-grey-90 truncate ${
            mono ? "font-mono tracking-wide" : "font-semibold"
          }`}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
          isCopied
            ? "bg-brand-green-600 border-brand-green-600 text-white"
            : "bg-white border-grey-20 text-grey-70 hover:border-grey-30 hover:text-grey-90"
        }`}
      >
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
