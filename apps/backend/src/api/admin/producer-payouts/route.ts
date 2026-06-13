import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCER_PAYOUT_MODULE } from "../../../modules/producer-payout"
import type ProducerPayoutModuleService from "../../../modules/producer-payout/service"
import { listOwedDtc } from "../../../lib/producer-payout"
import { getOrderCashState } from "../../../lib/order-cash"
import { hasRole } from "../../../lib/roles"

/**
 * GET /admin/producer-payouts
 *   Returns:
 *     - owed:      settled DTC orders not yet remitted (grouped by producer)
 *     - recent:    the latest recorded payouts (both kinds)
 *     - producers: producer customers, for the hub-intake payout form
 *
 * POST /admin/producer-payouts
 *   Records a payout. Body:
 *     { kind: "dtc_remit", producer_id, order_id, amount_php, gross_php?,
 *       method?, reference?, notes? }
 *   | { kind: "hub_intake", producer_id, producer_name?, amount_php,
 *       method?, reference?, notes? }
 *   A dtc_remit requires the order's cash to be settled and is unique per
 *   (order, producer).
 */

const toCentavos = (php: unknown): number | null => {
  const n = typeof php === "number" ? php : Number(php)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ProducerPayoutModuleService = req.scope.resolve(
    PRODUCER_PAYOUT_MODULE
  )
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const [owed, recent, customers] = await Promise.all([
    listOwedDtc(req.scope),
    service.listProducerPayouts(
      {},
      { take: 100, order: { created_at: "DESC" } }
    ),
    customerModule.listCustomers(
      {},
      {
        take: 500,
        select: ["id", "email", "first_name", "last_name", "company_name", "metadata"],
      }
    ),
  ])

  const producers = customers
    .filter((c) =>
      hasRole((c.metadata as Record<string, unknown> | null) ?? {}, "producer")
    )
    .map((c) => ({
      id: c.id,
      email: c.email,
      name:
        [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
        c.company_name ||
        c.email,
      business_name:
        (c.metadata as Record<string, unknown> | null)?.business_name ??
        c.company_name ??
        null,
    }))

  res.json({
    owed,
    recent: recent.map((p) => ({
      id: p.id,
      producer_id: p.producer_id,
      producer_name: p.producer_name,
      order_id: p.order_id,
      kind: p.kind,
      gross_centavos: p.gross_centavos != null ? Number(p.gross_centavos) : null,
      amount_centavos: Number(p.amount_centavos),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      created_at: p.created_at,
    })),
    producers,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ProducerPayoutModuleService = req.scope.resolve(
    PRODUCER_PAYOUT_MODULE
  )
  const body = (req.body ?? {}) as {
    kind?: "dtc_remit" | "hub_intake"
    producer_id?: string
    producer_name?: string | null
    order_id?: string | null
    amount_php?: number
    gross_php?: number | null
    method?: "cash" | "gcash"
    reference?: string | null
    notes?: string | null
  }

  if (body.kind !== "dtc_remit" && body.kind !== "hub_intake") {
    res.status(400).json({ error: "kind must be dtc_remit | hub_intake" })
    return
  }
  if (!body.producer_id) {
    res.status(400).json({ error: "producer_id is required" })
    return
  }
  const amount = toCentavos(body.amount_php)
  if (amount === null) {
    res.status(400).json({ error: "amount_php must be a positive number" })
    return
  }
  const method = body.method === "gcash" ? "gcash" : "cash"
  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  if (body.kind === "dtc_remit") {
    if (!body.order_id) {
      res.status(400).json({ error: "order_id is required for a dtc_remit" })
      return
    }
    // Gate on settled cash — a producer is only payable once the hub holds the
    // money (OTC paid, or COD collected AND remitted).
    const cash = await getOrderCashState(req.scope, body.order_id)
    if (!cash.settled) {
      res.status(409).json({
        error:
          "This order's cash hasn't settled yet (needs OTC paid, or COD collected + remitted).",
      })
      return
    }
    // Idempotency: one remittance per (order, producer).
    const [dup] = await service.listProducerPayouts(
      { order_id: body.order_id, producer_id: body.producer_id, kind: "dtc_remit" },
      { take: 1 }
    )
    if (dup) {
      res.status(409).json({ error: "This producer was already paid for this order." })
      return
    }
  }

  const payout = await service.createProducerPayouts({
    producer_id: body.producer_id,
    producer_name:
      typeof body.producer_name === "string" && body.producer_name.trim()
        ? body.producer_name.trim()
        : null,
    order_id: body.kind === "dtc_remit" ? body.order_id : null,
    kind: body.kind,
    gross_centavos: toCentavos(body.gross_php),
    amount_centavos: amount,
    method,
    reference:
      typeof body.reference === "string" && body.reference.trim()
        ? body.reference.trim()
        : null,
    notes:
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null,
    recorded_by: actorId,
  })

  res.json({ ok: true, payout })
}
