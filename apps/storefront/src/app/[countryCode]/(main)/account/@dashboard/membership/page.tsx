import { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  cancelMembership,
  cancelMembershipRenewal,
  retrieveCustomer,
} from "@lib/data/customer"
import {
  getMembership,
  getMembershipRenewal,
  getMembershipRequest,
  MEMBERSHIP_PAYOUT,
  MembershipRequest,
  MembershipStatus,
} from "@lib/util/membership"
import MembershipRequestForm from "@modules/account/components/membership-request-form"

export const metadata: Metadata = {
  title: "Membership | Mindanao Fresh Hub",
  description: "Manage your Hub Member subscription.",
}

const formatDate = (ms: number | null): string | null =>
  ms
    ? new Date(ms).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

const PERKS = [
  {
    title: "Member-only pricing",
    desc: "Member-only rates on eligible items, applied automatically at checkout.",
    icon: (
      <>
        <path d="M20 12V8H4a2 2 0 0 1 0-4h12.5a2.5 2.5 0 0 1 0 5H6a2 2 0 0 0 0 4h13a2 2 0 0 1 0 4H8a2 2 0 0 0 0 4h12v-4" />
      </>
    ),
  },
  {
    title: "Reward points",
    desc: "Earn 1 point per ₱100 spent. Redeem as store credit on future orders.",
    icon: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
  },
  {
    title: "Priority delivery slots",
    desc: "Book your delivery window before non-members each week.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
  {
    title: "Early seasonal access",
    desc: "See new harvest drops 48 hours before they open publicly.",
    icon: (
      <>
        <path d="M12 1v22" />
        <path d="M19 8l-7-7-7 7" />
      </>
    ),
  },
]

export default async function MembershipPage() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()

  const membership = getMembership(customer)
  const request = getMembershipRequest(customer)
  const renewal = getMembershipRenewal(customer)

  const headline = membership.isMember
    ? "You're a Hub Member. Here are the perks active on your account."
    : request.pending
      ? "We've received your payment details. An admin will verify and activate your membership shortly."
      : "Upgrade to unlock member pricing, reward points, and early access — all for ₱500 per year."

  return (
    <div className="w-full" data-testid="membership-page-wrapper">
      <div className="mb-6">
        <h2 className="font-heading text-h1 text-grey-90 leading-tight">
          Membership
        </h2>
        <p className="text-body-sm text-grey-50 mt-1.5 leading-relaxed max-w-xl">
          {headline}
        </p>
      </div>

      {membership.isMember ? (
        <MemberView
          membership={membership}
          customerName={customer.first_name}
          renewal={renewal}
        />
      ) : request.pending ? (
        <PendingView request={request} />
      ) : (
        <FreeView />
      )}
    </div>
  )
}

function FreeView() {
  return (
    <div className="flex flex-col gap-y-4">
      {/* Upgrade hero */}
      <section className="relative overflow-hidden rounded-2xl bg-grey-90 shadow-soft border border-grey-90">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-gold-400/20 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -left-16 bottom-0 w-56 h-56 rounded-full bg-brand-green-500/15 blur-3xl pointer-events-none"
        />

        <div className="relative grid grid-cols-1 small:grid-cols-12 gap-6 p-6 small:p-8">
          <div className="small:col-span-7 flex flex-col gap-y-4">
            <div className="inline-flex items-center gap-x-2 w-fit pl-1 pr-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-gold-400">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
                Hub Member · Free tier
              </span>
            </div>

            <h3 className="font-heading text-[26px] leading-[1.1] small:text-[34px] small:leading-[1.05] text-white tracking-[-0.02em]">
              Unlock the full{" "}
              <span className="italic text-brand-gold-300">Fresh Hub</span>{" "}
              experience
              <span className="text-brand-gold-400">.</span>
            </h3>

            <p className="text-body-sm text-white/70 leading-relaxed max-w-md">
              Member pricing alone pays for the year in roughly six weekly
              shops. Everything else — points, priority slots, early drops — is
              upside.
            </p>

            <div className="flex flex-wrap items-baseline gap-x-2 pt-1">
              <span className="font-heading italic text-[44px] leading-none text-white">
                ₱500
              </span>
              <span className="text-body-sm text-white/60">/ year</span>
              <span className="text-caption text-white/40 ml-2">
                · ~₱42 / month
              </span>
            </div>

            <div className="pt-1">
              <a
                href="#submit-payment"
                className="group inline-flex items-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-gold-400 text-grey-90 font-semibold text-body-sm hover:bg-brand-gold-300 transition-all shadow-large hover:-translate-y-0.5"
              >
                Upgrade to Hub Member
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-grey-90 text-white">
                  <svg
                    width="12"
                    height="12"
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
                </span>
              </a>
            </div>

            <div className="text-caption text-white/40 pt-1">
              Cancel anytime · Manually verified by an admin · Renews yearly
            </div>
          </div>

          {/* Card mockup */}
          <div className="hidden small:flex small:col-span-5 items-center justify-center">
            <div className="relative w-full max-w-[260px] aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-brand-gold-300 via-brand-gold-400 to-brand-gold-600 p-5 shadow-2xl rotate-[-4deg] hover:rotate-[-1deg] transition-transform duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-grey-90/60 font-bold">
                    Fresh Hub
                  </div>
                  <div className="font-heading italic text-body-lg text-grey-90 leading-none mt-1">
                    Members&apos; Pass
                  </div>
                </div>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="#111827"
                  stroke="none"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                <div className="text-[9px] uppercase tracking-wider text-grey-90/60 font-semibold">
                  Activate yours
                </div>
                <div className="text-body-sm font-bold text-grey-90">
                  ₱500/yr
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perks list */}
      <section className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden">
        <header className="px-6 small:px-7 py-5 border-b border-grey-10 flex items-start gap-x-4">
          <span className="w-10 h-10 rounded-xl bg-brand-green-50 border border-brand-green-100 text-brand-green-700 flex items-center justify-center text-lg shrink-0">
            ✨
          </span>
          <div>
            <h3 className="font-heading text-h3 text-grey-90 leading-tight">
              What you&apos;ll get
            </h3>
            <p className="text-caption text-grey-50 mt-0.5">
              All four perks activate the moment you upgrade.
            </p>
          </div>
        </header>
        <ul className="grid grid-cols-1 xsmall:grid-cols-2 divide-y xsmall:divide-y-0 xsmall:divide-x divide-grey-10">
          {PERKS.map((p) => (
            <li key={p.title} className="p-6 small:p-7 flex items-start gap-x-4">
              <span className="w-10 h-10 rounded-xl bg-brand-cream-50 border border-grey-10 flex items-center justify-center flex-shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-brand-green-700"
                >
                  {p.icon}
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-body-sm font-semibold text-grey-90">
                  {p.title}
                </div>
                <div className="text-caption text-grey-50 leading-relaxed mt-1">
                  {p.desc}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Mini FAQ */}
      <section className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden">
        <header className="px-6 small:px-7 py-5 border-b border-grey-10">
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            A few quick answers
          </h3>
        </header>
        <div className="divide-y divide-grey-10">
          {[
            {
              q: "When do perks activate?",
              a: "Once an admin verifies your payment — usually within a business day. After that, member pricing applies on your next cart and points start accruing on your next order.",
            },
            {
              q: "Can I cancel?",
              a: "Anytime, from this page. You keep your perks for the rest of the period you've paid for.",
            },
            {
              q: "Is there a contract?",
              a: "No. ₱500 covers 12 months. We don't auto-charge surprises and we don't tier-lock.",
            },
          ].map((f) => (
            <details key={f.q} className="group">
              <summary className="flex items-center justify-between gap-x-4 cursor-pointer list-none px-6 small:px-7 py-4">
                <span className="text-body-sm font-semibold text-grey-90">
                  {f.q}
                </span>
                <span className="flex-shrink-0 w-7 h-7 rounded-full border border-grey-20 flex items-center justify-center group-open:bg-brand-green-700 group-open:border-brand-green-700 transition-colors">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-grey-60 group-open:text-white group-open:rotate-45 transition-transform"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </summary>
              <p className="px-6 small:px-7 pb-5 text-caption text-grey-50 leading-relaxed pr-12">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Payment submission */}
      <section id="submit-payment" className="scroll-mt-24">
        <MembershipRequestForm />
      </section>
    </div>
  )
}

function PendingView({ request }: { request: MembershipRequest }) {
  const requestedAt = formatDate(request.requestedAt)
  const channel = request.paymentMethod
    ? MEMBERSHIP_PAYOUT[request.paymentMethod]
    : null

  return (
    <div className="flex flex-col gap-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-white border border-brand-gold-200 shadow-soft">
        <div
          aria-hidden
          className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-brand-gold-100/80 blur-3xl pointer-events-none"
        />
        <div className="relative p-6 small:p-8 flex flex-col gap-y-5">
          <div className="flex items-start gap-x-4">
            <span className="w-12 h-12 rounded-2xl bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 flex items-center justify-center shrink-0">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full bg-brand-gold-100 text-brand-gold-900 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-700 animate-pulse" />
                Awaiting verification
              </div>
              <h3 className="font-heading text-h3 text-grey-90 leading-tight mt-2">
                We&apos;re reviewing your payment
              </h3>
              <p className="text-body-sm text-grey-60 mt-1.5 leading-relaxed max-w-md">
                Once an admin matches your reference to the deposit, your
                Hub Member perks will switch on automatically. You don&apos;t
                need to do anything else.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 xsmall:grid-cols-3 gap-3">
            <Field
              label="Submitted"
              value={requestedAt ?? "—"}
            />
            <Field
              label="Method"
              value={channel?.label ?? "—"}
            />
            <Field
              label="Reference"
              value={request.paymentReference ?? "—"}
              mono
            />
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-grey-10">
            <div className="text-caption text-grey-50">
              Wrong details? Cancel below and resubmit — this won&apos;t affect
              an already-completed payment.
            </div>
            <form action={cancelMembership}>
              <button
                type="submit"
                className="text-caption font-semibold text-grey-50 hover:text-red-600 underline-offset-4 hover:underline transition-colors"
              >
                Cancel request
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl bg-grey-5 border border-grey-10 px-3.5 py-2.5">
      <dt className="text-[10px] uppercase tracking-widest font-bold text-grey-50">
        {label}
      </dt>
      <dd
        className={`text-body-sm text-grey-90 truncate mt-0.5 ${
          mono ? "font-mono tracking-wide" : "font-semibold"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function MemberView({
  membership,
  customerName,
  renewal,
}: {
  membership: MembershipStatus
  customerName: string | null | undefined
  renewal: MembershipRequest
}) {
  const joined = formatDate(membership.joinedAt)
  const renews = formatDate(membership.expiresAt)
  const daysLeft =
    membership.expiresAt !== null
      ? Math.max(
          0,
          Math.ceil((membership.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
        )
      : null

  return (
    <div className="flex flex-col gap-y-4">
      {/* Member card */}
      <section className="relative overflow-hidden rounded-2xl shadow-soft">
        <div className="relative bg-gradient-to-br from-brand-gold-300 via-brand-gold-400 to-brand-gold-600 p-6 small:p-8">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/15 blur-3xl pointer-events-none"
          />

          <div className="relative grid grid-cols-1 small:grid-cols-12 gap-6 items-end">
            <div className="small:col-span-7 flex flex-col gap-y-3">
              <div className="flex items-center gap-x-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-grey-90/70 font-bold">
                  Fresh Hub
                </span>
                <span className="w-1 h-1 rounded-full bg-grey-90/40" />
                <span className="text-[10px] uppercase tracking-[0.22em] text-grey-90/70 font-bold">
                  Members&apos; Pass
                </span>
              </div>
              <div className="font-heading italic text-[32px] small:text-[40px] leading-none text-grey-90 tracking-[-0.01em]">
                {customerName ?? "Hub Member"}
              </div>
              <div className="flex items-center gap-x-2 text-caption text-grey-90/70">
                <span className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full bg-grey-90 text-brand-gold-300 text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-300" />
                  Active
                </span>
                <span>·</span>
                <span className="font-semibold">
                  Tier {membership.tier ?? "harvest-01"}
                </span>
              </div>
            </div>

            <div className="small:col-span-5 grid grid-cols-3 gap-3">
              <Stat label="Points" value={membership.points.toLocaleString()} />
              <Stat
                label="Days left"
                value={daysLeft !== null ? String(daysLeft) : "—"}
              />
              <Stat label="Year" value="01" />
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-grey-10 px-6 small:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-caption text-grey-50">
            {joined && <>Member since {joined}</>}
            {joined && renews && <span className="text-grey-30 px-2">·</span>}
            {renews && (
              <>
                Renews <span className="text-grey-90 font-semibold">{renews}</span>
              </>
            )}
          </div>
          <form action={cancelMembership}>
            <button
              type="submit"
              className="text-caption font-semibold text-grey-50 hover:text-red-600 underline-offset-4 hover:underline transition-colors"
            >
              Cancel membership
            </button>
          </form>
        </div>
      </section>

      {/* Perks active */}
      <section className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden">
        <header className="px-6 small:px-7 py-5 border-b border-grey-10 flex items-start gap-x-4">
          <span className="w-10 h-10 rounded-xl bg-brand-green-50 border border-brand-green-100 text-brand-green-700 flex items-center justify-center text-lg shrink-0">
            ✓
          </span>
          <div>
            <h3 className="font-heading text-h3 text-grey-90 leading-tight">
              Perks active on your account
            </h3>
            <p className="text-caption text-grey-50 mt-0.5">
              These apply automatically — nothing to enable.
            </p>
          </div>
        </header>
        <ul className="grid grid-cols-1 xsmall:grid-cols-2 divide-y xsmall:divide-y-0 xsmall:divide-x divide-grey-10">
          {PERKS.map((p) => (
            <li key={p.title} className="p-6 small:p-7 flex items-start gap-x-4">
              <span className="w-10 h-10 rounded-xl bg-brand-green-600 flex items-center justify-center flex-shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-body-sm font-semibold text-grey-90">
                  {p.title}
                </div>
                <div className="text-caption text-grey-50 leading-relaxed mt-1">
                  {p.desc}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Renew */}
      {renewal.pending ? (
        <RenewalPendingCard renewal={renewal} />
      ) : (
        <details
          className="group bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden"
          data-testid="renew-membership"
        >
          <summary className="flex items-center justify-between gap-x-4 cursor-pointer list-none px-6 small:px-7 py-5">
            <div className="flex items-start gap-x-4">
              <span className="w-10 h-10 rounded-xl bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 flex items-center justify-center text-lg shrink-0">
                🔁
              </span>
              <div>
                <h3 className="font-heading text-h3 text-grey-90 leading-tight">
                  Renew your membership
                </h3>
                <p className="text-caption text-grey-50 mt-0.5 leading-relaxed max-w-md">
                  Pay the ₱500 yearly fee again to extend your membership.
                  Renewing early just adds 12 months to your current expiry —
                  you never lose remaining days.
                </p>
              </div>
            </div>
            <span className="flex-shrink-0 w-8 h-8 rounded-full border border-grey-20 flex items-center justify-center group-open:bg-brand-green-700 group-open:border-brand-green-700 transition-colors">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-grey-60 group-open:text-white group-open:rotate-45 transition-transform"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </summary>
          <div className="px-6 small:px-7 pb-6">
            <MembershipRequestForm
              heading="Submit your ₱500 renewal payment"
              subheading="Pay in cash at the counter or via GCash, then submit here. Your perks stay on while an admin verifies the payment and extends your term."
            />
          </div>
        </details>
      )}
    </div>
  )
}

function RenewalPendingCard({ renewal }: { renewal: MembershipRequest }) {
  const requestedAt = formatDate(renewal.requestedAt)
  const channel = renewal.paymentMethod
    ? MEMBERSHIP_PAYOUT[renewal.paymentMethod]
    : null

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white border border-brand-gold-200 shadow-soft">
      <div className="relative p-6 small:p-8 flex flex-col gap-y-5">
        <div className="flex items-start gap-x-4">
          <span className="w-12 h-12 rounded-2xl bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 flex items-center justify-center shrink-0">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full bg-brand-gold-100 text-brand-gold-900 text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-700 animate-pulse" />
              Renewal awaiting verification
            </div>
            <h3 className="font-heading text-h3 text-grey-90 leading-tight mt-2">
              We&apos;re reviewing your renewal payment
            </h3>
            <p className="text-body-sm text-grey-60 mt-1.5 leading-relaxed max-w-md">
              Your membership stays active in the meantime. Once an admin
              matches your payment, your term is extended by 12 months — no
              days lost.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 xsmall:grid-cols-3 gap-3">
          <Field label="Submitted" value={requestedAt ?? "—"} />
          <Field label="Method" value={channel?.label ?? "—"} />
          <Field label="Reference" value={renewal.paymentReference ?? "—"} mono />
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-grey-10">
          <div className="text-caption text-grey-50">
            Wrong details? Cancel below and resubmit — your current membership
            isn&apos;t affected.
          </div>
          <form action={cancelMembershipRenewal}>
            <button
              type="submit"
              className="text-caption font-semibold text-grey-50 hover:text-red-600 underline-offset-4 hover:underline transition-colors"
            >
              Cancel renewal
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-grey-90/10 backdrop-blur px-3 py-2.5">
      <div className="font-heading italic text-h3 text-grey-90 leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-grey-90/60 font-bold mt-1">
        {label}
      </div>
    </div>
  )
}
