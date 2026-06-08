import CodPaymentProviderService from "../service"
import { ACCOUNTABILITY_MODULE } from "../../accountability"

type StatusRow = { state: string }

/**
 * Build the provider without running the AbstractPaymentProvider constructor,
 * so we can unit-test the prepay-lock gating in `authorizePayment` in isolation
 * (no DI container, no payment framework wiring).
 */
function makeService(statuses: StatusRow[]): CodPaymentProviderService {
  const svc = Object.create(
    CodPaymentProviderService.prototype
  ) as CodPaymentProviderService & { container_: unknown; logger_: unknown }
  svc.logger_ = console
  svc.container_ = {
    logger: console,
    [ACCOUNTABILITY_MODULE]: {
      listBuyerAccountStatuses: async () => statuses,
    },
  }
  return svc
}

const input = { data: { customer_id: "cus_1", id: "cod_1" } } as never

describe("CodPaymentProviderService.authorizePayment — prepay-lock gating", () => {
  it("blocks COD for a permanently prepay-locked buyer", async () => {
    const svc = makeService([{ state: "prepay_locked_permanent" }])
    await expect(svc.authorizePayment(input)).rejects.toThrow(/permanent/i)
  })

  it("blocks COD for a buyer in the 30-day prepay window", async () => {
    const svc = makeService([{ state: "prepay_locked_30d" }])
    await expect(svc.authorizePayment(input)).rejects.toThrow(/30-day/i)
  })

  it("authorizes a buyer in good standing", async () => {
    const svc = makeService([])
    const res = await svc.authorizePayment(input)
    expect(res.status).toBe("authorized")
  })

  it("authorizes when there's no customer id to check", async () => {
    const svc = makeService([{ state: "prepay_locked_permanent" }])
    // No customer id → the accountability check is skipped entirely.
    const res = await svc.authorizePayment({ data: {} } as never)
    expect(res.status).toBe("authorized")
  })
})
