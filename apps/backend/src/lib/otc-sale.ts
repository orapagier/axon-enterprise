import type { MedusaContainer } from "@medusajs/framework/types"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../modules/cod-ledger/is-duplicate"

/**
 * Shared writer for the `otc_collected` ledger row — hub-held cash with NO
 * remittance leg (no rider), so it never appears in the rider
 * collected−remitted outstanding total.
 *
 * Used by both the OTC counter-sale flow (`POST /admin/otc-counter`, the primary
 * walk-in path) and the legacy per-order route (`POST /admin/orders/:id/otc-collected`).
 *
 * Idempotent: the unique (order_id, type) index allows at most one
 * `otc_collected` row per order; a duplicate resolves to the existing row.
 */

type CodTx = Awaited<
  ReturnType<CodLedgerModuleService["listCodTransactions"]>
>[number]

export type RecordOtcResult =
  | { ok: true; created: boolean; transaction: CodTx }
  | { ok: false; status: number; error: string }

export async function recordOtcCollected(
  container: MedusaContainer,
  args: {
    orderId: string
    customerId: string
    amount: number
    reference?: string | null
    notes?: string | null
    recordedBy?: string | null
  }
): Promise<RecordOtcResult> {
  if (!args.amount || args.amount <= 0) {
    return { ok: false, status: 400, error: "amount (centavos > 0) required" }
  }

  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)

  const [existing] = await ledger.listCodTransactions(
    { order_id: args.orderId, type: "otc_collected" },
    { take: 1 }
  )
  if (existing) {
    return { ok: true, created: false, transaction: existing }
  }

  try {
    const transaction = await ledger.createCodTransactions({
      customer_id: args.customerId,
      order_id: args.orderId,
      type: "otc_collected",
      amount: args.amount,
      reference: args.reference ?? null,
      // OTC has no rider — cash is collected at the hub counter.
      rider_id: null,
      recorded_by: args.recordedBy ?? null,
      notes: args.notes ?? null,
    })
    return { ok: true, created: true, transaction }
  } catch (err) {
    // Lost the race against a concurrent collect: the unique index rejected the
    // second insert. Resolve to the row that won.
    if (isDuplicateCodTransaction(err)) {
      const [row] = await ledger.listCodTransactions(
        { order_id: args.orderId, type: "otc_collected" },
        { take: 1 }
      )
      if (row) {
        return { ok: true, created: false, transaction: row }
      }
    }
    throw err
  }
}
