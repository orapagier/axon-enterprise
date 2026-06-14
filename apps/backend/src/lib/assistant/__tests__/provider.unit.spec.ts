import { detectProvider } from "../provider"

/**
 * Pins the "set a key, auto-detect the provider" contract. When new providers
 * are added, extend the detection table here first so the mapping stays
 * unambiguous (and so an OpenAI-compatible `sk-` key keeps returning null,
 * forcing an explicit ASSISTANT_PROVIDER rather than a wrong guess).
 */
describe("detectProvider", () => {
  it("detects Google (Gemini) from an AIza-prefixed key", () => {
    expect(detectProvider("AIzaSyA-EXAMPLE-EXAMPLE-EXAMPLE-EXAMPLE00")).toBe(
      "google"
    )
  })

  it("returns null for keys it can't unambiguously place", () => {
    // `sk-` is shared by OpenAI and OpenAI-compatible gateways — must not guess.
    expect(detectProvider("sk-proj-whatever")).toBeNull()
    expect(detectProvider("nonsense")).toBeNull()
    expect(detectProvider("")).toBeNull()
  })
})
