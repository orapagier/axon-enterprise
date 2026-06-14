import { MedusaService } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"
import ReferralCode from "./models/referral-code"
import Referral from "./models/referral"

// Crockford-ish base32: no I/O/0/1/U so codes are easy to read aloud and type.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ"
const CODE_LENGTH = 7

const generateCandidate = (): string => {
  const bytes = randomBytes(CODE_LENGTH)
  let out = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return out
}

/** Normalize user-entered codes so case / stray spaces never break a match. */
export const normalizeCode = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toUpperCase()

class ReferralModuleService extends MedusaService({
  ReferralCode,
  Referral,
}) {
  /**
   * Return the customer's referral code, creating one on first use. Idempotent:
   * concurrent callers converge on the existing row. Retries on the (rare) code
   * collision against the unique index.
   */
  async getOrCreateCodeFor(customerId: string): Promise<string> {
    const existing = await this.listReferralCodes(
      { customer_id: customerId },
      { take: 1 }
    )
    if (existing[0]?.code) return existing[0].code

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = generateCandidate()
      const clash = await this.listReferralCodes({ code }, { take: 1 })
      if (clash.length > 0) continue
      try {
        const created = await this.createReferralCodes({
          customer_id: customerId,
          code,
        })
        return Array.isArray(created) ? created[0].code : created.code
      } catch {
        // Lost a race to another writer (unique violation). Re-read: either our
        // customer now has a code, or the code was taken — loop again.
        const now = await this.listReferralCodes(
          { customer_id: customerId },
          { take: 1 }
        )
        if (now[0]?.code) return now[0].code
      }
    }
    throw new Error("Could not allocate a unique referral code")
  }

  /** Resolve a referral code to the referrer's customer id, or null. */
  async resolveReferrerByCode(rawCode: string): Promise<string | null> {
    const code = normalizeCode(rawCode)
    if (!code) return null
    const rows = await this.listReferralCodes({ code }, { take: 1 })
    return rows[0]?.customer_id ?? null
  }
}

export default ReferralModuleService
