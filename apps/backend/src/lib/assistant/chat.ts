/**
 * Assistant orchestration — provider-neutral.
 *
 * Runs the tool-calling loop: ask the model, run any tools it requests (each
 * already scoped to this customer), feed the results back, repeat until it
 * answers in text or we hit the step cap. The provider is whatever the API key
 * selected; this file never knows or cares which one.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  DISPUTE_RESPONSE_SLA_MS,
  DISPUTE_REMINDER_AFTER_MS,
  DISPUTE_APPEAL_WINDOW_MS,
  DISPUTE_NO_RESPONSE_AUTO_RESOLVE,
} from "../../modules/accountability"
import { getProvider } from "./provider"
import { executeTool, toolSchemas } from "./tools"
import type { ProviderMessage } from "./types"

const MAX_TOOL_STEPS = 5

// Dispute timeframes, derived from the single source of truth in the
// accountability module so the assistant's policy answers can never drift from
// the rules the SLA job and appeal routes actually enforce.
const RESPONSE_SLA_HOURS = Math.round(DISPUTE_RESPONSE_SLA_MS / 3_600_000)
const REMINDER_AFTER_HOURS = Math.round(DISPUTE_REMINDER_AFTER_MS / 3_600_000)
const APPEAL_WINDOW_DAYS = Math.round(DISPUTE_APPEAL_WINDOW_MS / 86_400_000)

const NO_RESPONSE_OUTCOME = DISPUTE_NO_RESPONSE_AUTO_RESOLVE
  ? `the dispute is automatically resolved as the buyer's fault (a strike applies — "silence = forfeit")`
  : `the dispute is flagged for a FreshHub admin to review — it is NEVER decided automatically and no strike is applied without a human's decision`

const DISPUTE_POLICY = `How FreshHub disputes work (this is the policy — explain it when asked, and use list_my_disputes for the customer's OWN disputes and whether they can still appeal):
- A dispute opens when a delivery is refused or can't be completed. The recorded reason is one of: damaged goods, wrong item, not home, or other.
- After a refusal, the buyer (and the producer/seller) have ${RESPONSE_SLA_HOURS} hours to add their side of the story. A buyer who hasn't responded gets one reminder after ${REMINDER_AFTER_HOURS} hours.
- If the buyer doesn't respond within ${RESPONSE_SLA_HOURS} hours, ${NO_RESPONSE_OUTCOME}.
- A FreshHub admin resolves each dispute as one of: buyer's fault, producer's fault, rider's fault, or platform's fault. Only a "buyer's fault" outcome puts a strike on the buyer's account; repeated strikes can lock COD checkout (a "prepay lock") so they must prepay for a period.
- If a dispute is resolved as the buyer's fault, the buyer may appeal ONCE, within ${APPEAL_WINDOW_DAYS} days of the resolution. An overturned appeal reverses the strike; an upheld appeal keeps it. After ${APPEAL_WINDOW_DAYS} days — or once an appeal has already been filed — no further appeal is possible.
- Buyers add their response and file appeals from the Disputes section of their account. For anything that needs a human (the actual verdict, a refund, a payment problem), direct them to Contact Support.`

const SYSTEM_PROMPT = `You are the FreshHub assistant — a friendly support agent inside a customer's account on FreshHub, a fresh-produce marketplace in the Philippines (prices are in Philippine pesos, written "₱").

You are talking to ONE signed-in customer. Help them with THEIR account, orders, Hub membership, deliveries, and disputes.

Rules:
- Answer only from the tools provided. They already return data scoped to THIS customer — never ask for, accept, or act on an order number, email, or account id that belongs to someone else, and never claim to look up another person's information.
- If a tool returns an error or no data, say so plainly and suggest contacting support. Never invent orders, totals, dates, statuses, or membership details.
- You have no access to internal business data (other customers, rider identities, costs or margins, payouts, COD reconciliation, admin notes). If asked for any of it, briefly say you can't share that, then offer what you can help with.
- Be concise and warm. Show money as "₱" followed by the amount. Refer to orders by their order number.
- For things you can't do from here (refunds, editing or cancelling an order, payment issues), direct them to Contact Support.

${DISPUTE_POLICY}`

export type ChatTurn = { role: "user" | "assistant"; content: string }

export async function runAssistant(opts: {
  scope: MedusaContainer
  customerId: string
  history: ChatTurn[]
}): Promise<string> {
  const provider = getProvider()
  const tools = toolSchemas()
  const ctx = { scope: opts.scope, customerId: opts.customerId }

  const messages: ProviderMessage[] = opts.history.map((t) =>
    t.role === "user"
      ? { role: "user", text: t.content }
      : { role: "model", text: t.content }
  )

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const out = await provider.generate({
      system: SYSTEM_PROMPT,
      messages,
      tools,
    })

    if (out.toolCalls?.length) {
      messages.push({
        role: "model",
        text: out.text,
        toolCalls: out.toolCalls,
      })
      const results = await Promise.all(
        out.toolCalls.map((c) => executeTool(ctx, c))
      )
      messages.push({ role: "tool", toolResults: results })
      continue
    }

    return (
      out.text?.trim() || "Sorry, I didn't catch that — could you rephrase?"
    )
  }

  return "I'm having trouble pulling that together right now. Please try again, or contact support."
}
