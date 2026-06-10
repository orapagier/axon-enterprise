import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

type InjectedDeps = {
  logger: Logger
}

/**
 * FreshHub Over-the-Counter (walk-in) payment provider.
 *
 * Reframe 2026-06-10: OTC is **walk-in only**, never an online payment method.
 * The counter flow (`POST /admin/otc-counter`) marks its order paid via
 * `markPaymentCollectionAsPaid`, which authorizes through `pp_system_default`
 * — it never calls this provider. So any session that *does* reach
 * `authorizePayment` here came from the online checkout path (e.g. a client
 * talking to the raw store API), which must not be able to place an unpaid
 * "OTC" order that would auto-dispatch to a rider. authorizePayment therefore
 * always rejects. The provider stays registered/attached to the region so the
 * identifier (`pp_otc_freshhub`) remains reserved and fails closed.
 *
 * Cash for a walk-in sale is recorded in the cod-ledger as `otc_collected`
 * (hub-held, no rider, no remittance leg) — see `src/lib/otc-sale.ts`.
 */
export default class OtcPaymentProviderService extends AbstractPaymentProvider {
  static identifier = "otc"

  protected logger_: Logger

  constructor(container: InjectedDeps, _config?: Record<string, unknown>) {
    // @ts-expect-error — AbstractPaymentProvider constructor signature is
    // intentionally loose; we don't pass config.
    super(...arguments)
    this.logger_ = container.logger
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = `otc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      id: sessionId,
      data: {
        id: sessionId,
        status: "pending",
        customer_id: input.context?.customer?.id ?? null,
      },
    }
  }

  async authorizePayment(
    _input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // OTC is walk-in only. Online checkout must never authorize through this
    // provider — the counter flow marks orders paid without calling it.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Over-the-counter payment is only available in person at the hub counter."
    )
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Cash is taken at the counter; the admin records it in the cod-ledger.
    // This just acknowledges within the Medusa payment flow.
    return { data: { ...(input.data ?? {}), status: "captured" } }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return { data: { ...(input.data ?? {}), status: "canceled" } }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const status = (input.data as { status?: string } | undefined)?.status
    switch (status) {
      case "authorized":
        return { status: "authorized" }
      case "captured":
        return { status: "captured" }
      case "canceled":
        return { status: "canceled" }
      default:
        return { status: "pending" }
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return (input.data ?? {}) as RetrievePaymentOutput
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    // OTC has no webhooks. Always not_supported.
    return {
      action: "not_supported",
    }
  }
}
