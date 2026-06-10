import { GET } from "../route"
import { ACCOUNTABILITY_MODULE } from "../../../../modules/accountability"

/**
 * Unit-tests the /store/payment-methods eligibility logic after the walk-in OTC
 * reframe: OTC is never offered online, and a prepay-locked buyer has no online
 * method (checkout_blocked).
 */

type Json = Record<string, unknown>

function makeReq(actorId: string | null, statuses: { state: string }[]) {
  return {
    auth_context: actorId ? { actor_id: actorId } : undefined,
    scope: {
      resolve: (key: string) => {
        if (key === ACCOUNTABILITY_MODULE) {
          return { listBuyerAccountStatuses: async () => statuses }
        }
        return {}
      },
    },
  } as never
}

function makeRes() {
  const captured: { body?: Json } = {}
  const res = {
    json(body: Json) {
      captured.body = body
      return res
    },
  }
  return { res: res as never, captured }
}

describe("GET /store/payment-methods — walk-in OTC reframe", () => {
  it("never offers OTC as an online method", async () => {
    const { res, captured } = makeRes()
    await GET(makeReq("cus_1", []), res)
    const methods = (captured.body as { methods: { type: string }[] }).methods
    expect(methods.some((m) => m.type === "otc")).toBe(false)
  })

  it("a buyer in good standing gets COD and is not blocked", async () => {
    const { res, captured } = makeRes()
    await GET(makeReq("cus_1", []), res)
    const body = captured.body as {
      cod_available: boolean
      checkout_blocked: boolean
      methods: { type: string; available: boolean }[]
    }
    expect(body.cod_available).toBe(true)
    expect(body.checkout_blocked).toBe(false)
    expect(body.methods.find((m) => m.type === "cod")?.available).toBe(true)
  })

  it("a prepay-locked buyer is blocked from online checkout (no method)", async () => {
    const { res, captured } = makeRes()
    await GET(makeReq("cus_1", [{ state: "prepay_locked_permanent" }]), res)
    const body = captured.body as {
      cod_available: boolean
      checkout_blocked: boolean
      block_reason: string | null
      methods: { type: string; available: boolean }[]
    }
    expect(body.cod_available).toBe(false)
    expect(body.checkout_blocked).toBe(true)
    expect(body.block_reason).toMatch(/in person/i)
    expect(body.methods.find((m) => m.type === "cod")?.available).toBe(false)
    expect(body.methods.some((m) => m.type === "otc")).toBe(false)
  })

  it("a guest (no customer) gets COD and is not blocked", async () => {
    const { res, captured } = makeRes()
    await GET(makeReq(null, []), res)
    const body = captured.body as {
      cod_available: boolean
      checkout_blocked: boolean
    }
    expect(body.cod_available).toBe(true)
    expect(body.checkout_blocked).toBe(false)
  })
})
