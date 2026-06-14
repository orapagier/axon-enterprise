import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runAssistant, type ChatTurn } from "../../../lib/assistant/chat"
import {
  assistantEnabled,
  AssistantConfigError,
} from "../../../lib/assistant/provider"

/**
 * POST /store/assistant — the in-account AI support chatbot.
 *
 * Body: { messages: { role: "user" | "assistant", content: string }[] }
 *   The full visible conversation, ending with the new user message.
 *
 * Auth is the customer session (see middlewares.ts). The customer id comes
 * from `auth_context.actor_id`, NOT the body, so the model's tools can only
 * ever read the signed-in customer's own data.
 */
function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

const MAX_TURNS = 20
const MAX_LEN = 2000

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  if (!assistantEnabled()) {
    res.status(503).json({ error: "The assistant is not available right now." })
    return
  }

  const body = req.body as { messages?: unknown } | undefined
  const raw = Array.isArray(body?.messages) ? body!.messages : []
  const history: ChatTurn[] = []
  for (const m of raw.slice(-MAX_TURNS)) {
    const role = (m as { role?: unknown })?.role
    const content = (m as { content?: unknown })?.content
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim()
    ) {
      history.push({ role, content: content.slice(0, MAX_LEN) })
    }
  }

  if (!history.length || history[history.length - 1].role !== "user") {
    res
      .status(400)
      .json({ error: "Send a conversation ending with a user message." })
    return
  }

  try {
    const reply = await runAssistant({ scope: req.scope, customerId, history })
    res.json({ reply })
  } catch (e) {
    if (e instanceof AssistantConfigError) {
      res.status(503).json({ error: "The assistant is not configured." })
      return
    }
    console.error("[assistant] request failed:", e)
    res
      .status(502)
      .json({ error: "The assistant had a problem. Please try again." })
  }
}
