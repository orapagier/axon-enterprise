import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { buildEmail } from "./emails"

type InjectedDeps = { logger: Logger }

export type ResendOptions = {
  channels?: string[]
  api_key?: string
  from?: string
}

const RESEND_API_URL = "https://api.resend.com/emails"
// Resend's shared onboarding sender — works without domain verification, but
// only delivers to the account owner's address. Set EMAIL_FROM in production.
const DEFAULT_FROM = "Mindanao Fresh Hub <onboarding@resend.dev>"

/**
 * Resend email provider for Medusa's Notification module (Phase B).
 *
 * Templates are plain functions in ./emails.ts; delivery is a raw fetch to the
 * Resend REST API (no SDK dependency). Without RESEND_API_KEY the provider
 * logs a warning and no-ops, so dev environments run silently rather than
 * crashing — the notification row is still recorded as an audit trail of what
 * would have been sent.
 */
export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: ResendOptions

  constructor({ logger }: InjectedDeps, options: ResendOptions) {
    super()
    this.logger_ = logger
    this.options_ = options ?? {}
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = notification.template
    const email = buildEmail(
      template,
      (notification.data ?? {}) as Record<string, unknown>
    )
    if (!email) {
      this.logger_.warn(
        `resend: unknown email template "${template}" — nothing sent.`
      )
      return {}
    }

    if (!this.options_.api_key) {
      this.logger_.warn(
        `resend: RESEND_API_KEY not set — skipped "${template}" to ${notification.to}.`
      )
      return {}
    }

    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options_.from || DEFAULT_FROM,
        to: [notification.to],
        subject: email.subject,
        html: email.html,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend API ${res.status} sending "${template}": ${body.slice(0, 300)}`
      )
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string }
    return { id: json.id }
  }
}
