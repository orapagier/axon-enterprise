import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { isTraderAccount } from "../../../lib/trader"

/**
 * GET /admin/traders — list all customers with account_type=trader.
 * Query: ?approved=true|false to filter by trader approval.
 *
 * Same in-memory metadata scan as /admin/sellers and /admin/memberships —
 * fine at the current user count.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const approved = (req.query.approved as string | undefined)?.toLowerCase()

  const customers = await customerModule.listCustomers(
    {},
    {
      take: 500,
      select: [
        "id",
        "email",
        "first_name",
        "last_name",
        "company_name",
        "phone",
        "metadata",
        "created_at",
      ],
    }
  )

  const traders = customers.filter((c) =>
    isTraderAccount((c.metadata as Record<string, unknown> | null) ?? {})
  )

  const filtered =
    approved === "true"
      ? traders.filter(
          (c) =>
            (c.metadata as Record<string, unknown> | null)?.trader_approved ===
            true
        )
      : approved === "false"
        ? traders.filter(
            (c) =>
              (c.metadata as Record<string, unknown> | null)
                ?.trader_approved !== true
          )
        : traders

  res.json({
    traders: filtered.map((c) => {
      const meta = (c.metadata as Record<string, unknown> | null) ?? {}
      return {
        customer: {
          id: c.id,
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          company_name: c.company_name,
          phone: c.phone,
          created_at: c.created_at,
        },
        trader: {
          approved: meta.trader_approved === true,
          approved_at: meta.trader_approved_at ?? null,
          discount_percent: meta.trader_discount_percent ?? null,
          min_order_note: meta.trader_min_order_note ?? null,
        },
      }
    }),
    count: filtered.length,
  })
}
