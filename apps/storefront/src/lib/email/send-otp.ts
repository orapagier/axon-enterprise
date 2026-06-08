import "server-only"

/**
 * Transactional OTP email delivery.
 *
 * The storefront owns the OTP flow (code generation + the pending-auth cookie),
 * so it also owns delivery. We use SendGrid's v3 HTTP API directly — no SDK
 * dependency — and fall back to a dev-only console log when no provider is
 * configured. Swapping providers (SES, Postmark, Resend) means replacing the
 * `deliver` call below; the public contract stays the same.
 *
 * Required env in production:
 *   - SENDGRID_API_KEY
 *   - OTP_FROM_EMAIL   (a verified sender on your SendGrid account)
 * Optional:
 *   - OTP_FROM_NAME    (defaults to "FreshHub")
 */

export type OtpEmailResult = {
  delivered: boolean
  /** dev-only: the code, surfaced to the UI when no provider is configured */
  devCode?: string
  error?: string
}

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
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.OTP_FROM_EMAIL
  const fromName = process.env.OTP_FROM_NAME || "FreshHub"
  const isProduction = process.env.NODE_ENV === "production"

  // No provider configured.
  if (!apiKey || !fromEmail) {
    if (!isProduction) {
      // eslint-disable-next-line no-console
      console.log(`[MFH auth] OTP for ${email}: ${code}`)
      return { delivered: false, devCode: code }
    }
    // eslint-disable-next-line no-console
    console.error(
      "[MFH auth] SENDGRID_API_KEY / OTP_FROM_EMAIL not configured; cannot deliver OTP."
    )
    return { delivered: false, error: "email_provider_not_configured" }
  }

  const { text, html } = buildBody(code)

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: fromName },
        subject: SUBJECT,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      // eslint-disable-next-line no-console
      console.error(
        `[MFH auth] SendGrid send failed (${res.status}): ${detail.slice(0, 300)}`
      )
      return { delivered: false, error: "email_send_failed" }
    }

    return { delivered: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[MFH auth] SendGrid request error:", err)
    return { delivered: false, error: "email_send_failed" }
  }
}
