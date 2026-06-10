import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordRefusal } from "../../../../../lib/delivery-actions"

/**
 * POST /admin/dispatch-orders/:id/refusal
 * Body: { rider_photo_url?: string, rider_notes?: string }
 *
 * Admin / hub cashier flags a delivery as refused on the rider's behalf. Flips
 * the DispatchOrder to "refused" and opens a pending RefusalDispute. Idempotent.
 * Shares logic with the rider self-service /rider/orders/:id/refused route.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    rider_photo_url?: string
    rider_notes?: string
  }

  const result = await recordRefusal(req.scope, {
    dispatchOrderId: req.params.id,
    riderPhotoUrl: body.rider_photo_url,
    riderNotes: body.rider_notes,
  })

  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(result.created ? 201 : 200).json({
    dispute: result.dispute,
    ...(result.created ? {} : { message: "Already opened." }),
  })
}
