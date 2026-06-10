import { cityMatchesHub, normalizeCity } from "../resolve-hub"

describe("normalizeCity", () => {
  it("lowercases, trims, and strips a trailing 'City'", () => {
    expect(normalizeCity("  Tagum City ")).toBe("tagum")
    expect(normalizeCity("TAGUM")).toBe("tagum")
    expect(normalizeCity("Davao  City")).toBe("davao")
    expect(normalizeCity(null)).toBe("")
  })
})

describe("cityMatchesHub", () => {
  it("matches with or without the City suffix on either side", () => {
    expect(cityMatchesHub("Tagum City", "Tagum")).toBe(true)
    expect(cityMatchesHub("tagum", "Tagum City")).toBe(true)
    expect(cityMatchesHub("Tagum", "Tagum")).toBe(true)
  })

  it("rejects other cities and empty input", () => {
    expect(cityMatchesHub("Davao City", "Tagum")).toBe(false)
    expect(cityMatchesHub("", "Tagum")).toBe(false)
    expect(cityMatchesHub(undefined, "Tagum")).toBe(false)
  })
})
