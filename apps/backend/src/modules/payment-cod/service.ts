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
import { COD_LEDGER_MODULE } from "../cod-ledger"
import type CodLedgerModuleService from "../cod-ledger/service"

type InjectedDeps = {
  logger: Logger
  [COD_LEDGER_MODULE]?: CodLedgerModuleService
}

/**
 * FreshHub Cash-on-Delivery payment provider.
 *
 * Stays inside the standard Medusa payment flow (initiate → authorize → capture)
 * so the storefront and admin don't need a parallel checkout path. The only
 * gate is at `authorizePayment`: the customer's `BuyerWallet.status` must be
 * `verified` before authorization succeeds. First-time COD buyers must pay the
 * ₱100 refundable deposit via GCash (manually verified by admin) — handled by
 * separate `/store/customer/deposit/initiate` + `/admin/deposits/:id/verify`
 * endpoints in this phase.
 */
export default class CodPaymentProviderService extends AbstractPaymentProvider {
  static identifier = "cod"

  protected logger_: Logger
  protected container_: InjectedDeps

  constructor(container: InjectedDeps, _config?: Record<string, unknown>) {
    // @ts-expect-error — AbstractPaymentProvider constructor signature is
    // intentionally loose; we don't pass config.
    super(...arguments)
    this.container_ = container
    this.logger_ = container.logger
  }

  private resolveLedger(input: { context?: { customer?: { id?: string } } }):
    | CodLedgerModuleService
    | null {
    const ledger = this.container_[COD_LEDGER_MODULE]
    if (!ledger) {
      this.logger_.warn(
        "cod-payment-provider: cod_ledger module not resolved; deposit gate will be skipped."
      )
      return null
    }
    void input
    return ledger
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const sessionId = `cod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      id: sessionId,
      data: {
        id: sessionId,
        status: "pending",
        // Capture the customer id at session-init so authorizePayment can
        // re-check the wallet status without depending on `context` being
        // re-supplied later.
        customer_id: input.context?.customer?.id ?? null,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as {
      customer_id?: string | null
      id?: string
    }
    const customerId =
      data.customer_id ??
      (input as unknown as { context?: { customer?: { id?: string } } })
        .context?.customer?.id ??
      null

    if (customerId) {
      const ledger = this.resolveLedger({
        context: { customer: { id: customerId } },
      })
      if (ledger) {
        const [wallet] = await ledger.listBuyerWallets(
          { customer_id: customerId },
          { take: 1 }
        )
        if (!wallet || wallet.status !== "verified") {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "COD is locked until the ₱100 refundable deposit is verified."
          )
        }
      }
    }

    return {
      data: { ...data, status: "authorized" },
      status: "authorized",
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Capture is recorded by the admin when the rider confirms cash collection
    // via POST /admin/orders/:id/cod-collected. This method just acknowledges.
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
    // COD has no webhooks. Always not_supported.
    return {
      action: "not_supported",
    } as WebhookActionResult
  }
}
