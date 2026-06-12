"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useActionState } from "react"

import { addProducerRole, addTraderRole, AddRoleState } from "@lib/data/roles"
import { HUB_CITIES } from "@lib/constants/hub-cities"
import { MEMBERSHIP_FEE_PHP } from "@lib/util/membership"
import { ROLE_ICONS, type StackableRole } from "@lib/util/roles"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MembershipRequestForm from "@modules/account/components/membership-request-form"

type Props = {
  roles: StackableRole[]
  membershipStatus: string | null
  membershipExpiresAt: number | null
  membershipGraceUntil: number | null
  traderApproved: boolean
  traderDiscountPercent: number | null
  riderStatus: string | null
}

const inputCls =
  "w-full rounded-xl border border-grey-20 bg-white px-4 py-3 text-body-sm focus:outline-none focus:border-brand-green-400 transition-colors"
const labelCls =
  "text-[10px] uppercase tracking-[0.18em] font-bold text-grey-50"

const Field = ({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) => (
  <label className="flex flex-col gap-y-1.5">
    <span className={labelCls}>{label}</span>
    {children}
    {error && <span className="text-caption text-red-600">{error}</span>}
  </label>
)

const CitySelect = ({ name }: { name: string }) => (
  <select name={name} required defaultValue="" className={inputCls}>
    <option value="" disabled>
      Select your city…
    </option>
    {HUB_CITIES.map((city) => (
      <option key={city} value={city}>
        {city}
      </option>
    ))}
  </select>
)

const StatusBadge = ({
  tone,
  children,
}: {
  tone: "active" | "pending" | "warn"
  children: React.ReactNode
}) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
      tone === "active"
        ? "bg-brand-green-50 border-brand-green-100 text-brand-green-700"
        : tone === "pending"
          ? "bg-brand-gold-50 border-brand-gold-200 text-brand-gold-800"
          : "bg-red-50 border-red-100 text-red-700"
    }`}
  >
    {children}
  </span>
)

const Card = ({
  icon,
  title,
  badge,
  children,
}: {
  icon: string
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
    <div className="flex items-center gap-x-3">
      <div className="w-10 h-10 rounded-xl bg-grey-5 border border-grey-10 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <h2 className="font-heading font-bold text-h3 text-grey-90 flex-1">
        {title}
      </h2>
      {badge}
    </div>
    <div className="mt-3 text-body-sm text-grey-50 leading-relaxed">
      {children}
    </div>
  </div>
)

const manilaDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  })

function RoleForm({
  action,
  cta,
  children,
}: {
  action: (
    prev: AddRoleState | null,
    formData: FormData
  ) => Promise<AddRoleState>
  cta: string
  children: (state: AddRoleState | null) => React.ReactNode
}) {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [state, formAction, pending] = useActionState<
    AddRoleState | null,
    FormData
  >(action, null)

  useEffect(() => {
    if (state?.ok) {
      router.refresh()
    }
  }, [state?.ok, router])

  return (
    <form action={formAction} className="flex flex-col gap-y-4 mt-4">
      <input type="hidden" name="countryCode" value={countryCode} />
      {children(state)}
      {state?.error && (
        <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full small:w-auto small:self-start px-8 py-3 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-bold shadow-soft transition-colors disabled:opacity-60"
      >
        {pending ? "Submitting…" : cta}
      </button>
    </form>
  )
}

export default function AccountTypesPanel({
  roles,
  membershipStatus,
  membershipExpiresAt,
  membershipGraceUntil,
  traderApproved,
  traderDiscountPercent,
  riderStatus,
}: Props) {
  const isProducer = roles.includes("producer")
  const isTrader = roles.includes("trader")
  const isRider = roles.includes("rider") || riderStatus !== null
  const [openForm, setOpenForm] = useState<"producer" | "trader" | null>(null)

  // A Producer/Trader role only fully activates once the yearly registration
  // is paid and verified. Until then the payment form below the cards is the
  // user's next step.
  const registrationPaid =
    membershipStatus === "active" || membershipStatus === "grace"
  const registrationPending = membershipStatus === "pending"
  const paymentDue = (isProducer || isTrader) && !registrationPaid

  const registrationBadge = registrationPaid ? (
    membershipStatus === "grace" ? (
      <StatusBadge tone="warn">Renewal due</StatusBadge>
    ) : (
      <StatusBadge tone="active">Active</StatusBadge>
    )
  ) : registrationPending ? (
    <StatusBadge tone="pending">Verifying payment</StatusBadge>
  ) : (
    <StatusBadge tone="warn">Payment required</StatusBadge>
  )

  const registrationLine =
    membershipStatus === "active" && membershipExpiresAt ? (
      <>
        Yearly registration active until{" "}
        <b className="text-grey-80">{manilaDate(membershipExpiresAt)}</b>.
      </>
    ) : membershipStatus === "grace" ? (
      <>
        Your yearly registration has lapsed —{" "}
        <b className="text-grey-80">
          renew at the hub counter
          {membershipGraceUntil
            ? ` before ${manilaDate(membershipGraceUntil)}`
            : " within 30 days"}
        </b>{" "}
        or this account type is removed automatically.
      </>
    ) : membershipStatus === "pending" ? (
      <>
        Registration payment submitted — an admin verifies it manually,
        usually within a business day.
      </>
    ) : (
      <>
        <b className="text-grey-80">One step left:</b> pay the ₱
        {MEMBERSHIP_FEE_PHP} yearly registration —{" "}
        <a
          href="#registration-payment"
          className="underline hover:text-brand-green-700"
        >
          cash at the counter or GCash, below
        </a>
        .
      </>
    )

  const addButton = (label: string, form: "producer" | "trader") => (
    <button
      type="button"
      onClick={() => setOpenForm(openForm === form ? null : form)}
      className="mt-4 inline-flex items-center gap-x-1.5 px-4 py-2.5 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold shadow-soft transition-colors"
    >
      {openForm === form ? "Close" : label}
    </button>
  )

  return (
    <div
      className="flex flex-col gap-y-4 small:gap-y-6"
      data-testid="account-types-page-wrapper"
    >
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <span className={labelCls}>Account types</span>
        <h1 className="font-heading font-bold text-h1 text-grey-90 mt-2 tracking-[-0.02em]">
          One account, stackable roles
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 max-w-2xl leading-relaxed">
          Everyone on FreshHub is a Consumer. Add Producer, Trader or Rider
          capabilities on top whenever you need them — we only ask for the
          extra details that role requires. Producer and Trader carry a ₱
          {MEMBERSHIP_FEE_PHP} yearly registration, payable in cash at your
          hub counter or via GCash (an admin verifies it manually); if it
          lapses for more than 30 days, that role is removed automatically
          and you can re-add it anytime.
        </p>
      </div>

      {/* Consumer — the base everyone has */}
      <Card
        icon={ROLE_ICONS.consumer}
        title="Consumer"
        badge={<StatusBadge tone="active">Active</StatusBadge>}
      >
        Browse, order and get deliveries from your hub. This is the base of
        every FreshHub account and never expires.
      </Card>

      {/* Producer */}
      <Card
        icon={ROLE_ICONS.producer}
        title="Producer"
        badge={isProducer ? registrationBadge : undefined}
      >
        {isProducer ? (
          <>
            <p>
              You can list your harvest from{" "}
              <LocalizedClientLink
                href="/account/producer"
                className="underline hover:text-brand-green-700"
              >
                My Listings
              </LocalizedClientLink>
              . {registrationLine}
            </p>
          </>
        ) : isTrader ? (
          <p>
            Sell your own harvest through the hub. Not available while your
            account is a Trader — the two can&apos;t be combined.
          </p>
        ) : (
          <>
            <p>
              Sell your harvest through the hub. After adding your farm
              details, pay the yearly registration in cash at the hub counter
              or via GCash — the hub verifies the payment and activates you
              before your first listing goes live.
            </p>
            {addButton("Become a Producer", "producer")}
            {openForm === "producer" && (
              <RoleForm action={addProducerRole} cta="Add Producer role">
                {(state) => (
                  <>
                    <Field
                      label="Business or farm name"
                      error={state?.fieldErrors?.business_name}
                    >
                      <input
                        name="business_name"
                        type="text"
                        required
                        className={inputCls}
                        placeholder="San Isidro Farms"
                      />
                    </Field>
                    <Field
                      label="City / municipality (your hub)"
                      error={state?.fieldErrors?.primary_hub}
                    >
                      <CitySelect name="primary_hub" />
                    </Field>
                    <Field
                      label="Contact phone"
                      error={state?.fieldErrors?.contact_phone}
                    >
                      <input
                        name="contact_phone"
                        type="tel"
                        inputMode="tel"
                        required
                        className={inputCls}
                        placeholder="09xx xxx xxxx"
                      />
                    </Field>
                    <Field
                      label="What you grow / catch"
                      error={state?.fieldErrors?.products_offered}
                    >
                      <input
                        name="products_offered"
                        type="text"
                        required
                        className={inputCls}
                        placeholder="Tomatoes, eggplant, tilapia…"
                      />
                    </Field>
                  </>
                )}
              </RoleForm>
            )}
          </>
        )}
      </Card>

      {/* Trader */}
      <Card
        icon={ROLE_ICONS.trader}
        title="Trader"
        badge={
          isTrader ? (
            !registrationPaid ? (
              registrationBadge
            ) : membershipStatus === "grace" ? (
              <StatusBadge tone="warn">Renewal due</StatusBadge>
            ) : traderApproved ? (
              <StatusBadge tone="active">
                Approved · {traderDiscountPercent ?? 0}% off
              </StatusBadge>
            ) : (
              <StatusBadge tone="pending">Pending approval</StatusBadge>
            )
          ) : undefined
        }
      >
        {isTrader ? (
          traderApproved ? (
            <p>
              Your negotiated {traderDiscountPercent ?? 0}% discount applies
              automatically at checkout. {registrationLine}
            </p>
          ) : (
            <p>
              Your Trader profile is in — settle the yearly registration and
              negotiate your bulk discount with the hub, and the hub will
              activate it. {registrationLine}
            </p>
          )
        ) : isProducer ? (
          <p>
            Buy in bulk (B2B) at a negotiated discount. Not available while
            your account is a Producer — the two can&apos;t be combined.
          </p>
        ) : (
          <>
            <p>
              For restaurants, cafés, retailers and distributors buying in
              bulk. Add your business details, then settle the yearly
              registration and your discount with the hub.
            </p>
            {addButton("Become a Trader", "trader")}
            {openForm === "trader" && (
              <RoleForm action={addTraderRole} cta="Add Trader role">
                {(state) => (
                  <>
                    <Field
                      label="Business name"
                      error={state?.fieldErrors?.business_name}
                    >
                      <input
                        name="business_name"
                        type="text"
                        required
                        className={inputCls}
                        placeholder="Kusina ni Aling Nena"
                      />
                    </Field>
                    <Field
                      label="Business type"
                      error={state?.fieldErrors?.business_type}
                    >
                      <select
                        name="business_type"
                        required
                        defaultValue=""
                        className={inputCls}
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        <option value="restaurant">Restaurant / café</option>
                        <option value="retailer">Retailer / sari-sari</option>
                        <option value="distributor">Distributor</option>
                        <option value="institution">
                          Institution (school, canteen…)
                        </option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field
                      label="City / municipality"
                      error={state?.fieldErrors?.default_city}
                    >
                      <CitySelect name="default_city" />
                    </Field>
                    <Field
                      label="Contact phone"
                      error={state?.fieldErrors?.contact_phone}
                    >
                      <input
                        name="contact_phone"
                        type="tel"
                        inputMode="tel"
                        required
                        className={inputCls}
                        placeholder="09xx xxx xxxx"
                      />
                    </Field>
                    <Field label="Estimated monthly volume (optional)">
                      <input
                        name="estimated_monthly_volume"
                        type="text"
                        className={inputCls}
                        placeholder="e.g. 200 kg vegetables"
                      />
                    </Field>
                  </>
                )}
              </RoleForm>
            )}
          </>
        )}
      </Card>

      {/* Rider */}
      <Card
        icon={ROLE_ICONS.rider}
        title="Rider"
        badge={
          isRider ? (
            riderStatus === "active" ? (
              <StatusBadge tone="active">Active</StatusBadge>
            ) : riderStatus === "pending" ? (
              <StatusBadge tone="pending">Pending bond</StatusBadge>
            ) : riderStatus ? (
              <StatusBadge tone="warn">{riderStatus}</StatusBadge>
            ) : (
              <StatusBadge tone="pending">Registered</StatusBadge>
            )
          ) : undefined
        }
      >
        {isRider ? (
          <p>
            Your run sheet lives on the{" "}
            <LocalizedClientLink
              href="/account/rider"
              className="underline hover:text-brand-green-700"
            >
              Deliveries page
            </LocalizedClientLink>
            .{" "}
            {riderStatus === "pending"
              ? "Pay your cash bond at the hub counter and the dispatcher will activate you."
              : null}
          </p>
        ) : (
          <>
            <p>
              Deliver orders for your city&apos;s hub and earn per delivery.
              Riders pay a cash bond at the hub counter instead of a yearly
              fee — and yes, you can ride while also being a Producer or
              Trader.
            </p>
            <LocalizedClientLink
              href="/account/rider"
              className="mt-4 inline-flex items-center gap-x-1.5 px-4 py-2.5 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold shadow-soft transition-colors"
            >
              Register as a Rider
            </LocalizedClientLink>
          </>
        )}
      </Card>
    </div>
  )
}
