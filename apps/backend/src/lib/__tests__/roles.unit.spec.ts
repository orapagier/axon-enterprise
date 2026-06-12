import { hasRole, rolesOf } from "../roles"

describe("rolesOf / hasRole", () => {
  it("treats every account as a consumer", () => {
    expect(hasRole({}, "consumer")).toBe(true)
    expect(hasRole({ roles: ["producer"] }, "consumer")).toBe(true)
    expect(hasRole({ account_type: "rider" }, "consumer")).toBe(true)
  })

  it("reads stacked roles from the roles array", () => {
    const meta = { roles: ["producer", "rider"] }
    expect(rolesOf(meta)).toEqual(["producer", "rider"])
    expect(hasRole(meta, "producer")).toBe(true)
    expect(hasRole(meta, "rider")).toBe(true)
    expect(hasRole(meta, "trader")).toBe(false)
  })

  it("falls back to legacy account_type when no roles array exists", () => {
    expect(rolesOf({ account_type: "trader" })).toEqual(["trader"])
    expect(rolesOf({ account_type: "seller" })).toEqual(["producer"])
    expect(rolesOf({ account_type: "buyer" })).toEqual([])
    expect(rolesOf({ account_type: "consumer" })).toEqual([])
    expect(rolesOf({})).toEqual([])
  })

  it("an existing roles array overrides the legacy field (downgrades stick)", () => {
    const downgraded = { account_type: "producer", roles: [] }
    expect(rolesOf(downgraded)).toEqual([])
    expect(hasRole(downgraded, "producer")).toBe(false)
  })

  it("ignores junk in the roles array", () => {
    expect(rolesOf({ roles: ["admin", "producer", 42, null] })).toEqual([
      "producer",
    ])
  })
})
