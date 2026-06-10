import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Unit-tests the order-placed dispatch guard: a walk-in OTC counter sale
 * (metadata.sale_channel === "otc_counter") must NOT be assigned to a rider
 * dispatch batch; a normal order must.
 */

jest.mock("../../workflows/assign-order-to-dispatch", () => ({
  __esModule: true,
  default: jest.fn(() => ({ run: jest.fn().mockResolvedValue({}) })),
}))

import orderPlacedHandler from "../order-placed"
import assignOrderToDispatchWorkflow from "../../workflows/assign-order-to-dispatch"

const assignMock = assignOrderToDispatchWorkflow as unknown as jest.Mock

function makeContainer(metadata: Record<string, unknown> | null) {
  return {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) {
        return { info() {}, warn() {}, error() {} }
      }
      if (key === ContainerRegistrationKeys.QUERY) {
        return {
          graph: async () => ({ data: [{ id: "order_1", metadata }] }),
        }
      }
      return {}
    },
  }
}

function run(metadata: Record<string, unknown> | null) {
  return orderPlacedHandler({
    event: { data: { id: "order_1" } },
    container: makeContainer(metadata),
  } as never)
}

describe("order-placed — OTC counter dispatch guard", () => {
  beforeEach(() => assignMock.mockClear())

  it("skips dispatch for an OTC counter sale", async () => {
    await run({ sale_channel: "otc_counter" })
    expect(assignMock).not.toHaveBeenCalled()
  })

  it("assigns a normal order to a dispatch batch", async () => {
    await run(null)
    expect(assignMock).toHaveBeenCalledTimes(1)
    const run0 = assignMock.mock.results[0].value.run as jest.Mock
    expect(run0).toHaveBeenCalledWith({ input: { order_id: "order_1" } })
  })
})
