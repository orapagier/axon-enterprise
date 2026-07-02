import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"
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
 * FreshHub GCash payment provider — manual reference flow.
 *
 * GCash is prepaid: the buyer sends money to the hub's GCash number and pastes
 * the 13-digit reference at checkout. We keep that reference on the payment
 * session and authorize immediately so the order is placed; an admin verifies
 * the transfer and captures payment later (mirrors COD's manual capture). No
 * gateway/webhooks. Unlike COD there's no prepay-lock gate — a prepaid transfer
 * is allowed for every buyer.
 */
export default class GcashPaymentProviderService extends AbstractPaymentProvider {
  static identifier = "gcash"

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
    const sessionId = `gcash_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const provided = (input.data ?? {}) as { reference?: string | null }
    return {
      id: sessionId,
      data: {
        id: sessionId,
        status: "pending",
        method: "gcash",
        // The buyer-entered GCash reference number, kept so the admin can match
        // the order against the GCash transaction during verification.
        reference: provided.reference ?? null,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    // Manual-verify flow: an admin still confirms the transfer before capture,
    // but reject an empty/garbage reference up front (matches the storefront's
    // /^\d{13}$/ check) so a raw store-API call can't push an order into the
    // pipeline with no way to match the GCash transaction.
    const reference =
      typeof data.reference === "string" ? data.reference.trim() : ""
    if (!/^\d{13}$/.test(reference)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid 13-digit GCash reference number is required."
      )
    }
    return {
      data: { ...data, reference, status: "authorized" },
      status: "authorized",
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Captured by the admin once the GCash transfer is verified.
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
    // Manual flow — no webhooks.
    return {
      action: "not_supported",
    } as WebhookActionResult
  }
}
