/**
 * Google (Gemini) provider adapter.
 *
 * Talks to the Generative Language REST API with the global `fetch` (Node 20+),
 * so it adds no dependencies. It implements the provider-neutral ChatProvider
 * contract: translate our messages -> Gemini `contents`, call generateContent,
 * translate the response back to text and/or tool calls.
 */
import type {
  ChatProvider,
  GenerateInput,
  GenerateOutput,
  ProviderMessage,
  ToolCall,
} from "../types"

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

type GeminiPart =
  | { text: string }
  | {
      functionCall: { id?: string; name: string; args?: Record<string, unknown> }
      /** Reasoning token Gemini returns alongside the call; must be echoed back. */
      thoughtSignature?: string
    }
  | {
      functionResponse: {
        id?: string
        name: string
        response: Record<string, unknown>
      }
    }

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] }

/** Gemini's functionResponse.response must be an object — wrap scalars/arrays. */
function wrapResponse(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return { result: v }
}

function toGeminiContents(messages: ProviderMessage[]): GeminiContent[] {
  const out: GeminiContent[] = []
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", parts: [{ text: m.text }] })
    } else if (m.role === "model") {
      const parts: GeminiPart[] = []
      if (m.text) parts.push({ text: m.text })
      for (const tc of m.toolCalls ?? []) {
        parts.push({
          functionCall: { id: tc.id, name: tc.name, args: tc.args },
          // Gemini rejects the follow-up turn unless the signature it gave us
          // on this call is sent back verbatim. Omit when absent (non-thinking
          // models, or parallel calls where only the first carries one).
          ...(tc.signature ? { thoughtSignature: tc.signature } : {}),
        })
      }
      if (parts.length) out.push({ role: "model", parts })
    } else {
      // Tool results are sent back as a user turn of functionResponse parts.
      out.push({
        role: "user",
        parts: m.toolResults.map((r) => ({
          functionResponse: {
            id: r.id,
            name: r.name,
            response: wrapResponse(r.result),
          },
        })),
      })
    }
  }
  return out
}

export class GoogleProvider implements ChatProvider {
  readonly name = "google"

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const body = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: toGeminiContents(input.messages),
      tools: input.tools.length
        ? [
            {
              functionDeclarations: input.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })),
            },
          ]
        : undefined,
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    }

    const res = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(
        `Gemini request failed (${res.status}): ${detail.slice(0, 500)}`
      )
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[]
    }
    const parts = data.candidates?.[0]?.content?.parts ?? []

    let text = ""
    const toolCalls: ToolCall[] = []
    for (const p of parts) {
      if ("text" in p && p.text) {
        text += p.text
      } else if ("functionCall" in p) {
        toolCalls.push({
          id: p.functionCall.id ?? `${p.functionCall.name}-${toolCalls.length}`,
          name: p.functionCall.name,
          args: p.functionCall.args ?? {},
          signature: p.thoughtSignature,
        })
      }
    }

    return {
      text: text || undefined,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    }
  }
}
