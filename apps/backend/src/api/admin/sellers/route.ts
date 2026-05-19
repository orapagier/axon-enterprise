import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/sellers — list all customers with account_type=seller.
 * Query: ?verified=true|false to filter.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const verified = (req.query.verified as string | undefined)?.toLowerCase()

  const customers = await customerModule.listCustomers(
    {},
    { take: 500, select: ["id", "email", "first_name", "last_name", "company_name", "phone", "metadata", "created_at"] }
  )

  const sellers = customers.filter(
    (c) =>
      (c.metadata as Record<string, unknown> | null)?.account_type === "seller"
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
