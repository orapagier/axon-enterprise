import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ACCOUNTABILITY_MODULE } from "../../../modules/accountability"
import type AccountabilityModuleService from "../../../modules/accountability/service"

/**
 * GET /admin/disputes
 * Query: resolution (default 'pending')
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accountability: AccountabilityModuleService = req.scope.resolve(
    ACCOUNTABILITY_MODULE
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const resolution = (req.query.resolution as string) ?? "pending"
  const disputes = await accountability.listRefusalDisputes(
    { resolution },
    { order: { created_at: "DESC" }, take: 200 }
  )

  const ids = Array.from(new Set(disputes.map((d) => d.customer_id)))
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

  const enriched = disputes.map((d) => ({
    ...d,
    customer: customerById.get(d.customer_id) ?? null,
  }))

  res.json({ disputes: enriched, count: enriched.length })
}
