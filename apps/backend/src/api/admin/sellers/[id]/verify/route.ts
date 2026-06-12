import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { hasRole } from "../../../../../lib/roles"

/**
 * POST /admin/sellers/:id/verify
 * Body: { verified?: boolean }   default true
 *
 * Marks a seller customer as verified (or un-verified). After this,
 * the seller can list draft products via /store/seller/products.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.params.id
  const { verified = true } = (req.body ?? {}) as { verified?: boolean }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }
  const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
  if (meta.account_type !== "producer" && meta.account_type !== "seller") {
    res.status(400).json({ error: "Customer is not a producer" })
    return
  }

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...meta,
      seller_verified: verified,
      seller_verified_at: verified ? new Date().toISOString() : null,
    },
  })

  res.json({ ok: true, verified })
}
