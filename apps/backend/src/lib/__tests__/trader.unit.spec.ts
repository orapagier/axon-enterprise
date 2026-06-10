import { isValidTraderDiscount } from "../trader"

describe("isValidTraderDiscount", () => {
  it("accepts integer percentages from 1 to 90", () => {
    expect(isValidTraderDiscount(1)).toBe(true)
    expect(isValidTraderDiscount(10)).toBe(true)
    expect(isValidTraderDiscount(90)).toBe(true)
  })

  it("rejects everything else", () => {
    expect(isValidTraderDiscount(0)).toBe(false)
    expect(isValidTraderDiscount(91)).toBe(false)
    expect(isValidTraderDiscount(10.5)).toBe(false)
    expect(isValidTraderDiscount(-5)).toBe(false)
    expect(isValidTraderDiscount("10")).toBe(false)
    expect(isValidTraderDiscount(undefined)).toBe(false)
  })
})
