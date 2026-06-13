import {
  shortfall,
  unremittedByRider,
  bandForAge,
  remittanceAging,
  collectionShortfalls,
  remittanceShortfalls,
  DAY_MS,
  type LedgerRowLite,
} from "../cod-aging"

const NOW = Date.UTC(2026, 5, 14, 0, 0, 0)
const daysAgo = (d: number) => new Date(NOW - d * DAY_MS).toISOString()

function collected(
  partial: Partial<LedgerRowLite> & { order_id: string; amount: number }
): LedgerRowLite {
  return {
    rider_id: "rider_1",
    expected_amount: partial.amount,
    created_at: daysAgo(0),
    type: "cod_collected",
    ...partial,
  }
}

function remitted(orderId: string, amount: number, riderId = "rider_1"): LedgerRowLite {
  return {
    order_id: orderId,
    rider_id: riderId,
    amount,
    expected_amount: amount,
    created_at: daysAgo(0),
    type: "rider_remitted",
  }
}

describe("shortfall", () => {
  it("is the positive gap of expected over actual", () => {
    expect(shortfall(1000, 600)).toBe(400)
  })
  it("is 0 when actual meets or beats expected", () => {
    expect(shortfall(1000, 1000)).toBe(0)
    expect(shortfall(1000, 1200)).toBe(0)
  })
  it("treats a missing/zero benchmark as no shortfall", () => {
    expect(shortfall(null, 600)).toBe(0)
    expect(shortfall(undefined, 600)).toBe(0)
    expect(shortfall(0, 600)).toBe(0)
  })
})

describe("unremittedByRider", () => {
  it("excludes orders that already have a remittance", () => {
    const c = [
      collected({ order_id: "o1", amount: 1000 }),
      collected({ order_id: "o2", amount: 2000 }),
    ]
    const r = [remitted("o1", 1000)]
    const out = unremittedByRider(c, r)
    expect(out).toHaveLength(1)
    expect(out[0].rider_id).toBe("rider_1")
    expect(out[0].outstanding_centavos).toBe(2000)
    expect(out[0].order_count).toBe(1)
  })

  it("sums per rider and tracks the oldest collection", () => {
    const c = [
      collected({ order_id: "o1", amount: 1000, created_at: daysAgo(5) }),
      collected({ order_id: "o2", amount: 500, created_at: daysAgo(1) }),
      collected({ order_id: "o3", amount: 300, rider_id: "rider_2" }),
    ]
    const out = unremittedByRider(c, [])
    const r1 = out.find((r) => r.rider_id === "rider_1")!
    expect(r1.outstanding_centavos).toBe(1500)
    expect(r1.oldest_ms).toBe(NOW - 5 * DAY_MS)
    expect(out.find((r) => r.rider_id === "rider_2")!.outstanding_centavos).toBe(
      300
    )
  })

  it("ignores collections with no rider", () => {
    const out = unremittedByRider(
      [collected({ order_id: "o1", amount: 1000, rider_id: null })],
      []
    )
    expect(out).toHaveLength(0)
  })
})

describe("bandForAge", () => {
  it("buckets by age in days (inclusive upper edge)", () => {
    expect(bandForAge(0.5)).toBe("d0_1")
    expect(bandForAge(1)).toBe("d0_1")
    expect(bandForAge(2)).toBe("d1_3")
    expect(bandForAge(3)).toBe("d1_3")
    expect(bandForAge(5)).toBe("d3_7")
    expect(bandForAge(7)).toBe("d3_7")
    expect(bandForAge(8)).toBe("d7_plus")
    expect(bandForAge(100)).toBe("d7_plus")
  })
})

describe("remittanceAging", () => {
  it("buckets unremitted cash per rider and rolls up totals", () => {
    const c = [
      collected({ order_id: "o1", amount: 1000, created_at: daysAgo(0.5) }),
      collected({ order_id: "o2", amount: 2000, created_at: daysAgo(5) }),
      collected({
        order_id: "o3",
        amount: 4000,
        created_at: daysAgo(10),
        rider_id: "rider_2",
      }),
      // settled — must be excluded
      collected({ order_id: "o4", amount: 9999, created_at: daysAgo(20) }),
    ]
    const r = [remitted("o4", 9999)]
    const { riders, totals, outstanding_centavos } = remittanceAging(c, r, NOW)

    expect(outstanding_centavos).toBe(7000)
    expect(totals.d0_1).toBe(1000)
    expect(totals.d3_7).toBe(2000)
    expect(totals.d7_plus).toBe(4000)

    // oldest debt (rider_2 @10d) sorts first
    expect(riders[0].rider_id).toBe("rider_2")
    expect(riders[0].oldest_age_days).toBeCloseTo(10, 5)
    const r1 = riders.find((x) => x.rider_id === "rider_1")!
    expect(r1.buckets.d0_1).toBe(1000)
    expect(r1.buckets.d3_7).toBe(2000)
    expect(r1.outstanding_centavos).toBe(3000)
  })
})

describe("collectionShortfalls", () => {
  it("flags rows where the rider took less than expected", () => {
    const c = [
      collected({ order_id: "o1", amount: 600, expected_amount: 1000 }),
      collected({ order_id: "o2", amount: 1000, expected_amount: 1000 }),
      collected({ order_id: "o3", amount: 500, expected_amount: null }),
    ]
    const out = collectionShortfalls(c)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      order_id: "o1",
      kind: "collection",
      expected_centavos: 1000,
      actual_centavos: 600,
      shortfall_centavos: 400,
    })
  })
})

describe("remittanceShortfalls", () => {
  it("flags remittances below the collected amount", () => {
    const c = [
      collected({ order_id: "o1", amount: 1000 }),
      collected({ order_id: "o2", amount: 2000 }),
    ]
    const r = [
      remitted("o1", 700), // short by 300
      remitted("o2", 2000), // exact
    ]
    const out = remittanceShortfalls(c, r)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      order_id: "o1",
      kind: "remittance",
      expected_centavos: 1000,
      actual_centavos: 700,
      shortfall_centavos: 300,
    })
  })

  it("ignores remittances with no matching collection", () => {
    expect(remittanceShortfalls([], [remitted("ghost", 500)])).toHaveLength(0)
  })
})
