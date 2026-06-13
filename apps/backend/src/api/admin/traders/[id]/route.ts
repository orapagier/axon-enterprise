import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  DEFAULT_TRADER_DISCOUNT,
  ensureTraderTier,
  isTraderAccount,
  isValidTraderDiscount,
  syncTraderGroupMembership,
} from "../../../../lib/trader"
import { sendEmail } from "../../../../lib/notify"

/**
 * POST /admin/traders/:id
 * Body: { action: "approve", discount_percent: number (1–90 int), min_order_note? }
 *     | { action: "revoke" }
 *
 * approve — records the negotiated discount on the customer's metadata,
 *           lazily creates the `traders-<pct>` group + automatic
 *           `TRADER-<pct>` promotion, and moves the customer into that tier
 *           (out of any previous one). Re-approving with a new percentage is
 *           how a renegotiated discount is applied.
 * revoke  — clears the approval and removes the customer from every trader
 *           tier group. The tier group/promotion stay (other traders share them).
 *
 * GET /admin/traders/:id — read one trader's state.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.params.id
  const body = (req.body ?? {}) as {
    action?: "approve" | "revoke"
    discount_percent?: number
    min_order_note?: string | null
  }

  if (body.action !== "approve" && body.action !== "revoke") {
    res.status(400).json({ error: "Body must include action: approve | revoke" })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }
  const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
  if (!isTraderAccount(meta)) {
    res.status(400).json({ error: "Customer is not a trader account" })
    return
  }

  if (body.action === "approve") {
    if (!isValidTraderDiscount(body.discount_percent)) {
      res.status(400).json({
        error: "discount_percent must be an integer between 1 and 90",
      })
      return
    }
    const pct = body.discount_percent
    const note =
      typeof body.min_order_note === "string" && body.min_order_note.trim()
        ? body.min_order_note.trim()
        : null

    const groupId = await ensureTraderTier(req.scope, pct)
    await syncTraderGroupMembership(req.scope, customerId, groupId)

    await customerModule.updateCustomers(customerId, {
      metadata: {
        ...meta,
        trader_approved: true,
        trader_approved_at: new Date().toISOString(),
        trader_discount_percent: pct,
        trader_min_order_note: note,
      },
    })

    await sendEmail(req.scope, {
      to: customer.email,
      template: "trader-approved",
      data: { discount_percent: pct, min_order_note: note },
    })

    res.json({
      ok: true,
      action: "approve",
      trader: { approved: true, discount_percent: pct, min_order_note: note },
    })
    return
  }

  // revoke
  await syncTraderGroupMembership(req.scope, customerId, null)
  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...meta,
      trader_approved: false,
      trader_discount_percent: null,
      trader_min_order_note: null,
    },
  })

  await sendEmail(req.scope, {
    to: customer.email,
    template: "trader-revoked",
    data: {},
  })

  res.json({ ok: true, action: "revoke", trader: { approved: false } })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(req.params.id, {
    select: ["id", "email", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }
  const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
  res.json({
    customer: { id: customer.id, email: customer.email },
    trader: {
      is_trader: isTraderAccount(meta),
      approved: meta.trader_approved === true,
      approved_at: meta.trader_approved_at ?? null,
      discount_percent: meta.trader_discount_percent ?? null,
      min_order_note: meta.trader_min_order_note ?? null,
    },
  })
}
