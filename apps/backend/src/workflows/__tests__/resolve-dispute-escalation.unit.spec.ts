import { applyBuyerFaultEscalation } from "../resolve-dispute"
import { WARNED_RECOVERY_WINDOW_MS } from "../../modules/accountability"

describe("applyBuyerFaultEscalation", () => {
  const now = new Date("2026-06-10T04:00:00.000Z")

  it("first strike → warned, with a 6-month recovery clock", () => {
    const r = applyBuyerFaultEscalation(0, now)
    expect(r.strike_count).toBe(1)
    expect(r.state).toBe("warned")
    expect(r.state_until).toBeNull()
    expect(r.recovery_eligible_at?.getTime()).toBe(
      now.getTime() + WARNED_RECOVERY_WINDOW_MS
    )
  })

  it("second strike → prepay_locked_30d with state_until, no recovery clock", () => {
    const r = applyBuyerFaultEscalation(1, now)
    expect(r.strike_count).toBe(2)
    expect(r.state).toBe("prepay_locked_30d")
    expect(r.state_until?.getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    )
    expect(r.recovery_eligible_at).toBeNull()
  })

  it("third strike → prepay_locked_permanent", () => {
    const r = applyBuyerFaultEscalation(2, now)
    expect(r.strike_count).toBe(3)
    expect(r.state).toBe("prepay_locked_permanent")
    expect(r.state_until).toBeNull()
    expect(r.recovery_eligible_at).toBeNull()
  })

  it("strikes beyond three stay permanent and keep counting", () => {
    const r = applyBuyerFaultEscalation(5, now)
    expect(r.strike_count).toBe(6)
    expect(r.state).toBe("prepay_locked_permanent")
  })
})
