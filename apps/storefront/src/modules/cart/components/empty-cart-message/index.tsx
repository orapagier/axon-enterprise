import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 py-20 px-6 flex flex-col items-center text-center"
      data-testid="empty-cart-message"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ui-fg-subtle">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <Heading
        level="h1"
        className="text-xl font-semibold text-ui-fg-base"
      >
        Your cart is empty
      </Heading>
      <Text className="text-ui-fg-subtle mt-2 mb-6 max-w-[24rem]">
        You don&apos;t have anything in your cart yet. Browse our products and
        add something fresh!
      </Text>
      <InteractiveLink href="/store">Explore products</InteractiveLink>
    </div>
  )
}

export default EmptyCartMessage
