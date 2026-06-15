"use client"

import { useEffect, useRef, useState } from "react"

type Msg = { role: "user" | "assistant"; content: string }

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm your FreshHub assistant. Ask me about your orders, membership, deliveries, or disputes.",
}

const SUGGESTIONS = [
  "Where are my recent orders?",
  "Is my Hub membership active?",
  "Can I appeal a dispute?",
]

/**
 * Floating in-account AI assistant, shown site-wide for signed-in customers
 * (mounted from the (main) layout). Posts the visible conversation to the
 * same-origin /api/assistant proxy, which forwards to the Medusa backend with
 * the customer's auth. The model's tools are scoped server-side to the
 * signed-in customer, so it can only ever talk about their own data.
 */
export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Allow other parts of the app (e.g. the "Track your order" CTA on the
  // order-confirmed page) to open the assistant and optionally drop a
  // starter question into the composer.
  useEffect(() => {
    function onOpen(e: Event) {
      setOpen(true)
      const prompt = (e as CustomEvent<{ prompt?: string }>).detail?.prompt
      if (prompt) {
        setInput(prompt)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    window.addEventListener("freshhub:open-assistant", onOpen as EventListener)
    return () =>
      window.removeEventListener(
        "freshhub:open-assistant",
        onOpen as EventListener
      )
  }, [])

  // Close when clicking outside the launcher/panel (the launcher itself is
  // inside rootRef, so its own toggle still works).
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    setError(null)
    const next: Msg[] = [...messages, { role: "user", content }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Drop the canned greeting (index 0) before sending to the model.
        body: JSON.stringify({ messages: next.slice(1) }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string
        error?: string
      }
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply || "…" },
        ])
      }
    } catch {
      setError("Couldn't reach the assistant. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={rootRef}>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-500 to-brand-green-700 text-white shadow-medium transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[min(70vh,560px)] w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border border-grey-10/60 bg-white shadow-medium">
          {/* Header */}
          <div className="flex items-center gap-x-3 bg-gradient-to-br from-brand-green-600 to-brand-green-700 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">
              🌿
            </div>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold leading-tight">
                FreshHub Assistant
              </p>
              <p className="text-[11px] text-white/70 leading-tight">
                Answers about your account
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-grey-5 px-3 py-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-body-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand-green-600 text-white rounded-br-sm"
                      : "border border-grey-10/70 bg-white text-grey-90 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-grey-20 bg-white px-3 py-1.5 text-[12px] text-grey-70 transition-colors hover:border-brand-green-300 hover:bg-brand-green-50 hover:text-brand-green-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-grey-10/70 bg-white px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-40" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-end gap-2 border-t border-grey-10/60 bg-white p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Ask about your account…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-grey-20 bg-grey-5 px-3 py-2 text-body-sm text-grey-90 outline-none focus:border-brand-green-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green-600 text-white transition-colors hover:bg-brand-green-700 disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
