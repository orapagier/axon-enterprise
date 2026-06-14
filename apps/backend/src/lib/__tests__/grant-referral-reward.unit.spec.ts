import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../../modules/referral"

// Capture the promotion workflow input so we can assert on the credit amount.
// (Variable must be `mock`-prefixed to satisfy jest.mock hoisting.)
let mockPromoInput: { promotionsData: Array<Record<string, any>> } | null = null

jest.mock("@medusajs/core-flows", () => ({
  createPromotionsWorkflow: jest.fn(() => ({
    run: jest.fn(async ({ input }: any) => {
      mockPromoInput = input
      return { result: [{ id: "promo_1", code: input.promotionsData[0].code }] }
    }),
  })),
}))

jest.mock("../notify", () => ({ sendEmail: jest.fn(async () => {}) }))

import { grantReferralReward } from "../grant-referral-reward"
import { REFERRAL_BONUS_PHP, REFERRAL_BONUS_CENTAVOS } from "../referral"

const REFEREE = "cus_referee"
const REFERRER = "cus_referrer"

function makeContainer(opts: {
  existingReferrals?: any[]
  resolvedReferrerId?: string | null
  referrerExists?: boolean
}) {
  const referralService = {
    listReferrals: jest.fn(async () => opts.existingReferrals ?? []),
    resolveReferrerByCode: jest.fn(
      async () => opts.resolvedReferrerId ?? null
    ),
    createReferrals: jest.fn(async (data: any) => ({ id: "ref_1", ...data })),
    updateReferrals: jest.fn(async () => ({})),
  }
  const customerModule = {
    retrieveCustomer: jest.fn(async (id: string) => {
      if (opts.referrerExists === false) throw new Error("not found")
      return { id, email: "referrer@example.com" }
    }),
    listCustomerGroups: jest.fn(async () => []),
    createCustomerGroups: jest.fn(async () => ({ id: "grp_1" })),
    addCustomerToGroup: jest.fn(async () => ({})),
  }
  const regionModule = {
    listRegions: jest.fn(async () => [{ currency_code: "php" }]),
  }
  const logger = { info: jest.fn(), warn: jest.fn() }

  const container = {
    resolve: (key: string) => {
      if (key === REFERRAL_MODULE) return referralService
      if (key === Modules.CUSTOMER) return customerModule
      if (key === Modules.REGION) return regionModule
      if (key === ContainerRegistrationKeys.LOGGER) return logger
      throw new Error(`unexpected resolve(${key})`)
    },
  }
  return { container, referralService, customerModule }
}

const meta = (code?: string) =>
  code ? { referred_by_code: code } : {}

describe("grantReferralReward", () => {
  beforeEach(() => {
    mockPromoInput = null
  })

  it("no-ops when the referee has no referral code", async () => {
    const { container, referralService } = makeContainer({})
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "r@e.com",
      refereeMetadata: meta(),
    })
    expect(out).toEqual({ granted: false, reason: "no_referral_code" })
    expect(referralService.createReferrals).not.toHaveBeenCalled()
  })

  it("no-ops when this referee was already recorded (one bonus per person)", async () => {
    const { container } = makeContainer({
      existingReferrals: [{ id: "ref_old" }],
      resolvedReferrerId: REFERRER,
    })
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "r@e.com",
      refereeMetadata: meta("ABC1234"),
    })
    expect(out).toEqual({ granted: false, reason: "already_recorded" })
  })

  it("no-ops on an unknown code", async () => {
    const { container } = makeContainer({ resolvedReferrerId: null })
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "r@e.com",
      refereeMetadata: meta("NOPE999"),
    })
    expect(out).toEqual({ granted: false, reason: "unknown_code" })
  })

  it("blocks self-referral", async () => {
    const { container } = makeContainer({ resolvedReferrerId: REFEREE })
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "r@e.com",
      refereeMetadata: meta("SELF123"),
    })
    expect(out).toEqual({ granted: false, reason: "self_referral" })
  })

  it("no-ops when the referrer no longer exists", async () => {
    const { container } = makeContainer({
      resolvedReferrerId: REFERRER,
      referrerExists: false,
    })
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "r@e.com",
      refereeMetadata: meta("GONE123"),
    })
    expect(out).toEqual({ granted: false, reason: "referrer_missing" })
  })

  it("grants a ₱50 single-use, group-scoped credit on the happy path", async () => {
    const { container, referralService, customerModule } = makeContainer({
      resolvedReferrerId: REFERRER,
    })
    const out = await grantReferralReward(container as any, {
      refereeId: REFEREE,
      refereeEmail: "newbie@example.com",
      refereeMetadata: meta("GOOD123"),
    })

    expect(out.granted).toBe(true)
    if (out.granted) {
      expect(out.referrerId).toBe(REFERRER)
      expect(out.promoCode).toMatch(/^RC-/)
    }

    // Row written first as pending, then upgraded to rewarded.
    expect(referralService.createReferrals).toHaveBeenCalledWith(
      expect.objectContaining({
        referrer_customer_id: REFERRER,
        referee_customer_id: REFEREE,
        status: "pending",
        reward_amount_centavos: REFERRAL_BONUS_CENTAVOS,
      })
    )
    expect(referralService.updateReferrals).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rewarded" })
    )

    // Referrer added to a per-referrer credit group.
    expect(customerModule.addCustomerToGroup).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: REFERRER })
    )

    // Promotion: ₱50 fixed off the whole order, single-use, scoped by group.
    const promo = mockPromoInput!.promotionsData[0]
    expect(promo.limit).toBe(1)
    expect(promo.application_method).toMatchObject({
      type: "fixed",
      target_type: "order",
      value: REFERRAL_BONUS_PHP,
      currency_code: "php",
    })
    expect(promo.rules[0]).toMatchObject({
      attribute: "customer.groups.id",
      operator: "in",
    })
  })
})

describe("referral bonus economics", () => {
  it("is 10% of the ₱500 fee = ₱50 / 5000 centavos", () => {
    expect(REFERRAL_BONUS_PHP).toBe(50)
    expect(REFERRAL_BONUS_CENTAVOS).toBe(5000)
  })
})
