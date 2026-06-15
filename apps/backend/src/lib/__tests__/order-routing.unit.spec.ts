import {
  routeOrderItems,
  formatItemLine,
  type RoutableItem,
  type ProductRouteMeta,
} from "../order-routing"

const item = (
  product_id: string | null,
  title: string,
  quantity = 1
): RoutableItem => ({ product_id, title, quantity })

const meta = (m: Map<string, ProductRouteMeta>) => m

describe("formatItemLine", () => {
  it("renders quantity × title", () => {
    expect(formatItemLine(item("p1", "Mangoes", 3))).toBe("3× Mangoes")
  })
})

describe("routeOrderItems", () => {
  it("routes direct-to-consumer items to their producer", () => {
    const items = [item("p1", "Mangoes")]
    const m = meta(
      new Map([
        ["p1", { selling_mode: "direct_to_consumer", seller_customer_id: "cus_1" }],
      ])
    )
    const out = routeOrderItems(items, m)
    expect(out.hubItems).toEqual([])
    expect(out.producers).toEqual([{ sellerId: "cus_1", items }])
  })

  it("routes sell_to_freshhub items to the hub bucket", () => {
    const items = [item("p1", "Hub Rice")]
    const m = meta(
      new Map([
        ["p1", { selling_mode: "sell_to_freshhub", seller_customer_id: "cus_1" }],
      ])
    )
    const out = routeOrderItems(items, m)
    expect(out.producers).toEqual([])
    expect(out.hubItems).toEqual(items)
  })

  it("treats unattributed / missing-metadata items as hub items", () => {
    const items = [item("p1", "Seeded Catalog Item"), item(null, "No product id")]
    const out = routeOrderItems(items, new Map())
    expect(out.producers).toEqual([])
    expect(out.hubItems).toEqual(items)
  })

  it("treats direct items missing a seller id as hub items (can't notify nobody)", () => {
    const items = [item("p1", "Orphan Direct")]
    const m = meta(
      new Map([["p1", { selling_mode: "direct_to_consumer" }]])
    )
    const out = routeOrderItems(items, m)
    expect(out.producers).toEqual([])
    expect(out.hubItems).toEqual(items)
  })

  it("groups multiple items per producer and splits a mixed order", () => {
    const a1 = item("p1", "A1")
    const a2 = item("p2", "A2")
    const b1 = item("p3", "B1")
    const hub = item("p4", "HubThing")
    const m = meta(
      new Map<string, ProductRouteMeta>([
        ["p1", { selling_mode: "direct_to_consumer", seller_customer_id: "A" }],
        ["p2", { selling_mode: "direct_to_consumer", seller_customer_id: "A" }],
        ["p3", { selling_mode: "direct_to_consumer", seller_customer_id: "B" }],
        ["p4", { selling_mode: "sell_to_freshhub", seller_customer_id: "C" }],
      ])
    )
    const out = routeOrderItems([a1, b1, a2, hub], m)
    expect(out.hubItems).toEqual([hub])
    // Producer order follows first appearance: A (a1) before B (b1).
    expect(out.producers).toEqual([
      { sellerId: "A", items: [a1, a2] },
      { sellerId: "B", items: [b1] },
    ])
  })
})
