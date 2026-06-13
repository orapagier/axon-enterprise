import {
  parseHHMM,
  beforeCutoff,
  isMembershipActive,
  buildDeliveryTiers,
  feeForTier,
} from "../delivery-tiers"

describe("parseHHMM", () => {
  it("parses a normal HH:MM", () => {
    expect(parseHHMM("11:30")).toEqual({ hour: 11, minute: 30 })
  })
  it("defaults a missing minute to 0", () => {
    expect(parseHHMM("9")).toEqual({ hour: 9, minute: 0 })
  })
  it("coerces garbage to 0 rather than NaN", () => {
    expect(parseHHMM("oops")).toEqual({ hour: 0, minute: 0 })
  })
})

describe("beforeCutoff", () => {
  const cutoff = { hour: 11, minute: 0 }
  it("true an hour before", () => {
    expect(beforeCutoff({ hour: 10, minute: 0 }, cutoff)).toBe(true)
  })
  it("false an hour after", () => {
    expect(beforeCutoff({ hour: 12, minute: 0 }, cutoff)).toBe(false)
  })
  it("false exactly at the cutoff minute (strictly before)", () => {
    expect(beforeCutoff({ hour: 11, minute: 0 }, cutoff)).toBe(false)
  })
  it("true one minute before within the cutoff hour", () => {
    expect(beforeCutoff({ hour: 11, minute: 0 }, { hour: 11, minute: 1 })).toBe(
      true
    )
  })
})

describe("isMembershipActive", () => {
  const now = Date.UTC(2026, 5, 14)

  it("false for null/empty metadata", () => {
    expect(isMembershipActive(null, now)).toBe(false)
    expect(isMembershipActive({}, now)).toBe(false)
  })
  it("false when status is not active", () => {
    expect(
      isMembershipActive({ membership_status: "grace" }, now)
    ).toBe(false)
  })
  it("true when active with no expiry on record", () => {
    expect(isMembershipActive({ membership_status: "active" }, now)).toBe(true)
  })
  it("true when active and expiry is in the future", () => {
    expect(
      isMembershipActive(
        { membership_status: "active", membership_expires_at: now + 1000 },
        now
      )
    ).toBe(true)
  })
  it("false when active but already past expiry (job hasn't run yet)", () => {
    expect(
      isMembershipActive(
        { membership_status: "active", membership_expires_at: now - 1000 },
        now
      )
    ).toBe(false)
  })
  it("treats a zero/negative expiry as no-expiry", () => {
    expect(
      isMembershipActive(
        { membership_status: "active", membership_expires_at: 0 },
        now
      )
    ).toBe(true)
  })
})

describe("feeForTier", () => {
  it("free is always 0", () => {
    expect(feeForTier("free", 30, 80)).toBe(0)
  })
  it("standard / special pick the matching fee", () => {
    expect(feeForTier("standard", 30, 80)).toBe(30)
    expect(feeForTier("special", 30, 80)).toBe(80)
  })
})

describe("buildDeliveryTiers", () => {
  const base = {
    standardFeePhp: 30,
    specialFeePhp: 80,
    dispatchLabel: "2:00 PM",
    cutoffLabel: "11:00",
  }

  it("free is available + ₱0 before cutoff, with a today ETA", () => {
    const [free] = buildDeliveryTiers({
      ...base,
      isMember: false,
      isBeforeCutoff: true,
    })
    expect(free.tier).toBe("free")
    expect(free.available).toBe(true)
    expect(free.fee_php).toBe(0)
    expect(free.eta_label).toContain("Today")
    expect(free.reason_if_unavailable).toBeNull()
  })

  it("free is unavailable after cutoff with a reason + tomorrow ETA", () => {
    const [free] = buildDeliveryTiers({
      ...base,
      isMember: true,
      isBeforeCutoff: false,
    })
    expect(free.available).toBe(false)
    expect(free.eta_label).toContain("Tomorrow")
    expect(free.reason_if_unavailable).toContain("11:00")
  })

  it("standard is always available at the standard fee", () => {
    const std = buildDeliveryTiers({
      ...base,
      isMember: false,
      isBeforeCutoff: false,
    })[1]
    expect(std.tier).toBe("standard")
    expect(std.available).toBe(true)
    expect(std.fee_php).toBe(30)
  })

  it("special is gated on membership", () => {
    const member = buildDeliveryTiers({
      ...base,
      isMember: true,
      isBeforeCutoff: true,
    })[2]
    expect(member.available).toBe(true)
    expect(member.reason_if_unavailable).toBeNull()
    expect(member.fee_php).toBe(80)

    const nonMember = buildDeliveryTiers({
      ...base,
      isMember: false,
      isBeforeCutoff: true,
    })[2]
    expect(nonMember.available).toBe(false)
    expect(nonMember.reason_if_unavailable).toContain("Hub Members only")
  })

  it("always returns exactly the three tiers in order", () => {
    const tiers = buildDeliveryTiers({
      ...base,
      isMember: false,
      isBeforeCutoff: true,
    })
    expect(tiers.map((t) => t.tier)).toEqual(["free", "standard", "special"])
  })
})
