import { buildEmail, EMAIL_TEMPLATE_NAMES } from "../emails"

describe("buildEmail", () => {
  it("returns null for unknown templates", () => {
    expect(buildEmail("no-such-template", {})).toBeNull()
  })

  it("every registered template renders a subject and html", () => {
    for (const name of EMAIL_TEMPLATE_NAMES) {
      const email = buildEmail(name, {
        display_id: 7,
        total_php: 130,
        delivery_fee_php: 30,
        delivery_tier: "standard",
        collected_php: 130,
        resolution: "buyer_fault",
        tier: "harvest-01",
        expires_at_ms: Date.UTC(2027, 5, 10),
        days_left: 7,
        discount_percent: 10,
        min_order_note: "min. 20 kg per order",
      })
      expect(email).not.toBeNull()
      expect(email!.subject.length).toBeGreaterThan(0)
      expect(email!.html).toContain("Mindanao Fresh Hub")
    }
  })

  it("order-placed shows the order total, which already includes the delivery fee", () => {
    const email = buildEmail("order-placed", {
      // total_php is the full order total — the delivery fee is now a real
      // shipping line inside it, not added on top.
      display_id: 7,
      total_php: 130,
      delivery_fee_php: 30,
      delivery_tier: "standard",
    })!
    expect(email.subject).toContain("#7")
    // buyer is told to prepare the order total in cash (fee is inside it)
    expect(email.html).toContain("130.00")
  })

  it("dispute-resolved explains a buyer_fault strike", () => {
    const email = buildEmail("dispute-resolved", {
      display_id: 3,
      resolution: "buyer_fault",
    })!
    expect(email.html).toContain("strike")
  })

  it("dispute-appeal-resolved wording flips on the decision", () => {
    const granted = buildEmail("dispute-appeal-resolved", {
      display_id: 9,
      decision: "overturn",
    })!
    expect(granted.subject).toContain("granted")
    expect(granted.html).toContain("removed")

    const denied = buildEmail("dispute-appeal-resolved", {
      display_id: 9,
      decision: "uphold",
    })!
    expect(denied.subject).toContain("not granted")
    expect(denied.html).toContain("remains")
  })

  it("trader-approved includes the discount and minimum-order note", () => {
    const email = buildEmail("trader-approved", {
      discount_percent: 12,
      min_order_note: "min. 20 kg per order",
    })!
    expect(email.subject).toContain("12%")
    expect(email.html).toContain("min. 20 kg per order")
  })

  it("membership-expiring pluralizes days and includes the date", () => {
    const one = buildEmail("membership-expiring", {
      days_left: 1,
      expires_at_ms: Date.UTC(2026, 6, 1),
    })!
    expect(one.subject).toContain("1 day")
    expect(one.subject).not.toContain("1 days")
    const seven = buildEmail("membership-expiring", {
      days_left: 7,
      expires_at_ms: Date.UTC(2026, 6, 1),
    })!
    expect(seven.subject).toContain("7 days")
    expect(seven.html).toContain("July")
  })
})
