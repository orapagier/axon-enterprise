/**
 * Pure COD shortfall + remittance-aging logic (Phase H).
 *
 * Shared by the `rider-unremitted-tick` job (suspension) and the admin
 * remittance-aging report so the per-order outstanding math can't drift between
 * them. Free of the container/DB on purpose — unit-tested directly.
 *
 * Two distinct discrepancies are modelled here:
 *   - **shortfall**: collected/remitted LESS than expected on a single order
 *     (buyer short-paid at the door, or a rider remitted less than they took).
 *   - **aging**: rider-held cash that is collected-but-not-yet-remitted,
 *     bucketed by how long the rider has been sitting on it.
 */

export const DAY_MS = 24 * 60 * 60 * 1000

/** Minimal ledger-row shape the aging/shortfall math needs. */
export type LedgerRowLite = {
  order_id: string | null
  rider_id: string | null
  amount: number
  expected_amount?: number | null
  created_at: string | Date
  type: string
}

/**
 * Shortfall on one row = expected − actual, floored at 0. A null/absent or
 * non-positive `expected` means "no benchmark recorded", which is not a
 * shortfall (legacy rows predating the column read as 0, never negative).
 */
export function shortfall(
  expected: number | null | undefined,
  actual: number
): number {
  const exp = Number(expected)
  if (!Number.isFinite(exp) || exp <= 0) return 0
  const diff = exp - actual
  return diff > 0 ? diff : 0
}

/** Order ids that already have a rider_remitted row (their COD is settled). */
function remittedOrderIdSet(remitted: LedgerRowLite[]): Set<string> {
  return new Set(remitted.map((t) => t.order_id).filter(Boolean) as string[])
}

export type RiderOutstanding = {
  rider_id: string
  outstanding_centavos: number
  order_count: number
  oldest_ms: number
}

/**
 * Collapse collected/remitted rows into per-rider unremitted balances. An
 * order's COD is settled once any rider_remitted row exists for it, so a
 * cod_collected row whose order_id is in the remitted set is dropped.
 *
 * This is the exact rule the suspension job applies; the aging report layers
 * buckets on top of the same filter (see {@link remittanceAging}).
 */
export function unremittedByRider(
  collected: LedgerRowLite[],
  remitted: LedgerRowLite[]
): RiderOutstanding[] {
  const remittedIds = remittedOrderIdSet(remitted)
  const byRider = new Map<string, RiderOutstanding>()
  for (const t of collected) {
    if (!t.rider_id) continue
    if (t.order_id && remittedIds.has(t.order_id)) continue
    const ts = new Date(t.created_at).getTime()
    const cur = byRider.get(t.rider_id) ?? {
      rider_id: t.rider_id,
      outstanding_centavos: 0,
      order_count: 0,
      oldest_ms: ts,
    }
    cur.outstanding_centavos += t.amount
    cur.order_count += 1
    cur.oldest_ms = Math.min(cur.oldest_ms, ts)
    byRider.set(t.rider_id, cur)
  }
  return [...byRider.values()]
}

// Aging bands, youngest → oldest. `maxDays` is the inclusive upper edge; a row
// lands in the first band whose edge it does not exceed.
export const AGING_BANDS = [
  { key: "d0_1", label: "0–1 day", maxDays: 1 },
  { key: "d1_3", label: "1–3 days", maxDays: 3 },
  { key: "d3_7", label: "3–7 days", maxDays: 7 },
  { key: "d7_plus", label: "7+ days", maxDays: Infinity },
] as const

export type AgingBandKey = (typeof AGING_BANDS)[number]["key"]
export type AgingBuckets = Record<AgingBandKey, number>

export function emptyBuckets(): AgingBuckets {
  return { d0_1: 0, d1_3: 0, d3_7: 0, d7_plus: 0 }
}

export function bandForAge(ageDays: number): AgingBandKey {
  for (const b of AGING_BANDS) {
    if (ageDays <= b.maxDays) return b.key
  }
  return "d7_plus"
}

export type RiderAging = {
  rider_id: string
  outstanding_centavos: number
  order_count: number
  oldest_ms: number
  oldest_age_days: number
  buckets: AgingBuckets
}

export type RemittanceAging = {
  riders: RiderAging[]
  totals: AgingBuckets
  outstanding_centavos: number
}

/**
 * Per-rider unremitted cash bucketed by age, plus rolled-up totals. Riders are
 * sorted oldest-debt-first so the admin sees the worst offenders at the top.
 */
export function remittanceAging(
  collected: LedgerRowLite[],
  remitted: LedgerRowLite[],
  nowMs: number
): RemittanceAging {
  const remittedIds = remittedOrderIdSet(remitted)
  const byRider = new Map<string, RiderAging>()
  const totals = emptyBuckets()
  let outstanding = 0

  for (const t of collected) {
    if (!t.rider_id) continue
    if (t.order_id && remittedIds.has(t.order_id)) continue
    const ts = new Date(t.created_at).getTime()
    const band = bandForAge((nowMs - ts) / DAY_MS)
    const cur = byRider.get(t.rider_id) ?? {
      rider_id: t.rider_id,
      outstanding_centavos: 0,
      order_count: 0,
      oldest_ms: ts,
      oldest_age_days: 0,
      buckets: emptyBuckets(),
    }
    cur.outstanding_centavos += t.amount
    cur.order_count += 1
    cur.oldest_ms = Math.min(cur.oldest_ms, ts)
    cur.buckets[band] += t.amount
    byRider.set(t.rider_id, cur)
    totals[band] += t.amount
    outstanding += t.amount
  }

  const riders = [...byRider.values()].map((r) => ({
    ...r,
    oldest_age_days: (nowMs - r.oldest_ms) / DAY_MS,
  }))
  riders.sort((a, b) => a.oldest_ms - b.oldest_ms) // oldest (smallest ts) first
  return { riders, totals, outstanding_centavos: outstanding }
}

export type ShortfallRow = {
  order_id: string | null
  rider_id: string | null
  kind: "collection" | "remittance"
  expected_centavos: number
  actual_centavos: number
  shortfall_centavos: number
  created_at: string | Date
}

/**
 * Collections where the rider took LESS than the order total + fee
 * (`expected_amount`). Rows without a recorded benchmark are skipped.
 */
export function collectionShortfalls(
  collected: LedgerRowLite[]
): ShortfallRow[] {
  const out: ShortfallRow[] = []
  for (const t of collected) {
    const s = shortfall(t.expected_amount, t.amount)
    if (s <= 0) continue
    out.push({
      order_id: t.order_id,
      rider_id: t.rider_id,
      kind: "collection",
      expected_centavos: Number(t.expected_amount),
      actual_centavos: t.amount,
      shortfall_centavos: s,
      created_at: t.created_at,
    })
  }
  return out
}

/**
 * Remittances where the rider handed over LESS than they collected for that
 * order — the benchmark is the matching cod_collected row's amount, not the
 * remittance row's own `expected_amount`.
 */
export function remittanceShortfalls(
  collected: LedgerRowLite[],
  remitted: LedgerRowLite[]
): ShortfallRow[] {
  const collectedByOrder = new Map<string, number>()
  for (const t of collected) {
    if (t.order_id) collectedByOrder.set(t.order_id, t.amount)
  }
  const out: ShortfallRow[] = []
  for (const r of remitted) {
    if (!r.order_id) continue
    const collectedAmt = collectedByOrder.get(r.order_id)
    if (collectedAmt == null) continue
    const s = collectedAmt - r.amount
    if (s <= 0) continue
    out.push({
      order_id: r.order_id,
      rider_id: r.rider_id,
      kind: "remittance",
      expected_centavos: collectedAmt,
      actual_centavos: r.amount,
      shortfall_centavos: s,
      created_at: r.created_at,
    })
  }
  return out
}
