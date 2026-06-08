import { isDuplicateCodTransaction } from "../is-duplicate"

describe("isDuplicateCodTransaction", () => {
  it("detects a Postgres unique-violation by SQLSTATE", () => {
    expect(isDuplicateCodTransaction({ code: "23505" })).toBe(true)
  })

  it("detects it by the unique index name", () => {
    expect(
      isDuplicateCodTransaction({
        message: 'duplicate key value violates unique constraint "UQ_cod_transaction_order_id_type"',
      })
    ).toBe(true)
  })

  it("detects it by a generic duplicate-key message", () => {
    expect(
      isDuplicateCodTransaction({ message: "duplicate key value" })
    ).toBe(true)
  })

  it("ignores unrelated errors", () => {
    expect(isDuplicateCodTransaction(new Error("connection refused"))).toBe(
      false
    )
    expect(isDuplicateCodTransaction({ code: "23503" })).toBe(false)
  })

  it("is safe on null/undefined", () => {
    expect(isDuplicateCodTransaction(undefined)).toBe(false)
    expect(isDuplicateCodTransaction(null)).toBe(false)
  })
})
