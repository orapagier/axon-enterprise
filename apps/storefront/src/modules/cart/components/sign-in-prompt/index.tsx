import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <Heading level="h2" className="text-base font-semibold text-ui-fg-base">
          Already have an account?
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-0.5">
          Sign in for a better experience.
        </Text>
      </div>
      <LocalizedClientLink href="/account">
        <Button variant="secondary" className="h-10" data-testid="sign-in-button">
          Sign in
        </Button>
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
