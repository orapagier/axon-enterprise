import { evaluateAppealEligibility, canAppeal } from "../dispute-appeal"
import { DISPUTE_APPEAL_WINDOW_MS } from "../../modules/accountability"
import {
  stateForStrikeCount,
  reverseBuyerFaultStrike,
  applyBuyerFaultEscalation,
} from "../../workflows/resolve-dispute"

describe("evaluateAppealEligibility", () => {
  const now = new Date("2026-06-14T04:00:00.000Z")
  const ago = (ms: number) => new Date(now.getTime() - ms)

  it("allows an appeal of a fresh buyer_fault decision", () => {
    const r = evaluateAppealEligibility(
      { resolution: "buyer_fault", appeal_state: "none", resolved_at: ago(1000) },
      now
    )
    expect(r.ok).toBe(true)
    expect(canAppeal(
      { resolution: "buyer_fault", appeal_state: "none", resolved_at: ago(1000) },
      now
    )).toBe(true)
  })

  it("rejects non-buyer_fault resolutions", () => {
    const r = evaluateAppealEligibility(
      { resolution: "producer_fault", appeal_state: "none", resolved_at: ago(1000) },
      now
    )
    expect(r).toEqual({ ok: false, reason: "not_buyer_fault" })
  })

  it("rejects a dispute that was already appealed", () => {
    for (const appeal_state of ["requested", "upheld", "overturned"]) {
      const r = evaluateAppealEligibility(
        { resolution: "buyer_fault", appeal_state, resolved_at: ago(1000) },
        now
      )
      expect(r).toEqual({ ok: false, reason: "already_appealed" })
    }
  })

  it("rejects an appeal once the window has closed", () => {
    const r = evaluateAppealEligibility(
      {
        resolution: "buyer_fault",
        appeal_state: "none",
        resolved_at: ago(DISPUTE_APPEAL_WINDOW_MS + 1000),
      },
      now
    )
    expect(r).toEqual({ ok: false, reason: "window_passed" })
  })

  it("rejects when resolved_at is missing", () => {
    const r = evaluateAppealEligibility(
      { resolution: "buyer_fault", appeal_state: "none", resolved_at: null },
      now
    )
    expect(r).toEqual({ ok: false, reason: "window_passed" })
  })
})

describe("strike reversal mirrors escalation", () => {
  const now = new Date("2026-06-14T04:00:00.000Z")

  it("reversing a first strike returns the account to normal", () => {
    const r = reverseBuyerFaultStrike(1, now)
    expect(r.strike_count).toBe(0)
    expect(r.state).toBe("normal")
    expect(r.state_until).toBeNull()
    expect(r.recovery_eligible_at).toBeNull()
  })

  it("reversing the second strike drops a 30-day lock back to warned", () => {
    const r = reverseBuyerFaultStrike(2, now)
    expect(r.strike_count).toBe(1)
    expect(r.state).toBe("warned")
  })

  it("reversing a third strike drops a permanent lock to a 30-day lock", () => {
    const r = reverseBuyerFaultStrike(3, now)
    expect(r.strike_count).toBe(2)
    expect(r.state).toBe("prepay_locked_30d")
  })

  it("floors strike_count at zero", () => {
    const r = reverseBuyerFaultStrike(0, now)
    expect(r.strike_count).toBe(0)
    expect(r.state).toBe("normal")
  })

  it("escalate then reverse round-trips to the same state", () => {
    const escalated = applyBuyerFaultEscalation(1, now) // → 2 strikes, 30d lock
    const reversed = reverseBuyerFaultStrike(escalated.strike_count, now)
    expect(reversed.strike_count).toBe(1)
    expect(reversed.state).toBe(stateForStrikeCount(1, now).state)
  })
})
