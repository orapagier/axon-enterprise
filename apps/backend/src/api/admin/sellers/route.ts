import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { hasRole } from "../../../lib/roles"

/**
 * GET /admin/sellers — list all customers with the producer role.
 * Query: ?verified=true|false to filter.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const verified = (req.query.verified as string | undefined)?.toLowerCase()

  const customers = await customerModule.listCustomers(
    {},
    { take: 500, select: ["id", "email", "first_name", "last_name", "company_name", "phone", "metadata", "created_at"] }
  )

  const sellers = customers.filter((c) =>
    hasRole((c.metadata as Record<string, unknown> | null) ?? {}, "producer")
  )

  const filtered =
    verified === "true"
      ? sellers.filter(
          (c) =>
            (c.metadata as Record<string, unknown> | null)?.seller_verified ===
            true
        )
      : verified === "false"
        ? sellers.filter(
            (c) =>
              (c.metadata as Record<string, unknown> | null)
                ?.seller_verified !== true
          )
        : sellers

  res.json({ sellers: filtered, count: filtered.length })
}
