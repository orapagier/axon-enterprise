/**
 * Phase E smoke-test: verify the producer-payout gate primitive (temporary).
 *   npx medusa exec ./src/scripts/rider-smoke-cashstate.ts
 * After a COD delivery (collected, not yet remitted) settled must be FALSE;
 * after recording rider_remitted it must flip to TRUE.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getOrderCashState } from "../lib/order-cash"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"

const ORDER_ID = "order_01KT95V8VRG8H6NW3AD1AVFX4V"
const RIDER_ID = "01KTRBH494HSNPR2CRSR41CQ0D"

export default async function verify({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)

  const before = await getOrderCashState(container, ORDER_ID)
  logger.info(`CASHSTATE_BEFORE ${JSON.stringify(before)}`)

  // Record the rider→hub remittance (the separate event the model requires).
  const [already] = await ledger.listCodTransactions(
    { order_id: ORDER_ID, type: "rider_remitted" },
    { take: 1 }
  )
  if (!already) {
    await ledger.createCodTransactions({
      order_id: ORDER_ID,
      customer_id: "cus_01KSMBJQZ3RXQ33RTT0X46SXEN",
      type: "rider_remitted",
      amount: 10000,
      rider_id: RIDER_ID,
      recorded_by: "smoke-test",
      notes: "Rider remitted COD cash to hub.",
    })
  }

  const after = await getOrderCashState(container, ORDER_ID)
  logger.info(`CASHSTATE_AFTER ${JSON.stringify(after)}`)
}
