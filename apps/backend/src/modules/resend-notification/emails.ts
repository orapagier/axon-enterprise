/**
 * FreshHub transactional email templates (Phase B).
 *
 * Pure functions — no I/O — so templates are unit-testable. The provider
 * (service.ts) calls buildEmail(template, data) and ships the result through
 * the Resend API. Plain inline-styled HTML; no react-email/template deps.
 */

export type BuiltEmail = { subject: string; html: string }

const BRAND = "Mindanao Fresh Hub"
const ACCENT = "#1a7a3a"

function peso(value: unknown): string {
  const n = Number(value ?? 0)
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function manilaDate(ms: unknown): string {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return ""
  return new Date(n).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  })
}

function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f2;font-family:Arial,Helvetica,sans-serif;color:#222">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
      <tr><td style="background:${ACCENT};padding:16px 24px">
        <span style="color:#ffffff;font-size:18px;font-weight:bold">${BRAND}</span>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#163b22">${heading}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e6e8e3;color:#777;font-size:12px">
        ${BRAND} &middot; Tagum City, Davao del Norte<br/>
        This is an automated message — replies are not monitored. For help, visit your hub counter.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.5">${text}</p>`

type Data = Record<string, unknown>

const TEMPLATES: Record<string, (d: Data) => BuiltEmail> = {
  "order-placed": (d) => {
    const fee = Number(d.delivery_fee_php ?? 0)
    const tier = typeof d.delivery_tier === "string" ? d.delivery_tier : null
    return {
      subject: `Order #${d.display_id} received — ${BRAND}`,
      html: layout(
        `Thanks! Order #${d.display_id} is in.`,
        p(`We've received your order totalling <strong>${peso(d.total_php)}</strong>.`) +
          (tier
            ? p(
                `Delivery: <strong>${tier}</strong>${
                  fee > 0
                    ? ` (${peso(fee)} delivery fee, paid in cash on delivery)`
                    : " (free)"
                }.`
              )
            : "") +
          p(
            `Please prepare <strong>${peso(
              Number(d.total_php ?? 0) + fee
            )}</strong> in cash for the rider.`
          ) +
          p(`We'll email you again when your order leaves the hub.`)
      ),
    }
  },

  "order-in-transit": (d) => ({
    subject: `Order #${d.display_id} is on the way`,
    html: layout(
      `Order #${d.display_id} is out for delivery`,
      p(`Your order has left the hub and a rider is on the way.`) +
        p(`Have your cash ready — the rider collects payment on delivery.`)
    ),
  }),

  "order-delivered": (d) => ({
    subject: `Order #${d.display_id} delivered`,
    html: layout(
      `Order #${d.display_id} delivered`,
      p(`Your order was marked delivered. Enjoy your fresh produce!`) +
        (d.collected_php != null
          ? p(`Cash collected: <strong>${peso(d.collected_php)}</strong>.`)
          : "") +
        p(
          `Something wrong with the order? Reply through your account's dispute page or visit the hub counter.`
        )
    ),
  }),

  "dispute-opened": (d) => ({
    subject: `Order #${d.display_id}: delivery issue recorded`,
    html: layout(
      `A delivery issue was recorded for order #${d.display_id}`,
      p(
        `The rider reported that this delivery could not be completed (marked refused).`
      ) +
        p(
          `Please tell us what happened — log in and respond under <strong>My disputes</strong>. Unresolved refusals can affect your ability to order Cash-on-Delivery.`
        )
    ),
  }),

  "dispute-resolved": (d) => {
    const RESOLUTION_NOTE: Record<string, string> = {
      buyer_fault:
        "The refusal was attributed to the buyer. A strike has been recorded on the account — repeated strikes restrict Cash-on-Delivery ordering.",
      producer_fault:
        "The issue was attributed to the producer. No strike was recorded on your account.",
      rider_fault:
        "The issue was attributed to the rider. No strike was recorded on your account.",
      platform_fault:
        "The issue was attributed to the platform. No strike was recorded on your account.",
    }
    const note =
      RESOLUTION_NOTE[String(d.resolution)] ?? "The dispute has been resolved."
    return {
      subject: `Order #${d.display_id}: dispute resolved`,
      html: layout(
        `Dispute for order #${d.display_id} resolved`,
        p(note) + p(`Questions? Visit your hub counter and we'll sort it out.`)
      ),
    }
  },

  "membership-approved": (d) => ({
    subject: `Welcome to ${BRAND} membership!`,
    html: layout(
      `Your membership is active`,
      p(
        `Your Hub Membership${
          d.tier ? ` (<strong>${d.tier}</strong>)` : ""
        } has been approved.`
      ) +
        p(
          `You now have access to <strong>Special delivery (~1 hour)</strong> and member pricing.`
        ) +
        (manilaDate(d.expires_at_ms)
          ? p(`Valid until <strong>${manilaDate(d.expires_at_ms)}</strong>.`)
          : "")
    ),
  }),

  "membership-rejected": () => ({
    subject: `Membership request — payment not verified`,
    html: layout(
      `We couldn't verify your membership payment`,
      p(
        `Your membership request was not approved because the payment reference could not be verified.`
      ) +
        p(
          `You can submit a new request from your account page, or visit the hub counter to pay in person.`
        )
    ),
  }),

  "membership-cancelled": () => ({
    subject: `Your membership has been cancelled`,
    html: layout(
      `Membership cancelled`,
      p(`Your Hub Membership has been cancelled.`) +
        p(
          `If this is unexpected, visit the hub counter or contact your hub for details.`
        )
    ),
  }),

  "membership-expiring": (d) => ({
    subject: `Your membership expires in ${d.days_left} day${
      Number(d.days_left) === 1 ? "" : "s"
    }`,
    html: layout(
      `Membership renewal reminder`,
      p(
        `Your Hub Membership expires on <strong>${manilaDate(
          d.expires_at_ms
        )}</strong> — ${d.days_left} day${
          Number(d.days_left) === 1 ? "" : "s"
        } from now.`
      ) +
        p(
          `Renew at the hub counter (or from your account page) to keep Special delivery and member pricing without interruption.`
        )
    ),
  }),

  "trader-approved": (d) => ({
    subject: `Your trader account is approved — ${d.discount_percent}% off`,
    html: layout(
      `Trader pricing activated`,
      p(
        `Your trader (bulk-buyer) account has been approved with a negotiated discount of <strong>${d.discount_percent}%</strong>, applied automatically at checkout.`
      ) +
        (d.min_order_note
          ? p(`Minimum order: <strong>${d.min_order_note}</strong>.`)
          : "") +
        p(`The discount shows up on your cart total — no code needed.`)
    ),
  }),

  "trader-revoked": () => ({
    subject: `Trader pricing deactivated`,
    html: layout(
      `Trader pricing deactivated`,
      p(`Your negotiated trader discount has been deactivated.`) +
        p(
          `You can still order at regular prices. Contact your hub for details.`
        )
    ),
  }),

  "membership-expired": () => ({
    subject: `Your membership has expired`,
    html: layout(
      `Membership expired`,
      p(
        `Your Hub Membership has expired, so Special delivery and member pricing are paused.`
      ) + p(`Renew anytime at the hub counter or from your account page.`)
    ),
  }),
}

export const EMAIL_TEMPLATE_NAMES = Object.keys(TEMPLATES)

/** Returns null for an unknown template — callers log and skip. */
export function buildEmail(template: string, data: Data): BuiltEmail | null {
  const builder = TEMPLATES[template]
  return builder ? builder(data ?? {}) : null
}
