/**
 * Provider-agnostic chat types.
 *
 * The orchestrator (chat.ts) and tools speak ONLY these types. Each provider
 * adapter (providers/*.ts) translates them to and from its own wire format, so
 * adding a new provider is one self-contained adapter — nothing else changes.
 */

export type JSONSchema = Record<string, unknown>

/** A tool the model may call, described in a provider-neutral way. */
export type ProviderTool = {
  name: string
  description: string
  /** JSON Schema object describing the tool's arguments. */
  parameters: JSONSchema
}

export type ToolCall = {
  /** Opaque id echoed back with the result (Gemini 3+ requires it). */
  id: string
  name: string
  args: Record<string, unknown>
}

export type ToolResult = {
  id: string
  name: string
  /** Any JSON-serializable value returned to the model. */
  result: unknown
}

export type ProviderMessage =
  | { role: "user"; text: string }
  | { role: "model"; text?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolResults: ToolResult[] }

export type GenerateInput = {
  system: string
  messages: ProviderMessage[]
  tools: ProviderTool[]
}

export type GenerateOutput = {
  /** Final assistant text, if the model produced any this turn. */
  text?: string
  /** Tool calls the model wants executed before it can answer. */
  toolCalls?: ToolCall[]
}

/**
 * A single-turn LLM call. The tool-execution loop lives in the orchestrator
 * (chat.ts), so an adapter only has to translate one request/response pair.
 */
export interface ChatProvider {
  readonly name: string
  generate(input: GenerateInput): Promise<GenerateOutput>
}
