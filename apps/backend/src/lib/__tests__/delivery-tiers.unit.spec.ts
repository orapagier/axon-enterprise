import {
  parseHHMM,
  beforeCutoff,
  isWithinDeliveryHours,
  formatDeliveryHours,
  resolveDeliveryWindow,
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

describe("isWithinDeliveryHours", () => {
  it("open exactly at 6:00 (inclusive)", () => {
    expect(isWithinDeliveryHours({ hour: 6, minute: 0 })).toBe(true)
  })
  it("open mid-day", () => {
    expect(isWithinDeliveryHours({ hour: 12, minute: 30 })).toBe(true)
  })
  it("open at the last minute before close", () => {
    expect(isWithinDeliveryHours({ hour: 17, minute: 59 })).toBe(true)
  })
  it("closed exactly at 18:00 (exclusive)", () => {
    expect(isWithinDeliveryHours({ hour: 18, minute: 0 })).toBe(false)
  })
  it("closed before open", () => {
    expect(isWithinDeliveryHours({ hour: 5, minute: 59 })).toBe(false)
  })
  it("closed late at night", () => {
    expect(isWithinDeliveryHours({ hour: 22, minute: 0 })).toBe(false)
  })
  it("honors a custom (per-hub) window", () => {
    const open = { hour: 8, minute: 30 }
    const close = { hour: 17, minute: 0 }
    expect(isWithinDeliveryHours({ hour: 8, minute: 0 }, open, close)).toBe(false)
    expect(isWithinDeliveryHours({ hour: 8, minute: 30 }, open, close)).toBe(true)
    expect(isWithinDeliveryHours({ hour: 17, minute: 0 }, open, close)).toBe(false)
  })
})

describe("formatDeliveryHours", () => {
  it("renders the default 6am–6pm window", () => {
    expect(
      formatDeliveryHours({ hour: 6, minute: 0 }, { hour: 18, minute: 0 })
    ).toBe("6:00 AM–6:00 PM")
  })
  it("renders noon and midnight correctly", () => {
    expect(
      formatDeliveryHours({ hour: 0, minute: 0 }, { hour: 12, minute: 30 })
    ).toBe("12:00 AM–12:30 PM")
  })
})

describe("resolveDeliveryWindow", () => {
  it("parses configured strings and builds a label", () => {
    const w = resolveDeliveryWindow("08:00", "20:00")
    expect(w.open).toEqual({ hour: 8, minute: 0 })
    expect(w.close).toEqual({ hour: 20, minute: 0 })
    expect(w.label).toBe("8:00 AM–8:00 PM")
  })
  it("falls back to the platform default when blank/missing", () => {
    const w = resolveDeliveryWindow(null, undefined)
    expect(w.open).toEqual({ hour: 6, minute: 0 })
    expect(w.close).toEqual({ hour: 18, minute: 0 })
    expect(w.label).toBe("6:00 AM–6:00 PM")
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
    isOpen: true,
    hoursLabel: "6:00 AM–6:00 PM",
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

  it("outside operating hours, Standard stays orderable for the next window", () => {
    const [free, standard, special] = buildDeliveryTiers({
      ...base,
      isMember: true,
      isBeforeCutoff: true,
      isOpen: false,
      hoursLabel: "8:00 AM–8:00 PM",
    })
    // Standard always lets the buyer through; ETA points at the next window.
    expect(standard.available).toBe(true)
    expect(standard.eta_label).toContain("8:00 AM–8:00 PM")
    // Free still follows the cutoff rule, not the open/closed gate.
    expect(free.available).toBe(true)
    // Special (the ~1h lane) is the only tier closed outside hours, even for
    // a member.
    expect(special.available).toBe(false)
    expect(special.reason_if_unavailable).toContain("8:00 AM–8:00 PM")
  })

  it("special is closed outside hours even for a member", () => {
    const special = buildDeliveryTiers({
      ...base,
      isMember: true,
      isBeforeCutoff: true,
      isOpen: false,
    })[2]
    expect(special.available).toBe(false)
  })
})
