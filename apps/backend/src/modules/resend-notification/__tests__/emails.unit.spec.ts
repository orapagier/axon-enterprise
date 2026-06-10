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

  it("order-placed totals include the cash delivery fee", () => {
    const email = buildEmail("order-placed", {
      display_id: 7,
      total_php: 100,
      delivery_fee_php: 30,
      delivery_tier: "standard",
    })!
    expect(email.subject).toContain("#7")
    // buyer is told to prepare total + fee in cash
    expect(email.html).toContain("130.00")
  })

  it("dispute-resolved explains a buyer_fault strike", () => {
    const email = buildEmail("dispute-resolved", {
      display_id: 3,
      resolution: "buyer_fault",
    })!
    expect(email.html).toContain("strike")
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
