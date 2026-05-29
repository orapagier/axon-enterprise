import { addToCartWorkflow } from "@medusajs/core-flows"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Overrides Medusa's core POST /store/carts/:id/line-items.
 *
 * FreshHub delivers outside Medusa's fulfillment system (the chosen tier + fee
 * live in cart.metadata, see /store/delivery-options), so we never attach a
 * Medusa shipping method. Items default to requires_shipping=true, which makes
 * completeCartWorkflow reject every order ("No shipping method selected but the
 * cart contains items that require shipping."). Forcing requires_shipping=false
 * on each added line item opts the cart out of that validation while leaving
 * delivery handling to the dispatch system.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.validatedBody ?? req.body) as {
    variant_id: string
    quantity: number
    metadata?: Record<string, unknown> | null
  }

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      items: [
        {
          variant_id: body.variant_id,
          quantity: body.quantity,
          metadata: body.metadata ?? undefined,
          requires_shipping: false,
        },
      ],
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: req.queryConfig?.fields ?? ["id", "items.*"],
    filters: { id: req.params.id },
  })

  res.status(200).json({ cart: data[0] })
}
