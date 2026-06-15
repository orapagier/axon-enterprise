import {
  initConfirmEntry,
  confirmDeadlineMs,
  classifyConfirmEntry,
  markNudged,
  markEscalated,
  applyProducerConfirm,
  applyProducerDecline,
  applyAdminTake,
  applyCancel,
  isTerminal,
  isLive,
  CONFIRM_DEADLINE_MS,
  ADMIN_WINDOW_MS,
  NUDGE_INTERVAL_MS,
  type ProducerConfirmEntry,
} from "../producer-confirm"

const T0 = 1_000_000_000_000 // arbitrary epoch

describe("confirmDeadlineMs", () => {
  it("standard + free are 1 hour, special is 10 minutes", () => {
    expect(confirmDeadlineMs("standard")).toBe(60 * 60_000)
    expect(confirmDeadlineMs("free")).toBe(60 * 60_000)
    expect(confirmDeadlineMs("special")).toBe(10 * 60_000)
  })
})

describe("initConfirmEntry", () => {
  it("starts awaiting with a tier-based deadline + first nudge stamped", () => {
    const e = initConfirmEntry("standard", T0)
    expect(e.status).toBe("awaiting")
    expect(e.deadline_at).toBe(T0 + CONFIRM_DEADLINE_MS.standard)
    expect(e.last_nudge_at).toBe(T0)
    expect(e.nudge_count).toBe(1)
  })
})

describe("classifyConfirmEntry", () => {
  it("does nothing right after placement", () => {
    const e = initConfirmEntry("standard", T0)
    expect(classifyConfirmEntry(e, T0 + 60_000)).toBe("none")
  })

  it("nudges once a nudge interval has passed", () => {
    const e = initConfirmEntry("standard", T0)
    expect(classifyConfirmEntry(e, T0 + NUDGE_INTERVAL_MS)).toBe("nudge")
  })

  it("escalates at the deadline", () => {
    const e = initConfirmEntry("special", T0)
    expect(classifyConfirmEntry(e, T0 + CONFIRM_DEADLINE_MS.special)).toBe(
      "escalate"
    )
  })

  it("escalation dominates an overdue nudge", () => {
    // Past the deadline AND past a nudge interval → escalate, not nudge.
    const e = initConfirmEntry("special", T0)
    expect(classifyConfirmEntry(e, T0 + 60 * 60_000)).toBe("escalate")
  })

  it("auto-cancels when the admin window lapses", () => {
    let e = initConfirmEntry("standard", T0)
    e = markEscalated(e, T0 + CONFIRM_DEADLINE_MS.standard)
    const adminDeadline = e.admin_deadline_at!
    expect(classifyConfirmEntry(e, adminDeadline - 1)).toBe("none")
    expect(classifyConfirmEntry(e, adminDeadline)).toBe("auto_cancel")
  })

  it("terminal entries are inert", () => {
    const e: ProducerConfirmEntry = {
      ...initConfirmEntry("standard", T0),
      status: "confirmed",
    }
    expect(classifyConfirmEntry(e, T0 + 10 * 60 * 60_000)).toBe("none")
  })
})

describe("markNudged / markEscalated", () => {
  it("markNudged advances the timer + count", () => {
    const e = markNudged(initConfirmEntry("standard", T0), T0 + NUDGE_INTERVAL_MS)
    expect(e.last_nudge_at).toBe(T0 + NUDGE_INTERVAL_MS)
    expect(e.nudge_count).toBe(2)
  })

  it("markEscalated sets the admin window", () => {
    const at = T0 + CONFIRM_DEADLINE_MS.standard
    const e = markEscalated(initConfirmEntry("standard", T0), at)
    expect(e.status).toBe("escalated")
    expect(e.escalated_at).toBe(at)
    expect(e.admin_deadline_at).toBe(at + ADMIN_WINDOW_MS)
  })
})

describe("applyProducerConfirm", () => {
  it("on-time confirm earns no strike", () => {
    const e = initConfirmEntry("standard", T0)
    const r = applyProducerConfirm(e, T0 + 5 * 60_000)
    expect(r.entry.status).toBe("confirmed")
    expect(r.entry.late).toBe(false)
    expect(r.strike).toBe(false)
  })

  it("confirming past the deadline is late + earns a strike", () => {
    const e = initConfirmEntry("special", T0)
    const r = applyProducerConfirm(e, T0 + 20 * 60_000)
    expect(r.entry.late).toBe(true)
    expect(r.strike).toBe(true)
  })

  it("grabbing during the admin window is late + earns a strike", () => {
    let e = initConfirmEntry("standard", T0)
    e = markEscalated(e, T0 + CONFIRM_DEADLINE_MS.standard)
    const r = applyProducerConfirm(e, e.admin_deadline_at! - 60_000)
    expect(r.entry.status).toBe("confirmed")
    expect(r.entry.late).toBe(true)
    expect(r.strike).toBe(true)
  })

  it("never double-charges a strike that's already recorded", () => {
    let e = initConfirmEntry("standard", T0)
    e = { ...markEscalated(e, T0 + CONFIRM_DEADLINE_MS.standard), strike_recorded: true }
    const r = applyProducerConfirm(e, e.admin_deadline_at! - 1)
    expect(r.strike).toBe(false)
  })
})

describe("decline / take / cancel always strike (once)", () => {
  it("decline", () => {
    const r = applyProducerDecline(initConfirmEntry("standard", T0), T0 + 60_000)
    expect(r.entry.status).toBe("declined")
    expect(r.strike).toBe(true)
  })
  it("admin take", () => {
    const r = applyAdminTake(initConfirmEntry("standard", T0), T0 + 60_000)
    expect(r.entry.status).toBe("hub_taken")
    expect(r.strike).toBe(true)
  })
  it("cancel", () => {
    const r = applyCancel(initConfirmEntry("standard", T0), T0 + 60_000)
    expect(r.entry.status).toBe("cancelled")
    expect(r.strike).toBe(true)
  })
})

describe("isTerminal / isLive", () => {
  it("classifies statuses", () => {
    expect(isLive("awaiting")).toBe(true)
    expect(isLive("escalated")).toBe(true)
    expect(isTerminal("confirmed")).toBe(true)
    expect(isTerminal("cancelled")).toBe(true)
    expect(isTerminal("awaiting")).toBe(false)
  })
})
