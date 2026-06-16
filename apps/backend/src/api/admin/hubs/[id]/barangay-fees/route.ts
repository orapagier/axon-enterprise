import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELIVERY_FEES_MODULE } from "../../../../../modules/delivery-fees"
import type DeliveryFeesModuleService from "../../../../../modules/delivery-fees/service"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"
import { specialFeeFor } from "../../../../../lib/delivery-tiers"

type UpsertRow = {
  barangay: string
  standard_fee_php: number
  special_fee_php: number
  active?: boolean
}

// Special is always 2× Standard. We only take the Standard fee as input and
// derive Special from it (any client-sent special_fee_php is ignored) so the
// stored row can never disagree with what the buyer's checkout computes.
function validateRow(r: unknown): UpsertRow | string {
  if (!r || typeof r !== "object") return "row must be an object"
  const row = r as Record<string, unknown>
  if (typeof row.barangay !== "string" || !row.barangay.trim()) {
    return "barangay required"
  }
  if (
    typeof row.standard_fee_php !== "number" ||
    !Number.isFinite(row.standard_fee_php) ||
    row.standard_fee_php < 0
  ) {
    return "standard_fee_php must be a non-negative number"
  }
  const standard = Math.round(row.standard_fee_php)
  return {
    barangay: row.barangay.trim(),
    standard_fee_php: standard,
    special_fee_php: specialFeeFor(standard),
    active: typeof row.active === "boolean" ? row.active : true,
  }
}

/** GET /admin/hubs/:id/barangay-fees */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fees: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )
  const rows = await fees.listHubBarangayFees(
    { hub_id: req.params.id },
    { order: { barangay: "ASC" }, take: 1000 }
  )
  res.json({ barangay_fees: rows, count: rows.length })
}

/**
 * POST /admin/hubs/:id/barangay-fees
 * Body: single row OR { rows: [...] } for bulk upsert.
 * Upsert keyed on (hub_id, barangay).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const fees: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  const hub = await hubService.retrieveHub(req.params.id).catch(() => null)
  if (!hub) {
    res.status(404).json({ error: "hub not found" })
    return
  }

  const body = req.body as { rows?: unknown[] } & Record<string, unknown>
  const incoming = Array.isArray(body.rows) ? body.rows : [body]

  const validated: UpsertRow[] = []
  for (let i = 0; i < incoming.length; i++) {
    const v = validateRow(incoming[i])
    if (typeof v === "string") {
      res.status(400).json({ error: `row ${i}: ${v}` })
      return
    }
    validated.push(v)
  }

  const existing = await fees.listHubBarangayFees(
    { hub_id: hub.id },
    { take: 1000 }
  )
  const existingByName = new Map(existing.map((r) => [r.barangay, r]))

  const toCreate: Array<UpsertRow & { hub_id: string }> = []
  const toUpdate: Array<{
    id: string
    standard_fee_php: number
    special_fee_php: number
    active: boolean
  }> = []

  for (const row of validated) {
    const prev = existingByName.get(row.barangay)
    if (prev) {
      toUpdate.push({
        id: prev.id,
        standard_fee_php: row.standard_fee_php,
        special_fee_php: row.special_fee_php,
        active: row.active ?? true,
      })
    } else {
      toCreate.push({ ...row, hub_id: hub.id })
    }
  }

  if (toCreate.length) {
    await fees.createHubBarangayFees(toCreate)
  }
  if (toUpdate.length) {
    await fees.updateHubBarangayFees(toUpdate)
  }

  const refreshed = await fees.listHubBarangayFees(
    { hub_id: hub.id },
    { order: { barangay: "ASC" }, take: 1000 }
  )
  res.json({
    barangay_fees: refreshed,
    created: toCreate.length,
    updated: toUpdate.length,
  })
}
