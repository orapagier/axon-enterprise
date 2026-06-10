import { scryptSync, randomBytes, timingSafeEqual } from "crypto"

/**
 * Rider PIN hashing (scrypt). Stored as `scrypt$<salt>$<hash>` in
 * rider.pin_hash. No external dependency; PINs are never stored in plaintext.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(pin, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  const [, salt, hash] = parts
  const expected = Buffer.from(hash, "hex")
  const candidate = scryptSync(pin, salt, 64)
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  )
}
