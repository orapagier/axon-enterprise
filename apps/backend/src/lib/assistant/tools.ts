/**
 * Assistant tools — the security boundary.
 *
 * Every tool is a thin, server-side read that is HARD-SCOPED to the one
 * authenticated customer (`ctx.customerId`). The model never sees a raw query
 * and can never widen the scope: it can only ask for data there is a tool for,
 * and each tool re-applies the `customer_id` filter itself. There is
 * deliberately NO tool for anything a customer must not see — other customers,
 * rider identities, internal costs/margins, producer payouts, COD
 * reconciliation, or admin notes.
 */
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ACCOUNTABILITY_MODULE } from "../../modules/accountability"
import type AccountabilityModuleService from "../../modules/accountability/service"
import { rolesOf } from "../roles"
import { canAppeal } from "../dispute-appeal"
import type { ProviderTool, ToolCall, ToolResult } from "./types"

export type ToolContext = {
  scope: MedusaContainer
  customerId: string
}

type AssistantTool = ProviderTool & {
  handler: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>
}

function clampLimit(v: unknown, fallback: number, max: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), max)
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function getAccountSummary(ctx: ToolContext) {
  const query = ctx.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: [
      "id",
      "email",
      "first_name",
      "last_name",
      "metadata",
      "hub.name",
      "hub.slug",
    ],
    filters: { id: ctx.customerId },
  })

  const c = data[0] as
    | {
        email?: string
        first_name?: string | null
        last_name?: string | null
        metadata?: Record<string, unknown> | null
        hub?: { name?: string } | null
      }
    | undefined
  if (!c) return { error: "Account not found." }

  const meta = (c.metadata ?? {}) as Record<string, unknown>

  // Account standing (strikes / prepay lock) — the buyer's own status only.
  const accountability: AccountabilityModuleService =
    ctx.scope.resolve(ACCOUNTABILITY_MODULE)
  const [status] = await accountability.listBuyerAccountStatuses(
    { customer_id: ctx.customerId },
    { take: 1 }
  )

  return {
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
    email: c.email ?? null,
    roles: ["consumer", ...rolesOf(meta)],
    home_hub: c.hub?.name ?? null,
    membership: {
      status: meta.membership_status ?? "none",
      tier: meta.membership_tier ?? null,
      expires_at: meta.membership_expires_at ?? null,
      renewal_pending: meta.membership_renewal_pending === true,
    },
    account_standing: status
      ? {
          state: status.state,
          strike_count: status.strike_count,
          locked_until: status.state_until ?? null,
        }
      : { state: "normal", strike_count: 0, locked_until: null },
  }
}

async function listMyOrders(ctx: ToolContext, args: { limit?: number }) {
  const take = clampLimit(args.limit, 5, 20)
  const query = ctx.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "created_at",
      "total",
      "currency_code",
      "items.title",
      "items.quantity",
    ],
    filters: { customer_id: ctx.customerId },
    pagination: { take, order: { created_at: "DESC" } },
  })

  const orders = (data ?? []).map((o: Record<string, any>) => ({
    order_number: o.display_id,
    status: o.status,
    payment_status: o.payment_status ?? null,
    fulfillment_status: o.fulfillment_status ?? null,
    placed_at: o.created_at,
    total: Number(o.total ?? 0),
    currency: String(o.currency_code ?? "").toUpperCase(),
    items: (o.items ?? []).map((it: Record<string, any>) => ({
      name: it.title,
      quantity: it.quantity,
    })),
  }))

  return { count: orders.length, orders }
}

async function getOrderDetails(
  ctx: ToolContext,
  args: { order_number?: number | string }
) {
  const displayId = Number(args.order_number)
  if (!Number.isInteger(displayId)) {
    return { error: "Please give a numeric order number from your order history." }
  }

  const query = ctx.scope.resolve(ContainerRegistrationKeys.QUERY)
  // Filtering by BOTH customer_id and display_id guarantees a customer can
  // never read another person's order, even by guessing the number.
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "created_at",
      "total",
      "currency_code",
      "shipping_address.city",
      "shipping_address.province",
      "items.title",
      "items.quantity",
      "items.unit_price",
    ],
    filters: { customer_id: ctx.customerId, display_id: displayId },
  })

  const o = data[0] as Record<string, any> | undefined
  if (!o) return { error: `No order #${displayId} found on your account.` }

  return {
    order_number: o.display_id,
    status: o.status,
    payment_status: o.payment_status ?? null,
    fulfillment_status: o.fulfillment_status ?? null,
    placed_at: o.created_at,
    total: Number(o.total ?? 0),
    currency: String(o.currency_code ?? "").toUpperCase(),
    deliver_to: o.shipping_address
      ? [o.shipping_address.city, o.shipping_address.province]
          .filter(Boolean)
          .join(", ") || null
      : null,
    items: (o.items ?? []).map((it: Record<string, any>) => ({
      name: it.title,
      quantity: it.quantity,
      unit_price: Number(it.unit_price ?? 0),
    })),
  }
}

async function listMyDisputes(ctx: ToolContext) {
  const accountability: AccountabilityModuleService =
    ctx.scope.resolve(ACCOUNTABILITY_MODULE)
  const disputes = await accountability.listRefusalDisputes(
    { customer_id: ctx.customerId },
    { order: { created_at: "DESC" }, take: 20 }
  )

  // Map internal order ids -> the order numbers the customer recognises
  // (still scoped to this customer).
  const orderIds = [...new Set(disputes.map((d) => d.order_id))]
  const displayById: Record<string, number> = {}
  if (orderIds.length) {
    const query = ctx.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "display_id"],
      filters: { id: orderIds, customer_id: ctx.customerId },
    })
    for (const o of data as Record<string, any>[]) {
      displayById[o.id] = o.display_id
    }
  }

  const now = new Date()
  return {
    count: disputes.length,
    disputes: disputes.map((d) => ({
      order_number: displayById[d.order_id] ?? null,
      reason: d.buyer_reason ?? null,
      resolution: d.resolution,
      resolved_at: d.resolved_at ?? null,
      appeal_state: d.appeal_state,
      can_appeal: canAppeal(
        {
          resolution: d.resolution,
          appeal_state: d.appeal_state,
          resolved_at: d.resolved_at,
        },
        now
      ),
    })),
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: "get_account_summary",
    description:
      "Get the signed-in customer's own account overview: name, email, roles, home hub, Hub membership (status, tier, expiry, renewal), and account standing (strikes / prepay lock). Use for 'my account', 'my membership', 'am I a member', 'why am I locked'.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) => getAccountSummary(ctx),
  },
  {
    name: "list_my_orders",
    description:
      "List the customer's recent orders with order number, status, payment/fulfillment status, date, total and items. Use for 'my orders', 'recent orders', 'what did I buy'.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "How many recent orders to return (1-20, default 5).",
        },
      },
    },
    handler: (ctx, args) => listMyOrders(ctx, args as { limit?: number }),
  },
  {
    name: "get_order_details",
    description:
      "Get the details of ONE of the customer's orders by its order number (the # shown in their order history): items, statuses, total, and delivery city. Use for 'where is order 1042', 'what's in order 1042', 'status of my order'.",
    parameters: {
      type: "object",
      properties: {
        order_number: {
          type: "integer",
          description: "The order number (display id) from the customer's order history.",
        },
      },
      required: ["order_number"],
    },
    handler: (ctx, args) =>
      getOrderDetails(ctx, args as { order_number?: number | string }),
  },
  {
    name: "list_my_disputes",
    description:
      "List the customer's delivery-refusal disputes, each with its resolution, appeal state, and whether they can still appeal. Use for 'my disputes', 'can I appeal', 'why was I charged for a refused delivery'.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) => listMyDisputes(ctx),
  },
]

export function toolSchemas(): ProviderTool[] {
  return ASSISTANT_TOOLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }))
}

export async function executeTool(
  ctx: ToolContext,
  call: ToolCall
): Promise<ToolResult> {
  const tool = ASSISTANT_TOOLS.find((t) => t.name === call.name)
  if (!tool) {
    return {
      id: call.id,
      name: call.name,
      result: { error: `Unknown tool: ${call.name}` },
    }
  }
  try {
    const result = await tool.handler(ctx, call.args ?? {})
    return { id: call.id, name: call.name, result }
  } catch (e) {
    console.error(`[assistant] tool "${call.name}" failed:`, e)
    return {
      id: call.id,
      name: call.name,
      result: { error: "That lookup failed. Please try again in a moment." },
    }
  }
}
