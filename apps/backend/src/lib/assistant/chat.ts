/**
 * Assistant orchestration — provider-neutral.
 *
 * Runs the tool-calling loop: ask the model, run any tools it requests (each
 * already scoped to this customer), feed the results back, repeat until it
 * answers in text or we hit the step cap. The provider is whatever the API key
 * selected; this file never knows or cares which one.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { getProvider } from "./provider"
import { executeTool, toolSchemas } from "./tools"
import type { ProviderMessage } from "./types"

const MAX_TOOL_STEPS = 5

const SYSTEM_PROMPT = `You are the FreshHub assistant — a friendly support agent inside a customer's account on FreshHub, a fresh-produce marketplace in the Philippines (prices are in Philippine pesos, written "₱").

You are talking to ONE signed-in customer. Help them with THEIR account, orders, Hub membership, deliveries, and disputes.

Rules:
- Answer only from the tools provided. They already return data scoped to THIS customer — never ask for, accept, or act on an order number, email, or account id that belongs to someone else, and never claim to look up another person's information.
- If a tool returns an error or no data, say so plainly and suggest contacting support. Never invent orders, totals, dates, statuses, or membership details.
- You have no access to internal business data (other customers, rider identities, costs or margins, payouts, COD reconciliation, admin notes). If asked for any of it, briefly say you can't share that, then offer what you can help with.
- Be concise and warm. Show money as "₱" followed by the amount. Refer to orders by their order number.
- For things you can't do from here (refunds, editing or cancelling an order, payment issues), direct them to Contact Support.`

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
