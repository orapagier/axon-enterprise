import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../modules/cod-ledger/service"

/**
 * GET /admin/deposits
 * Query: status (default = "pending_verification")
 * Returns wallets + a basic customer email lookup for the admin queue.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const status = (req.query.status as string) ?? "pending_verification"
  const wallets = await ledger.listBuyerWallets(
    { status },
    { order: { created_at: "DESC" }, take: 200 }
  )

  const ids = wallets.map((w) => w.customer_id)
  let customerById = new Map<
    string,
    { id: string; email: string | null; first_name: string | null; last_name: string | null }
  >()
  if (ids.length > 0) {
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: ids },
    })
    customerById = new Map(
      (data as Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null }>).map(
        (c) => [c.id, c]
      )
    )
  }

  const enriched = wallets.map((w) => ({
    ...w,
    customer: customerById.get(w.customer_id) ?? null,
  }))

  res.json({ deposits: enriched, count: enriched.length })
}
