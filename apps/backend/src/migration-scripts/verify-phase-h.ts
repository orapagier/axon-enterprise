/**
 * Runtime verification for Phase H (COD shortfall + remittance aging + the
 * rider-unremitted suspension job) against the LIVE database.
 *
 * The pure aging/shortfall math is already unit-tested (cod-aging.unit.spec.ts)
 * with hand-built rows. This script proves what a unit test can't:
 *   1. the `expected_amount` migration is actually applied — a value written
 *      through the real ledger service round-trips back out of Postgres;
 *   2. the aging/shortfall lib agrees with the SHAPE of rows the real
 *      `listCodTransactions` returns (not just hand-built literals);
 *   3. the REAL `rider-unremitted-tick` job suspends a rider whose oldest
 *      unremitted collection is past the aging threshold.
 *
 * It creates throwaway rider + cod_transaction rows (tagged with a unique
 * suffix), backdates one collection with raw SQL, asserts, then deletes
 * everything it created. Safe to run repeatedly.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-phase-h.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import {
  remittanceAging,
  collectionShortfalls,
  remittanceShortfalls,
  DAY_MS,
  type LedgerRowLite,
} from "../lib/cod-aging"
import riderUnremittedTick from "../jobs/rider-unremitted-tick"

export default async function verifyPhaseH({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)

  const TAG = `verifyH-${Date.now()}`
  const createdTxIds: string[] = []
  let riderId: string | null = null

  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) {
      pass++
      logger.info(`  ✅ ${name}`)
    } else {
      fail++
      logger.error(`  ❌ ${name} ${detail}`)
    }
  }

  const oid = (s: string) => `order_${TAG}_${s}`
  const mkTx = async (
    row: {
      type: "cod_collected" | "rider_remitted"
      order: string
      amount: number
      expected: number | null
    }
  ) => {
    const tx = await ledger.createCodTransactions({
      customer_id: `cust_${TAG}`,
      order_id: oid(row.order),
      type: row.type,
      amount: row.amount,
      expected_amount: row.expected,
      rider_id: riderId,
      recorded_by: null,
      notes: `[${TAG}]`,
    })
    createdTxIds.push(tx.id)
    return tx
  }

  try {
    // ─── Fixtures ────────────────────────────────────────────────────────────
    const rider = await riders.createRiders({
      full_name: `Verify H Rider ${TAG}`,
      phone: `+63999${Date.now().toString().slice(-7)}`,
      hub_id: "hub_verifyH",
      status: "active",
    })
    riderId = rider.id

    // order_a: fresh, fully expected → unremitted, no shortfall, 0–1d bucket
    await mkTx({ type: "cod_collected", order: "a", amount: 10000, expected: 10000 })
    // order_b: 5 days old, rider took LESS than expected → unremitted, shortfall
    //          5000, lands in 3–7d bucket AND trips the >3d aging suspension
    const txB = await mkTx({
      type: "cod_collected",
      order: "b",
      amount: 20000,
      expected: 25000,
    })
    await knex.raw(`update cod_transaction set created_at = ? where id = ?`, [
      new Date(Date.now() - 5 * DAY_MS),
      txB.id,
    ])
    // order_c: collected then fully remitted → SETTLED, excluded from aging
    await mkTx({ type: "cod_collected", order: "c", amount: 8000, expected: 8000 })
    await mkTx({ type: "rider_remitted", order: "c", amount: 8000, expected: 8000 })
    // order_d: collected then UNDER-remitted → settled (excluded from aging) but
    //          a remittance shortfall of 1000
    await mkTx({ type: "cod_collected", order: "d", amount: 5000, expected: 5000 })
    await mkTx({ type: "rider_remitted", order: "d", amount: 4000, expected: 5000 })

    // ─── 1. expected_amount round-trips out of Postgres ──────────────────────
    const [reread] = await ledger.listCodTransactions(
      { order_id: oid("b"), type: "cod_collected" },
      { take: 1 }
    )
    check(
      "expected_amount persists + reads back (migration applied)",
      Number(reread?.expected_amount) === 25000,
      `got ${reread?.expected_amount}`
    )

    // ─── 2. aging + shortfall lib against REAL service rows ───────────────────
    const collected = (await ledger.listCodTransactions(
      { type: "cod_collected", notes: `[${TAG}]` },
      { take: 100 }
    )) as unknown as LedgerRowLite[]
    const remitted = (await ledger.listCodTransactions(
      { type: "rider_remitted", notes: `[${TAG}]` },
      { take: 100 }
    )) as unknown as LedgerRowLite[]

    const now = Date.now()
    const aging = remittanceAging(collected, remitted, now)
    const mine = aging.riders.find((r) => r.rider_id === riderId)
    check(
      "aging: only unsettled cash is outstanding (a + b = 30000)",
      mine?.outstanding_centavos === 30000,
      `got ${mine?.outstanding_centavos}`
    )
    check(
      "aging: fresh collection lands in 0–1d bucket (10000)",
      mine?.buckets.d0_1 === 10000,
      `got ${mine?.buckets.d0_1}`
    )
    check(
      "aging: 5-day collection lands in 3–7d bucket (20000)",
      mine?.buckets.d3_7 === 20000,
      `got ${mine?.buckets.d3_7}`
    )

    const collShort = collectionShortfalls(collected)
    check(
      "collection shortfall flagged (order_b, 5000)",
      collShort.length === 1 &&
        collShort[0].order_id === oid("b") &&
        collShort[0].shortfall_centavos === 5000,
      JSON.stringify(collShort)
    )

    const remitShort = remittanceShortfalls(collected, remitted)
    check(
      "remittance shortfall flagged (order_d, 1000)",
      remitShort.length === 1 &&
        remitShort[0].order_id === oid("d") &&
        remitShort[0].shortfall_centavos === 1000,
      JSON.stringify(remitShort)
    )

    // ─── 3. the REAL job suspends the over-age rider ─────────────────────────
    check(
      "rider starts active",
      (await riders.retrieveRider(riderId)).status === "active"
    )
    await riderUnremittedTick(container)
    const after = await riders.retrieveRider(riderId)
    check(
      "rider-unremitted-tick suspends the >3d-unremitted rider",
      after.status === "suspended",
      `status=${after.status}`
    )
  } finally {
    // ─── Cleanup ─────────────────────────────────────────────────────────────
    for (const id of createdTxIds) {
      try {
        await ledger.deleteCodTransactions(id)
      } catch {
        /* ignore */
      }
    }
    if (riderId) {
      try {
        await riders.deleteRiders(riderId)
      } catch {
        /* ignore */
      }
    }
    logger.info(
      `Cleanup: removed ${createdTxIds.length} ledger rows + ${
        riderId ? 1 : 0
      } rider.`
    )
  }

  logger.info(`Phase H verification: ${pass} passed, ${fail} failed.`)
  if (fail > 0) {
    throw new Error(`Phase H verification FAILED (${fail} failing checks).`)
  }
}
