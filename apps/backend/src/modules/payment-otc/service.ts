import { AbstractPaymentProvider } from "@medusajs/framework/utils"
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
 * OTC = the buyer pays cash at the physical hub counter. It deliberately has
 * NO accountability gate: it is the cash "prepay" rail for buyers whose COD has
 * been revoked (a `prepay_locked_*` accountability state). Those buyers can't
 * use COD but can always pay OTC, so this provider always authorizes.
 *
 * Cash for an OTC order is collected at the counter at order time and recorded
 * in the cod-ledger as `cod_collected` (no rider, no remittance leg) — see the
 * admin cod-collected route. This provider only keeps checkout inside the
 * standard Medusa initiate → authorize → capture flow.
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
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // No gate: OTC is always available, including to prepay-locked buyers.
    return {
      data: { ...(input.data ?? {}), status: "authorized" },
      status: "authorized",
    }
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
