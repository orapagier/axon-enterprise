/**
 * Provider selection.
 *
 * The operator just sets ASSISTANT_API_KEY and we detect the provider from the
 * key's shape. ASSISTANT_PROVIDER (optional) overrides detection for ambiguous
 * keys (e.g. OpenAI-compatible gateways that reuse the `sk-` prefix).
 * ASSISTANT_MODEL (optional) overrides the per-provider default model.
 *
 * Only Google (Gemini) ships today; the commented branches show exactly where
 * the next providers slot in.
 */
import type { ChatProvider } from "./types"
import { GoogleProvider } from "./providers/google"

export type ProviderId = "google" // | "anthropic" | "openai" (future)

export class AssistantConfigError extends Error {}

/** Map an API key to a provider by its recognizable prefix. */
export function detectProvider(apiKey: string): ProviderId | null {
  if (apiKey.startsWith("AIza")) return "google"
  // Future, drop-in:
  // if (apiKey.startsWith("sk-ant-")) return "anthropic"
  // if (apiKey.startsWith("sk-")) return "openai"
  return null
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  google: "gemini-2.5-flash",
}

let cached: ChatProvider | null = null

/** True when a usable API key is configured (read at boot, like other env). */
export function assistantEnabled(): boolean {
  return Boolean(process.env.ASSISTANT_API_KEY?.trim())
}

export function getProvider(): ChatProvider {
  if (cached) return cached

  const apiKey = process.env.ASSISTANT_API_KEY?.trim()
  if (!apiKey) {
    throw new AssistantConfigError(
      "AI assistant is not configured (ASSISTANT_API_KEY is unset)."
    )
  }

  const override = process.env.ASSISTANT_PROVIDER?.trim().toLowerCase() as
    | ProviderId
    | undefined
  const providerId = override || detectProvider(apiKey)
  if (!providerId) {
    throw new AssistantConfigError(
      "Could not detect the AI provider from ASSISTANT_API_KEY — set ASSISTANT_PROVIDER explicitly."
    )
  }

  const model =
    process.env.ASSISTANT_MODEL?.trim() || DEFAULT_MODELS[providerId]
  if (!model) {
    throw new AssistantConfigError(
      `No model configured for provider "${providerId}" — set ASSISTANT_MODEL.`
    )
  }

  switch (providerId) {
    case "google":
      cached = new GoogleProvider(apiKey, model)
      return cached
    default:
      throw new AssistantConfigError(
        `Unsupported AI provider: "${providerId}".`
      )
  }
}
