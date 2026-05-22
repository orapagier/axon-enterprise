import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  COD_LEDGER_MODULE,
  DEPOSIT_AMOUNT_CENTAVOS,
} from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * POST /store/customer/deposit/initiate
 * Body: { reference: string }   // GCash reference number from the buyer
 *
 * Creates (or updates) the buyer's wallet to `pending_verification`. Admin
 * reviews and verifies via /admin/deposits/:id/verify which writes the
 * `deposit_in` ledger row + credits the balance.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const reference = (req.body as { reference?: string } | undefined)?.reference?.trim()
  if (!reference) {
    res.status(400).json({ error: "reference required" })
    return
  }

  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const [existing] = await ledger.listBuyerWallets(
    { customer_id: customerId },
    { take: 1 }
  )

  if (existing?.status === "verified") {
    res.status(409).json({
      error: "Deposit already verified.",
      wallet: existing,
    })
    return
  }

  let wallet
  if (existing) {
    wallet = await ledger.updateBuyerWallets({
      id: existing.id,
      status: "pending_verification",
      payment_reference: reference,
    })
  } else {
    wallet = await ledger.createBuyerWallets({
      customer_id: customerId,
      status: "pending_verification",
      payment_reference: reference,
      deposit_balance: 0,
    })
    // Link the new wallet to the customer so it joins via query.graph.
    try {
      await link.create({
        [Modules.CUSTOMER]: { customer_id: customerId },
        [COD_LEDGER_MODULE]: { buyer_wallet_id: wallet.id },
      })
    } catch {
      // Already linked — fine.
    }
  }

  res.status(201).json({
    wallet,
    deposit_amount_centavos: DEPOSIT_AMOUNT_CENTAVOS,
    message: "Deposit submitted. Pending admin verification.",
  })
}
