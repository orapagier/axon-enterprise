import { resolveMembershipTransition } from "../membership-expiry-tick"

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 5, 10, 4, 0, 0)

describe("resolveMembershipTransition", () => {
  it("ignores non-active and expiry-less memberships", () => {
    expect(resolveMembershipTransition({}, NOW)).toEqual({ kind: "none" })
    expect(
      resolveMembershipTransition(
        { membership_status: "cancelled", membership_expires_at: NOW - 1 },
        NOW
      )
    ).toEqual({ kind: "none" })
    expect(
      resolveMembershipTransition({ membership_status: "active" }, NOW)
    ).toEqual({ kind: "none" })
  })

  it("expires an active membership past its date", () => {
    expect(
      resolveMembershipTransition(
        { membership_status: "active", membership_expires_at: NOW - 1 },
        NOW
      )
    ).toEqual({ kind: "expire" })
  })

  it("sends the 30-day reminder once", () => {
    const meta = {
      membership_status: "active",
      membership_expires_at: NOW + 20 * DAY_MS,
    }
    expect(resolveMembershipTransition(meta, NOW)).toEqual({
      kind: "remind",
      window: 30,
      days_left: 20,
    })
    expect(
      resolveMembershipTransition(
        { ...meta, membership_reminder_30_sent: NOW },
        NOW
      )
    ).toEqual({ kind: "none" })
  })

  it("sends the 7-day reminder even if the 30-day one was sent", () => {
    const meta = {
      membership_status: "active",
      membership_expires_at: NOW + 5 * DAY_MS,
      membership_reminder_30_sent: NOW - 20 * DAY_MS,
    }
    expect(resolveMembershipTransition(meta, NOW)).toEqual({
      kind: "remind",
      window: 7,
      days_left: 5,
    })
    expect(
      resolveMembershipTransition(
        { ...meta, membership_reminder_7_sent: NOW },
        NOW
      )
    ).toEqual({ kind: "none" })
  })

  it("a member far from expiry gets nothing", () => {
    expect(
      resolveMembershipTransition(
        {
          membership_status: "active",
          membership_expires_at: NOW + 200 * DAY_MS,
        },
        NOW
      )
    ).toEqual({ kind: "none" })
  })
})
