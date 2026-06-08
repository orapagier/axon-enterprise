import {
  validateSlotReserve,
  validateSlotCapacity,
} from "../validators"

describe("validateSlotCapacity", () => {
  it("rejects a non-positive estimate", () => {
    const res = validateSlotCapacity(0, 0, 100)
    expect(res.ok).toBe(false)
    expect(res.errors[0].code).toBe("ESTIMATED_KG_INVALID")
  })

  it("rejects when the reservation would exceed capacity", () => {
    // 80 already reserved + 30 more > 100 capacity.
    const res = validateSlotCapacity(80, 30, 100)
    expect(res.ok).toBe(false)
    expect(res.errors[0].code).toBe("CAPACITY_EXCEEDED")
  })

  it("allows a reservation that exactly fills the window", () => {
    const res = validateSlotCapacity(80, 20, 100)
    expect(res.ok).toBe(true)
  })

  it("treats null capacity as unlimited", () => {
    const res = validateSlotCapacity(10_000, 5_000, null)
    expect(res.ok).toBe(true)
  })
})

describe("validateSlotReserve", () => {
  const base = {
    windowStatus: "open" as const,
    windowDate: "2026-06-10",
    harvestDate: "2026-06-10",
    reserved_kg: 0,
    estimated_kg: 50,
    capacity_kg: 100,
  }

  it("accepts a valid reservation", () => {
    expect(validateSlotReserve(base).ok).toBe(true)
  })

  it("rejects a window that is not open", () => {
    const res = validateSlotReserve({ ...base, windowStatus: "full" })
    expect(res.ok).toBe(false)
    expect(res.errors.map((e) => e.code)).toContain("WINDOW_NOT_OPEN")
  })

  it("rejects a harvest date that doesn't match the window date", () => {
    const res = validateSlotReserve({ ...base, harvestDate: "2026-06-11" })
    expect(res.ok).toBe(false)
    expect(res.errors.map((e) => e.code)).toContain("HARVEST_DATE_MISMATCH")
  })

  it("rejects an overcommit (the race the per-window lock guards)", () => {
    const res = validateSlotReserve({
      ...base,
      reserved_kg: 90,
      estimated_kg: 20,
    })
    expect(res.ok).toBe(false)
    expect(res.errors.map((e) => e.code)).toContain("CAPACITY_EXCEEDED")
  })
})
