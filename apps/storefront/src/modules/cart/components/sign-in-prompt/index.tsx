import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-5 small:px-6 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-body-sm font-bold text-grey-90">
          Already have an account?
        </h2>
        <p className="text-caption text-grey-50 mt-0.5">
          Sign in for a better experience.
        </p>
      </div>
      <LocalizedClientLink
        href="/account"
        className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-grey-20 bg-white text-body-sm font-semibold text-grey-80 whitespace-nowrap hover:border-brand-green-300 hover:text-brand-green-700 hover:bg-brand-green-50 transition-colors"
        data-testid="sign-in-button"
      >
        Sign in
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
