"use client"

import {
  requestEmailCode,
  verifyEmailCode,
  cancelPendingAuth,
  type AccountType,
  type AuthMode,
  type OtpRequestState,
  type OtpVerifyState,
} from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, useRouter } from "next/navigation"
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react"

type Step = "method" | "code"

const ROLE_COPY: Record<
  AccountType,
  { title: string; description: string; icon: string }
> = {
  buyer: {
    title: "I'm a Buyer",
    description: "Order fresh produce from Mindanao's growers.",
    icon: "🧺",
  },
  seller: {
    title: "I'm a Seller",
    description: "List harvests and reach buyers nationwide.",
    icon: "🌾",
  },
}

const AuthCard = () => {
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string) || "ph"

  const [mode, setMode] = useState<AuthMode>("signin")
  const [role, setRole] = useState<AccountType>("buyer")
  const [step, setStep] = useState<Step>("method")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""])
  const [resendCooldown, setResendCooldown] = useState(0)

  const [requestState, requestAction, requestPending] = useActionState<
    OtpRequestState | null,
    FormData
  >(requestEmailCode, null)

  const [verifyState, verifyAction, verifyPending] = useActionState<
    OtpVerifyState | null,
    FormData
  >(verifyEmailCode, null)

  const codeInputs = useRef<(HTMLInputElement | null)[]>([])

  // Move to code step once the request action returns ok
  useEffect(() => {
    if (requestState?.ok) {
      setStep("code")
      setResendCooldown(30)
      setTimeout(() => codeInputs.current[0]?.focus(), 50)
    }
  }, [requestState])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    if (verifyState?.ok && verifyState.redirectTo) {
      router.push(verifyState.redirectTo)
      router.refresh()
    }
  }, [verifyState, router])

  const switchMode = (next: AuthMode) => {
    if (next === mode) return
    setMode(next)
    setStep("method")
    setCode(["", "", "", "", "", ""])
  }

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setCode((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) {
      codeInputs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      codeInputs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < 5) {
      codeInputs.current[index + 1]?.focus()
    }
  }

  const handleCodePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = ["", "", "", "", "", ""]
    pasted.split("").forEach((ch, i) => (next[i] = ch))
    setCode(next)
    const focusIdx = Math.min(pasted.length, 5)
    codeInputs.current[focusIdx]?.focus()
  }

  const goBack = async () => {
    await cancelPendingAuth()
    setStep("method")
    setCode(["", "", "", "", "", ""])
  }

  const fullCode = code.join("")
  const canSubmitCode = fullCode.length === 6 && !verifyPending

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-7">
        <span className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full bg-brand-green-50 border border-brand-green-100 text-caption font-semibold text-brand-green-700 uppercase tracking-wider mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-pulse" />
          {step === "code"
            ? "Verify email"
            : mode === "signin"
            ? "Sign in"
            : "Create account"}
        </span>
        <h1 className="font-heading text-3xl small:text-4xl text-grey-90 leading-tight tracking-tight">
          {step === "method"
            ? mode === "signin"
              ? "Welcome back"
              : "Join the Hub"
            : "Check your email"}
        </h1>
        <p className="text-body-sm text-grey-60 mt-2 leading-relaxed">
          {step === "method"
            ? mode === "signin"
              ? "Enter your email and we'll send a code to sign you in."
              : "Pick what brings you here and we'll send a verification code."
            : (
              <>
                We sent a 6-digit code to{" "}
                <span className="text-grey-90 font-semibold">{email}</span>.
              </>
            )}
        </p>
      </div>

      {/* Mode tabs (only on step 1) */}
      {step === "method" && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-grey-10/60 rounded-xl mb-6">
          <button
            onClick={() => switchMode("signin")}
            className={`py-2.5 rounded-lg text-body-sm font-semibold transition-all ${
              mode === "signin"
                ? "bg-white text-grey-90 shadow-soft"
                : "text-grey-60 hover:text-grey-80"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`py-2.5 rounded-lg text-body-sm font-semibold transition-all ${
              mode === "signup"
                ? "bg-white text-grey-90 shadow-soft"
                : "text-grey-60 hover:text-grey-80"
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      {step === "method" ? (
        <>
          {mode === "signup" && (
            <div className="mb-6">
              <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider mb-2.5 block">
                I want to
              </span>
              <div className="grid grid-cols-2 gap-3">
                {(["buyer", "seller"] as AccountType[]).map((r) => {
                  const active = role === r
                  const copy = ROLE_COPY[r]
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${
                        active
                          ? "border-brand-green-600 bg-brand-green-50 shadow-soft ring-4 ring-brand-green-100"
                          : "border-grey-10 hover:border-grey-30 bg-white"
                      }`}
                    >
                      <span className="text-2xl leading-none block">
                        {copy.icon}
                      </span>
                      <div className="text-body-sm font-bold text-grey-90 mt-2">
                        {copy.title}
                      </div>
                      <div className="text-caption text-grey-50 mt-1 leading-snug">
                        {copy.description}
                      </div>
                      {active && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-green-600 flex items-center justify-center shadow-soft">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Google sign-in */}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="w-full flex items-center justify-center gap-x-3 py-3 rounded-xl border border-grey-20 bg-white text-body-sm font-semibold text-grey-80 hover:bg-grey-5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
            <span className="text-caption text-grey-40 ml-0.5">(soon)</span>
          </button>

          <div className="flex items-center my-5">
            <div className="flex-1 h-px bg-grey-10" />
            <span className="px-3 text-caption text-grey-40 uppercase tracking-wider font-medium">
              or with email
            </span>
            <div className="flex-1 h-px bg-grey-10" />
          </div>

          <form action={requestAction} className="flex flex-col gap-y-4">
            <input type="hidden" name="mode" value={mode} />
            {mode === "signup" && (
              <input type="hidden" name="role" value={role} />
            )}

            <label className="block">
              <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider block mb-2">
                Email address
              </span>
              <div className="relative">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey-40 pointer-events-none"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-grey-5 border border-grey-10 rounded-xl text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-400 focus:ring-4 focus:ring-brand-green-100 focus:bg-white transition-all"
                />
              </div>
            </label>

            {requestState?.error && (
              <div className="flex items-start gap-x-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100 text-caption text-red-700">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{requestState.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={requestPending || !email}
              className="w-full py-3 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold transition-all shadow-soft hover:shadow-medium hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {requestPending ? (
                <span className="inline-flex items-center gap-x-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-ring"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Sending code…
                </span>
              ) : (
                "Continue with email"
              )}
            </button>
          </form>

          {mode === "signup" && role === "seller" && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-brand-cream-100 border border-brand-gold-200">
              <p className="text-caption text-brand-gold-800 leading-relaxed">
                <span className="font-bold">Seller accounts</span> need admin
                verification before listing. Your seller profile stays private
                from buyers until approved.
              </p>
            </div>
          )}

          <p className="text-caption text-grey-40 text-center mt-7 leading-relaxed">
            By continuing, you agree to our{" "}
            <LocalizedClientLink
              href="/content/terms-of-use"
              className="underline hover:text-grey-70"
            >
              Terms
            </LocalizedClientLink>{" "}
            and{" "}
            <LocalizedClientLink
              href="/content/privacy-policy"
              className="underline hover:text-grey-70"
            >
              Privacy Policy
            </LocalizedClientLink>
            .
          </p>
        </>
      ) : (
        <form action={verifyAction} className="flex flex-col gap-y-5">
          <input type="hidden" name="countryCode" value={countryCode} />
          <input type="hidden" name="code" value={fullCode} />

          {process.env.NODE_ENV !== "production" && requestState?.devCode && (
            <div className="flex items-start gap-x-2 px-3.5 py-2.5 rounded-xl bg-brand-gold-50 border border-brand-gold-200 text-caption text-brand-gold-800">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                <span className="font-bold">Dev mode:</span> your code is{" "}
                <span className="font-mono font-bold tabular-nums text-brand-gold-900">
                  {requestState.devCode}
                </span>
              </span>
            </div>
          )}

          <div>
            <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider block mb-3">
              6-digit verification code
            </span>
            <div className="flex justify-between gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    codeInputs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={handleCodePaste}
                  className="w-full aspect-square text-center text-2xl font-bold tabular-nums text-grey-90 bg-grey-5 border-2 border-grey-10 rounded-xl focus:outline-none focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-100 focus:bg-white transition-all"
                />
              ))}
            </div>
          </div>

          {verifyState?.error && (
            <div className="flex items-start gap-x-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100 text-caption text-red-700">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{verifyState.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmitCode}
            className="w-full py-3 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold transition-all shadow-soft hover:shadow-medium hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {verifyPending ? (
              <span className="inline-flex items-center gap-x-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-ring"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Verifying…
              </span>
            ) : mode === "signup" ? (
              "Verify & create account"
            ) : (
              "Verify & sign in"
            )}
          </button>

          <div className="flex items-center justify-between text-caption pt-1">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-x-1.5 text-grey-60 hover:text-grey-90 font-medium transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Use a different email
            </button>
            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={() => {
                const fd = new FormData()
                fd.append("email", email)
                fd.append("mode", mode)
                if (mode === "signup") fd.append("role", role)
                requestAction(fd)
              }}
              className="text-brand-green-700 hover:text-brand-green-800 font-semibold disabled:text-grey-40 disabled:cursor-not-allowed transition-colors"
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AuthCard
