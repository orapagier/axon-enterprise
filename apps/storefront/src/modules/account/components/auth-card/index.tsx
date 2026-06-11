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
import type { Hub } from "@modules/hub/data/hubs"
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
  { title: string; label: string; description: string; icon: string }
> = {
  consumer: {
    title: "I'm a Consumer",
    label: "Consumer",
    description: "Order fresh produce from Mindanao's growers.",
    icon: "🧺",
  },
  producer: {
    title: "I'm a Producer",
    label: "Producer",
    description: "List harvests and reach buyers nationwide.",
    icon: "🌾",
  },
  trader: {
    title: "I'm a Trader",
    label: "Trader",
    description: "Source in bulk for my restaurant, café, or retail business.",
    icon: "🤝",
  },
  rider: {
    title: "I'm a Delivery Rider",
    label: "Rider",
    description: "Earn by delivering FreshHub orders in your area.",
    icon: "🛵",
  },
}

// Messages for ?gerror=… codes set by the /api/auth/google routes.
const GOOGLE_ERROR_COPY: Record<string, string> = {
  not_configured:
    "Google sign-in isn't set up yet. Continue with email instead.",
  missing_role: "Choose an account type first, then continue with Google.",
  denied: "Google sign-in was cancelled.",
  state: "That Google sign-in attempt expired. Please try again.",
  unverified_email:
    "That Google account's email isn't verified, so we can't use it.",
  no_account:
    "No account found for that Google email. Switch to Sign up to create one.",
  auth_failed: "Google sign-in didn't go through. Please try again.",
}

type Props = {
  hubs?: Pick<Hub, "id" | "slug" | "name" | "city" | "province">[]
  currentHubSlug?: string | null
  googleEnabled?: boolean
  googleError?: string | null
}

const AuthCard = ({
  hubs = [],
  currentHubSlug = null,
  googleEnabled = false,
  googleError = null,
}: Props) => {
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string) || "ph"

  const [mode, setMode] = useState<AuthMode>("signin")
  // Deliberately starts empty: a pre-selected default once caused signups to
  // land as "consumer" when the role click never registered before submit.
  const [role, setRole] = useState<AccountType | null>(null)
  const [hub, setHub] = useState<string>(currentHubSlug ?? "")
  const [step, setStep] = useState<Step>("method")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""])
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showGoogleError, setShowGoogleError] = useState(Boolean(googleError))

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
    setShowGoogleError(false)
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
  const needsRole = mode === "signup" && !role

  const googleStartHref = (() => {
    const q = new URLSearchParams({ mode, countryCode })
    if (mode === "signup" && role) q.set("role", role)
    if (mode === "signup" && hub) q.set("hub", hub)
    return `/api/auth/google/start?${q.toString()}`
  })()
  const googleDisabled = !googleEnabled || needsRole
  const googleHint = !googleEnabled
    ? "Coming soon"
    : needsRole
    ? "Choose an account type first"
    : undefined

  const googleErrorMessage =
    showGoogleError && googleError
      ? GOOGLE_ERROR_COPY[googleError] ?? GOOGLE_ERROR_COPY.auth_failed
      : null

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5">
        <span className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full bg-brand-green-50 border border-brand-green-100 text-caption font-semibold text-brand-green-700 uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-pulse" />
          {step === "code"
            ? "Verify email"
            : mode === "signin"
            ? "Sign in"
            : "Create account"}
        </span>
        <h1 className="font-heading text-2xl small:text-3xl text-grey-90 leading-tight tracking-tight">
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
                {mode === "signup" && role && (
                  <>
                    {" "}
                    You&apos;re signing up as a{" "}
                    <span className="text-grey-90 font-semibold">
                      {ROLE_COPY[role].label}
                    </span>
                    .
                  </>
                )}
              </>
            )}
        </p>
      </div>

      {/* Mode tabs (only on step 1) */}
      {step === "method" && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-grey-10/60 rounded-xl mb-5">
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
              <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
                {(["consumer", "producer", "trader", "rider"] as AccountType[]).map(
                  (r) => {
                    const active = role === r
                    const copy = ROLE_COPY[r]
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                          active
                            ? "border-brand-green-600 bg-brand-green-50 shadow-soft ring-4 ring-brand-green-100"
                            : "border-grey-10 hover:border-grey-30 bg-white"
                        }`}
                      >
                        <span className="text-xl leading-none block">
                          {copy.icon}
                        </span>
                        <div className="text-body-sm font-bold text-grey-90 mt-2">
                          {copy.title}
                        </div>
                        <div className="text-[11px] text-grey-50 mt-1 leading-snug">
                          {copy.description}
                        </div>
                        {active && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-green-600 flex items-center justify-center shadow-soft">
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
                  }
                )}
              </div>
            </div>
          )}

          {mode === "signup" && hubs.length > 0 && (
            <label className="block mb-6">
              <span className="text-caption font-semibold text-grey-60 uppercase tracking-wider block mb-2">
                Your local hub
              </span>
              <select
                name="hub-select"
                value={hub}
                onChange={(e) => setHub(e.target.value)}
                className="w-full px-3.5 py-3 bg-grey-5 border border-grey-10 rounded-xl text-body-sm text-grey-90 focus:outline-none focus:border-brand-green-400 focus:ring-4 focus:ring-brand-green-100 focus:bg-white transition-all"
              >
                <option value="">Choose your hub…</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.slug}>
                    {h.name} — {h.city}, {h.province}
                  </option>
                ))}
              </select>
              <span className="text-caption text-grey-40 block mt-1.5">
                Becomes your default hub. You can change it anytime in Profile.
              </span>
            </label>
          )}

          {/* Google sign-in */}
          {googleDisabled ? (
            <button
              type="button"
              disabled
              title={googleHint}
              className="w-full flex items-center justify-center gap-x-3 py-3 rounded-xl border border-grey-20 bg-white text-body-sm font-semibold text-grey-80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleLogo />
              Continue with Google
              {googleHint && (
                <span className="text-caption text-grey-40 ml-0.5">
                  ({googleHint.toLowerCase()})
                </span>
              )}
            </button>
          ) : (
            <a
              href={googleStartHref}
              className="w-full flex items-center justify-center gap-x-3 py-3 rounded-xl border border-grey-20 bg-white text-body-sm font-semibold text-grey-80 hover:bg-grey-5 transition-colors"
            >
              <GoogleLogo />
              Continue with Google
            </a>
          )}

          {googleErrorMessage && (
            <div className="flex items-start gap-x-2 px-3.5 py-2.5 mt-3 rounded-lg bg-red-50 border border-red-100 text-caption text-red-700">
              <AlertIcon />
              <span>{googleErrorMessage}</span>
            </div>
          )}

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-grey-10" />
            <span className="px-3 text-caption text-grey-40 uppercase tracking-wider font-medium">
              or with email
            </span>
            <div className="flex-1 h-px bg-grey-10" />
          </div>

          <form action={requestAction} className="flex flex-col gap-y-4">
            <input type="hidden" name="mode" value={mode} />
            {mode === "signup" && role && (
              <input type="hidden" name="role" value={role} />
            )}
            {mode === "signup" && hub && (
              <input type="hidden" name="hub" value={hub} />
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

            {needsRole && email && (
              <div className="flex items-start gap-x-2 px-3.5 py-2.5 rounded-lg bg-brand-gold-50 border border-brand-gold-200 text-caption text-brand-gold-800">
                <AlertIcon />
                <span>Pick an account type above to continue.</span>
              </div>
            )}

            {requestState?.error && (
              <div className="flex items-start gap-x-2 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100 text-caption text-red-700">
                <AlertIcon />
                <span>{requestState.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={requestPending || !email || needsRole}
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

          {mode === "signup" && role === "producer" && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-brand-cream-100 border border-brand-gold-200">
              <p className="text-caption text-brand-gold-800 leading-relaxed">
                <span className="font-bold">Producer accounts</span> need admin
                verification before listing. Your producer profile stays
                private from buyers until approved.
              </p>
            </div>
          )}
          {mode === "signup" && role === "trader" && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-brand-cream-100 border border-brand-gold-200">
              <p className="text-caption text-brand-gold-800 leading-relaxed">
                <span className="font-bold">Trader accounts</span> unlock bulk
                pricing and standing weekly orders once we&apos;ve confirmed
                your business details.
              </p>
            </div>
          )}
          {mode === "signup" && role === "rider" && (
            <div className="mt-5 px-4 py-3 rounded-xl bg-brand-green-50 border border-brand-green-200">
              <p className="text-caption text-brand-green-800 leading-relaxed">
                <span className="font-bold">Rider accounts</span> let you earn
                from delivering FreshHub orders. After signing up, register as
                a rider from your account page and pay the cash bond at the hub
                counter to get activated. Your account also works as a consumer
                so you can shop the Hub.
              </p>
            </div>
          )}

          <p className="text-caption text-grey-40 text-center mt-5 leading-relaxed">
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
              <AlertIcon />
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
                if (mode === "signup" && role) fd.append("role", role)
                if (mode === "signup" && hub) fd.append("hub", hub)
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

const GoogleLogo = () => (
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
)

const AlertIcon = () => (
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
)

export default AuthCard
