import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-white relative flex flex-col min-h-screen">
      <Nav />
      <div className="relative flex-1" data-testid="checkout-container">
        {children}
      </div>
      <Footer />
    </div>
  )
}
