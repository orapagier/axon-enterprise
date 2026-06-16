import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELIVERY_FEES_MODULE } from "../../../../../../modules/delivery-fees"
import type DeliveryFeesModuleService from "../../../../../../modules/delivery-fees/service"
import { specialFeeFor } from "../../../../../../lib/delivery-tiers"

/** PATCH /admin/hubs/:id/barangay-fees/:feeId */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const fees: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  const body = req.body as {
    standard_fee_php?: number
    active?: boolean
  }

  const update: {
    id: string
    standard_fee_php?: number
    special_fee_php?: number
    active?: boolean
  } = { id: req.params.feeId }

  // Only Standard is editable; Special is always re-derived as 2× Standard so
  // a client can never set the two out of sync.
  if (body.standard_fee_php !== undefined) {
    if (
      typeof body.standard_fee_php !== "number" ||
      body.standard_fee_php < 0
    ) {
      res.status(400).json({ error: "standard_fee_php must be >= 0" })
      return
    }
    const standard = Math.round(body.standard_fee_php)
    update.standard_fee_php = standard
    update.special_fee_php = specialFeeFor(standard)
  }
  if (body.active !== undefined) {
    update.active = !!body.active
  }

  try {
    const [updated] = await fees.updateHubBarangayFees([update])
    res.json({ barangay_fee: updated })
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg })
      return
    }
    res.status(500).json({ error: msg })
  }
}

/** DELETE /admin/hubs/:id/barangay-fees/:feeId — soft delete */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const fees: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  try {
    await fees.deleteHubBarangayFees([req.params.feeId])
    res.json({ id: req.params.feeId, deleted: true })
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg })
      return
    }
    res.status(500).json({ error: msg })
  }
}
