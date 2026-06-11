import "server-only"

/**
 * Transactional OTP email delivery.
 *
 * The storefront owns the OTP flow (code generation + the pending-auth cookie),
 * so it also owns delivery. We use Resend's REST API directly — the same
 * provider the backend's notification module uses (Phase B) — so a single
 * RESEND_API_KEY powers every email this project sends. Falls back to a
 * dev-only console log + on-screen code when no key is configured.
 *
 * Required env in production:
 *   - RESEND_API_KEY
 * Optional:
 *   - EMAIL_FROM   (a verified sender on your Resend account; defaults to
 *                   Resend's shared onboarding sender, which only delivers
 *                   to the Resend account owner's address)
 */

export type OtpEmailResult = {
  delivered: boolean
  /** dev-only: the code, surfaced to the UI when no provider is configured */
  devCode?: string
  error?: string
}

const RESEND_API_URL = "https://api.resend.com/emails"
// Matches the backend's resend-notification default — works without domain
// verification, but only delivers to the Resend account owner. Set EMAIL_FROM
// in production.
const DEFAULT_FROM = "Mindanao Fresh Hub <onboarding@resend.dev>"

const SUBJECT = "Your FreshHub sign-in code"

function buildBody(code: string): { text: string; html: string } {
  const text =
    `Your FreshHub code is ${code}.\n\n` +
    `It expires in 10 minutes. If you didn't request this, you can ignore this email.`
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 8px;color:#111;">Your sign-in code</h2>
      <p style="margin:0 0 16px;color:#444;">Enter this code to continue. It expires in 10 minutes.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111;background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;">${code}</div>
      <p style="margin:16px 0 0;color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`
  return { text, html }
}

export async function sendOtpEmail(
  email: string,
  code: string
): Promise<OtpEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || DEFAULT_FROM
  const isProduction = process.env.NODE_ENV === "production"

  // No provider configured.
  if (!apiKey) {
    if (!isProduction) {
      // eslint-disable-next-line no-console
      console.log(`[MFH auth] OTP for ${email}: ${code}`)
      return { delivered: false, devCode: code }
    }
    // eslint-disable-next-line no-console
    console.error(
      "[MFH auth] RESEND_API_KEY not configured; cannot deliver OTP."
    )
    return { delivered: false, error: "email_provider_not_configured" }
  }

  const { text, html } = buildBody(code)

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: SUBJECT,
        text,
        html,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      // eslint-disable-next-line no-console
      console.error(
        `[MFH auth] Resend send failed (${res.status}): ${detail.slice(0, 300)}`
      )
      return { delivered: false, error: "email_send_failed" }
    }

    return { delivered: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[MFH auth] Resend request error:", err)
    return { delivered: false, error: "email_send_failed" }
  }
}
