import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { hasRole } from "./roles"

export type AuthedProducer = {
  id: string
  email: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Resolve the authenticated customer and require the `producer` role. On
 * failure it writes the HTTP response and returns null so the caller can early
 * return. Shared by the /store/seller/orders routes.
 */
export async function assertProducer(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<AuthedProducer | null> {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return null
  }
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = (await customerModule
    .retrieveCustomer(customerId, { select: ["id", "email", "metadata"] })
    .catch(() => null)) as AuthedProducer | null
  if (!customer) {
    res.status(401).json({ error: "Customer not found" })
    return null
  }
  if (!hasRole((customer.metadata ?? {}) as Record<string, unknown>, "producer")) {
    res.status(403).json({ error: "Producer account required" })
    return null
  }
  return customer
}
