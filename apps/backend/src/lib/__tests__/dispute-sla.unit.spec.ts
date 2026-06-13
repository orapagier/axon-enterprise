import { classifyDisputeForSla } from "../dispute-sla"
import {
  DISPUTE_REMINDER_AFTER_MS,
  DISPUTE_RESPONSE_SLA_MS,
} from "../../modules/accountability"

describe("classifyDisputeForSla", () => {
  const now = new Date("2026-06-14T04:00:00.000Z")
  const ago = (ms: number) => new Date(now.getTime() - ms)

  const base = {
    resolution: "pending",
    created_at: ago(1000),
    buyer_responded_at: null,
    buyer_reminder_sent_at: null,
    escalated_at: null,
  }

  it("does nothing for a fresh dispute", () => {
    expect(classifyDisputeForSla(base, now)).toBe("none")
  })

  it("does nothing once resolved", () => {
    expect(
      classifyDisputeForSla(
        { ...base, resolution: "buyer_fault", created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1) },
        now
      )
    ).toBe("none")
  })

  it("reminds a silent buyer after 24h", () => {
    expect(
      classifyDisputeForSla(
        { ...base, created_at: ago(DISPUTE_REMINDER_AFTER_MS + 1000) },
        now
      )
    ).toBe("remind_buyer")
  })

  it("does not remind twice", () => {
    expect(
      classifyDisputeForSla(
        {
          ...base,
          created_at: ago(DISPUTE_REMINDER_AFTER_MS + 1000),
          buyer_reminder_sent_at: ago(1000),
        },
        now
      )
    ).toBe("none")
  })

  it("does not remind a buyer who already responded", () => {
    expect(
      classifyDisputeForSla(
        {
          ...base,
          created_at: ago(DISPUTE_REMINDER_AFTER_MS + 1000),
          buyer_responded_at: ago(500),
        },
        now
      )
    ).toBe("none")
  })

  it("escalates an unanswered dispute past the SLA (no auto-strike by default)", () => {
    expect(
      classifyDisputeForSla(
        { ...base, created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1000) },
        now
      )
    ).toBe("escalate")
  })

  it("escalates even when the buyer responded — a human still decides", () => {
    expect(
      classifyDisputeForSla(
        {
          ...base,
          created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1000),
          buyer_responded_at: ago(1000),
        },
        now
      )
    ).toBe("escalate")
  })

  it("does not re-escalate a dispute already flagged", () => {
    expect(
      classifyDisputeForSla(
        {
          ...base,
          created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1000),
          escalated_at: ago(500),
        },
        now
      )
    ).toBe("none")
  })

  it("auto-resolves a silent buyer past the SLA when the flag is on", () => {
    expect(
      classifyDisputeForSla(
        { ...base, created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1000) },
        now,
        { autoResolve: true }
      )
    ).toBe("auto_resolve_buyer_fault")
  })

  it("does NOT auto-resolve if the buyer responded, even with the flag on", () => {
    expect(
      classifyDisputeForSla(
        {
          ...base,
          created_at: ago(DISPUTE_RESPONSE_SLA_MS + 1000),
          buyer_responded_at: ago(1000),
        },
        now,
        { autoResolve: true }
      )
    ).toBe("escalate")
  })
})
