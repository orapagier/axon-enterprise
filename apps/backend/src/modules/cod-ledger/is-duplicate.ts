/**
 * Detect a Postgres unique-violation (SQLSTATE 23505) bubbling up from the
 * cod_transaction (order_id, type) unique index. Lets the COD routes turn a
 * lost race (two requests both passing the read-then-insert check) into a clean
 * 409 instead of a 500.
 */
export function isDuplicateCodTransaction(err: unknown): boolean {
  const e = err as
    | { code?: string; errno?: string; message?: string; constraint?: string }
    | undefined
  if (!e) return false
  if (e.code === "23505" || e.errno === "23505") return true
  const haystack = `${e.message ?? ""} ${e.constraint ?? ""}`.toLowerCase()
  return (
    haystack.includes("uq_cod_transaction") ||
    haystack.includes("duplicate key")
  )
}
