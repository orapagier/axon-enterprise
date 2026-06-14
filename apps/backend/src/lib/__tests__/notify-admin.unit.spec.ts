import { formatAdminMessage } from "../notify-admin"

describe("formatAdminMessage", () => {
  it("renders the title alone when there are no lines or url", () => {
    expect(formatAdminMessage({ title: "🛵 New rider" })).toBe("🛵 New rider")
  })

  it("appends detail lines under the title, dropping falsy entries", () => {
    const text = formatAdminMessage({
      title: "📦 New listing — awaiting approval",
      lines: ["Tomatoes · ₱60", false, null, undefined, "Hub: Tagum"],
    })
    expect(text).toBe(
      "📦 New listing — awaiting approval\nTomatoes · ₱60\nHub: Tagum"
    )
  })

  it("appends the bare path when no base url is given", () => {
    const text = formatAdminMessage(
      { title: "t", url: "/app/riders" },
      undefined
    )
    expect(text).toBe("t\n/app/riders")
  })

  it("prefixes the path with the trimmed base url when provided", () => {
    const text = formatAdminMessage(
      { title: "t", url: "/app/riders" },
      "https://admin.freshhub.ph/"
    )
    expect(text).toBe("t\nhttps://admin.freshhub.ph/app/riders")
  })
})
