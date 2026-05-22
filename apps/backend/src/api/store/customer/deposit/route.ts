import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_LEDGER_MODULE } from "../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../modules/cod-ledger/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * GET /store/customer/deposit — return the authenticated customer's wallet.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const [wallet] = await ledger.listBuyerWallets(
    { customer_id: customerId },
    { take: 1 }
  )
  res.json({
    wallet: wallet ?? { customer_id: customerId, status: "none", deposit_balance: 0 },
  })
}
