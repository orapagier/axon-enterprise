/**
 * Runtime verification for Phase G (dispute SLAs + appeals).
 *
 * Drives the REAL dispute-sla-tick job and the REAL resolve-dispute /
 * appeal-dispute workflows against throwaway refusal_dispute + buyer_account_status
 * rows, asserting the DB transitions, then deletes everything it created.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-phase-g.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ACCOUNTABILITY_MODULE,
  DISPUTE_RESPONSE_SLA_MS,
  DISPUTE_REMINDER_AFTER_MS,
} from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import { canAppeal } from "../lib/dispute-appeal"
import disputeSlaTick from "../jobs/dispute-sla-tick"
import resolveDisputeWorkflow from "../workflows/resolve-dispute"
import appealDisputeWorkflow from "../workflows/appeal-dispute"

export default async function verifyPhaseG({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const accountability: AccountabilityModuleService =
    container.resolve(ACCOUNTABILITY_MODULE)

  const TAG = `verifyG-${Date.now()}`
  const createdDisputeIds: string[] = []
  const createdStatusIds: string[] = []

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

  const now = Date.now()
  const mkDispute = async (suffix: string, customerId: string) => {
    const d = await accountability.createRefusalDisputes({
      order_id: `order_${TAG}_${suffix}`,
      dispatch_order_id: `do_${TAG}_${suffix}`,
      customer_id: customerId,
      resolution: "pending",
    })
    createdDisputeIds.push(d.id)
    return d
  }
  const backdate = async (id: string, ms: number) => {
    await knex.raw(`update refusal_dispute set created_at = ? where id = ?`, [
      new Date(now - ms),
      id,
    ])
  }
  const reread = async (id: string) =>
    (await accountability.listRefusalDisputes({ id }, { take: 1 }))[0]
  const rereadStatus = async (customerId: string) =>
    (
      await accountability.listBuyerAccountStatuses(
        { customer_id: customerId },
        { take: 1 }
      )
    )[0]

  try {
    // ─── Part 1: SLA tick (remind @24h, escalate @48h, nothing for fresh) ────
    logger.info("Phase G · Part 1 — dispute-sla-tick")
    const dRemind = await mkDispute("remind", `cus_${TAG}_remind`)
    const dEscalate = await mkDispute("escalate", `cus_${TAG}_escalate`)
    const dFresh = await mkDispute("fresh", `cus_${TAG}_fresh`)
    await backdate(dRemind.id, DISPUTE_REMINDER_AFTER_MS + 60 * 60 * 1000) // 25h
    await backdate(dEscalate.id, DISPUTE_RESPONSE_SLA_MS + 60 * 60 * 1000) // 49h
    await backdate(dFresh.id, 60 * 60 * 1000) // 1h

    await disputeSlaTick(container)

    const rRemind = await reread(dRemind.id)
    const rEscalate = await reread(dEscalate.id)
    const rFresh = await reread(dFresh.id)
    check(
      "silent buyer @25h → reminded (buyer_reminder_sent_at stamped)",
      !!rRemind.buyer_reminder_sent_at && !rRemind.escalated_at
    )
    check(
      "unresolved @49h → escalated for admin, NOT auto-struck (resolution still pending)",
      !!rEscalate.escalated_at && rEscalate.resolution === "pending",
      `escalated_at=${rEscalate.escalated_at} resolution=${rEscalate.resolution}`
    )
    check(
      "fresh @1h → untouched",
      !rFresh.buyer_reminder_sent_at && !rFresh.escalated_at
    )

    // Idempotency: a second tick must not re-stamp / double-act.
    await disputeSlaTick(container)
    const rRemind2 = await reread(dRemind.id)
    const rEscalate2 = await reread(dEscalate.id)
    check(
      "second tick is idempotent (reminder timestamp unchanged)",
      String(rRemind2.buyer_reminder_sent_at) ===
        String(rRemind.buyer_reminder_sent_at)
    )
    check(
      "second tick leaves escalated dispute pending (no auto-strike)",
      rEscalate2.resolution === "pending"
    )

    // ─── Part 2: resolve buyer_fault → strike, then appeal OVERTURN ──────────
    logger.info("Phase G · Part 2 — appeal overturn reverses the strike")
    const custOver = `cus_${TAG}_overturn`
    const sOver = await accountability.createBuyerAccountStatuses({
      customer_id: custOver,
      strike_count: 0,
      state: "normal",
    })
    createdStatusIds.push(sOver.id)
    const dOver = await mkDispute("overturn", custOver)

    await resolveDisputeWorkflow(container).run({
      input: { dispute_id: dOver.id, resolution: "buyer_fault" },
    })
    let st = await rereadStatus(custOver)
    let dd = await reread(dOver.id)
    check(
      "resolve buyer_fault → strike 1 / warned",
      st.strike_count === 1 && st.state === "warned",
      `strike=${st.strike_count} state=${st.state}`
    )
    check(
      "resolved dispute is appeal-eligible (canAppeal)",
      canAppeal(
        {
          resolution: dd.resolution,
          appeal_state: dd.appeal_state,
          resolved_at: dd.resolved_at,
        },
        new Date()
      )
    )

    // buyer files the appeal (what POST /store/.../appeal does)
    await accountability.updateRefusalDisputes({
      id: dOver.id,
      appeal_state: "requested",
      appeal_notes: "Produce arrived spoiled.",
      appeal_requested_at: new Date(),
    })
    await appealDisputeWorkflow(container).run({
      input: { dispute_id: dOver.id, decision: "overturn", notes: "Photos confirm spoilage." },
    })
    st = await rereadStatus(custOver)
    dd = await reread(dOver.id)
    check(
      "overturn → strike reversed to 0 / normal",
      st.strike_count === 0 && st.state === "normal",
      `strike=${st.strike_count} state=${st.state}`
    )
    check(
      "overturn → appeal_state=overturned, resolution kept buyer_fault for audit",
      dd.appeal_state === "overturned" && dd.resolution === "buyer_fault"
    )

    // ─── Part 3: appeal UPHOLD keeps the strike ──────────────────────────────
    logger.info("Phase G · Part 3 — appeal uphold keeps the strike")
    const custUp = `cus_${TAG}_uphold`
    const sUp = await accountability.createBuyerAccountStatuses({
      customer_id: custUp,
      strike_count: 0,
      state: "normal",
    })
    createdStatusIds.push(sUp.id)
    const dUp = await mkDispute("uphold", custUp)
    await resolveDisputeWorkflow(container).run({
      input: { dispute_id: dUp.id, resolution: "buyer_fault" },
    })
    await accountability.updateRefusalDisputes({
      id: dUp.id,
      appeal_state: "requested",
      appeal_notes: "I wasn't home but the rider never called.",
      appeal_requested_at: new Date(),
    })
    await appealDisputeWorkflow(container).run({
      input: { dispute_id: dUp.id, decision: "uphold", notes: "Rider log shows two call attempts." },
    })
    const stUp = await rereadStatus(custUp)
    const ddUp = await reread(dUp.id)
    check(
      "uphold → strike stands at 1 / warned",
      stUp.strike_count === 1 && stUp.state === "warned",
      `strike=${stUp.strike_count} state=${stUp.state}`
    )
    check("uphold → appeal_state=upheld", ddUp.appeal_state === "upheld")

    // Double-appeal guard: appealing an already-decided dispute throws.
    let guarded = false
    try {
      await appealDisputeWorkflow(container).run({
        input: { dispute_id: dUp.id, decision: "overturn" },
      })
    } catch {
      guarded = true
    }
    check("re-appealing a decided dispute is rejected", guarded)
  } finally {
    // ─── Cleanup ─────────────────────────────────────────────────────────────
    for (const id of createdDisputeIds) {
      try {
        await accountability.deleteRefusalDisputes(id)
      } catch {
        /* ignore */
      }
    }
    for (const id of createdStatusIds) {
      try {
        await accountability.deleteBuyerAccountStatuses(id)
      } catch {
        /* ignore */
      }
    }
    logger.info(
      `Cleanup: removed ${createdDisputeIds.length} disputes, ${createdStatusIds.length} status rows.`
    )
  }

  logger.info(`Phase G verification: ${pass} passed, ${fail} failed.`)
  if (fail > 0) {
    throw new Error(`Phase G verification FAILED (${fail} failing checks).`)
  }
}
