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

  "producer-order": (d) => {
    const items = Array.isArray(d.items) ? (d.items as string[]) : []
    const itemsHtml = items.length
      ? `<ul style="margin:0 0 12px;padding-left:18px;font-size:14px;line-height:1.6">${items
          .map((i) => `<li>${i}</li>`)
          .join("")}</ul>`
      : ""
    return {
      subject: `New order #${d.display_id} for your listing — ${BRAND}`,
      html: layout(
        `You have a new order (#${d.display_id})`,
        p(
          `A buyer just placed an order for your direct ${
            items.length === 1 ? "listing" : "listings"
          }:`
        ) +
          itemsHtml +
          (d.buyer_name ? p(`<strong>Buyer:</strong> ${d.buyer_name}`) : "") +
          (d.buyer_phone ? p(`<strong>Phone:</strong> ${d.buyer_phone}`) : "") +
          (d.deliver_to ? p(`<strong>Deliver to:</strong> ${d.deliver_to}`) : "") +
          p(
            `You are the seller of record for ${
              items.length === 1 ? "this item" : "these items"
            } — please prepare and fulfil the order. Freshness and quality are your responsibility.`
          )
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

  "dispute-reminder": (d) => ({
    subject: `Order #${d.display_id}: respond to the delivery issue`,
    html: layout(
      `Reminder: tell us what happened with order #${d.display_id}`,
      p(
        `A delivery for this order was marked refused and we haven't heard your side yet.`
      ) +
        p(
          `Please log in and respond under <strong>My disputes</strong> within the next 24 hours. After the 48-hour window the dispute is sent for review, and an unanswered refusal can affect your Cash-on-Delivery eligibility.`
        )
    ),
  }),

  "dispute-appeal-received": (d) => ({
    subject: `Order #${d.display_id}: your appeal was received`,
    html: layout(
      `We received your appeal for order #${d.display_id}`,
      p(
        `Thanks — your appeal is now with our team for review. We'll email you once a decision is made.`
      ) +
        p(`You can check the status anytime under <strong>My disputes</strong>.`)
    ),
  }),

  "dispute-appeal-resolved": (d) => {
    const overturned = String(d.decision) === "overturn"
    return {
      subject: `Order #${d.display_id}: appeal ${
        overturned ? "granted" : "not granted"
      }`,
      html: layout(
        `Your appeal for order #${d.display_id} was ${
          overturned ? "granted" : "reviewed"
        }`,
        p(
          overturned
            ? "After review, your appeal was <strong>granted</strong> — the strike has been removed from your account."
            : "After review, the original decision stands and the strike remains on your account."
        ) + p(`Questions? Visit your hub counter and we'll sort it out.`)
      ),
    }
  },

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

  "membership-grace": (d) => ({
    subject: `Your yearly registration has lapsed — 30 days to renew`,
    html: layout(
      `Renewal due`,
      p(
        `Your yearly registration has lapsed. You have until <strong>${manilaDate(
          d.grace_until_ms
        )}</strong> to renew at the hub counter — your account keeps working as usual in the meantime.`
      ) +
        p(
          `If the fee isn't settled by then, your Producer/Trader account type is removed automatically and your account continues as a regular Consumer. You can always re-add the account type later from your account page.`
        )
    ),
  }),

  "membership-expired": (d) => {
    const removed = Array.isArray(d.removed_roles)
      ? (d.removed_roles as string[])
      : []
    const roleLabel =
      removed.length > 0
        ? removed
            .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
            .join(" and ")
        : "Producer/Trader"
    return {
      subject: `Your membership has expired`,
      html: layout(
        `Membership expired`,
        p(
          `Your yearly registration was not renewed within the 30-day grace window, so your <strong>${roleLabel}</strong> account type has been removed. Your account continues as a regular Consumer — browsing and ordering work as before.`
        ) +
          p(
            `Want it back? Re-add the account type from your account page and settle the fee at the hub counter, same as your first registration.`
          )
      ),
    }
  },

  "order-hub-fulfilling": (d) => ({
    subject: `Order #${d.display_id}: the hub is handling it`,
    html: layout(
      `Good news about order #${d.display_id}`,
      p(
        `The producer for one or more items couldn't confirm in time, so <strong>the hub is now sourcing and fulfilling your order</strong>.`
      ) + p(`Nothing to do on your end — we'll deliver as planned.`)
    ),
  }),

  "order-cancelled-no-confirm": (d) => ({
    subject: `Order #${d.display_id} cancelled`,
    html: layout(
      `Sorry — order #${d.display_id} was cancelled`,
      p(
        `The seller couldn't confirm your order in time and the hub wasn't able to source the items, so we've cancelled it.`
      ) +
        p(
          `You weren't charged (Cash on Delivery). Please reorder — most items are available from other sellers.`
        )
    ),
  }),

  "order-items-cancelled-no-confirm": (d) => ({
    subject: `Order #${d.display_id}: some items were removed`,
    html: layout(
      `An update on order #${d.display_id}`,
      p(
        `One seller couldn't confirm their items in time, so we removed just those items from your order. The rest is still on the way.`
      ) +
        p(
          `Your total was adjusted automatically — you only pay for what's being delivered (Cash on Delivery). The removed items are usually available from other sellers if you'd like to reorder them.`
        )
    ),
  }),

  "producer-order-cancelled": (d) => ({
    subject: `Order #${d.display_id} cancelled — confirmation missed`,
    html: layout(
      `Order #${d.display_id} was cancelled`,
      p(
        `This direct order was cancelled because it wasn't confirmed within the allowed window.`
      ) +
        p(
          `A confirmation strike was recorded on your account. Repeated misses affect your selling status. If you believe this was a mistake, you can <strong>dispute the strike</strong> from your account's Orders page.`
        )
    ),
  }),

  "admin-producer-escalation": (d) => ({
    subject: `⏰ Order #${d.display_id}: producer hasn't confirmed`,
    html: layout(
      `Order #${d.display_id} needs a decision`,
      p(
        `The producer didn't confirm within the window. You have about <strong>1 hour</strong> to either <strong>Take</strong> the order (fulfil from hub stock) or <strong>Cancel</strong> it.`
      ) +
        (d.producer_name ? p(`<strong>Producer:</strong> ${d.producer_name}`) : "") +
        (d.items ? p(`<strong>Items:</strong> ${d.items}`) : "") +
        p(`If no action is taken in time, the order is cancelled automatically.`)
    ),
  }),

  "referral-credit-earned": (d) => ({
    subject: `You earned ${peso(d.amount_php)} store credit!`,
    html: layout(
      `Referral bonus unlocked`,
      p(
        `Someone you referred just upgraded to a Hub Member account — thank you for spreading the word!`
      ) +
        p(
          `We've added <strong>${peso(
            d.amount_php
          )} store credit</strong> to your account.${
            d.code
              ? ` Use the code <strong>${d.code}</strong> at checkout to take it off your next order.`
              : ""
          }`
        ) +
        p(
          `Keep sharing your referral link from your account page — every friend who upgrades earns you another bonus.`
        )
    ),
  }),
}

export const EMAIL_TEMPLATE_NAMES = Object.keys(TEMPLATES)

/** Returns null for an unknown template — callers log and skip. */
export function buildEmail(template: string, data: Data): BuiltEmail | null {
  const builder = TEMPLATES[template]
  return builder ? builder(data ?? {}) : null
}
