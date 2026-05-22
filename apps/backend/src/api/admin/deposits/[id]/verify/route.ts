import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  COD_LEDGER_MODULE,
  DEPOSIT_AMOUNT_CENTAVOS,
} from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"

/**
 * POST /admin/deposits/:id/verify
 *
 * Marks a pending wallet as verified, credits the deposit balance, and writes
 * a `deposit_in` ledger row. Idempotent — re-running on an already-verified
 * wallet is a no-op.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const id = req.params.id

  const [wallet] = await ledger.listBuyerWallets({ id }, { take: 1 })
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" })
    return
  }
  if (wallet.status === "verified") {
    res.json({ wallet, message: "Already verified." })
    return
  }
  if (wallet.status !== "pending_verification") {
    res.status(400).json({
      error: `Cannot verify wallet in status "${wallet.status}"; must be pending_verification.`,
    })
    return
  }

  const verifiedAt = new Date()
  const updated = await ledger.updateBuyerWallets({
    id: wallet.id,
    status: "verified",
    deposit_balance: DEPOSIT_AMOUNT_CENTAVOS,
    verified_at: verifiedAt,
  })

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  await ledger.createCodTransactions({
    customer_id: wallet.customer_id,
    order_id: null,
    type: "deposit_in",
    amount: DEPOSIT_AMOUNT_CENTAVOS,
    reference: wallet.payment_reference,
    recorded_by: actorId,
  })

  res.json({ wallet: updated })
}
