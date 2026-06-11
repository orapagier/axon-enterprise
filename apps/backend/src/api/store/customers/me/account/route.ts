import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"
import { LISTING_MODULE } from "../../../../../modules/listing"
import type ListingModuleService from "../../../../../modules/listing/service"

/**
 * DELETE /store/customers/me/account — permanent, irreversible account
 * deletion, requested by the customer themself.
 *
 * What it removes:
 *   1. Producer catalog: every product carrying this customer in
 *      `metadata.seller_customer_id` (soft-deleted via the core workflow so
 *      order line items keep their denormalized data), and their listing rows
 *      are marked "cancelled".
 *   2. Rider record matching the customer's email (soft delete — the row must
 *      stay reachable for COD cash traceability, but the rider can no longer
 *      log in or appear in dispatch).
 *   3. Every auth identity tied to the email (the derived emailpass credential
 *      that backs both OTP and Google sign-in), so no rail can mint a session
 *      for this account again.
 *   4. The customer record itself — a HARD delete. Orders are kept (they
 *      denormalize email/address) for accounting, but they no longer resolve
 *      to a customer.
 *
 * Body must echo `{ confirm: <account email> }` so a stray DELETE from a
 * stale tab or script can't wipe an account by accident.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule
    .retrieveCustomer(customerId, { select: ["id", "email"] })
    .catch(() => null)
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }

  const email = (customer.email ?? "").toLowerCase()
  const confirm = String(
    (req.body as { confirm?: string } | undefined)?.confirm ?? ""
  )
    .trim()
    .toLowerCase()
  if (!email || confirm !== email) {
    res.status(400).json({
      error: "Confirmation does not match the account email.",
      code: "CONFIRM_MISMATCH",
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  // ----- 1. Retire the producer catalog (if any) -----
  // Products carry their seller in `metadata.seller_customer_id` (no queryable
  // link yet — see the TODO in /store/seller/products), so page through the
  // catalog the same way that route does.
  const PAGE_SIZE = 200
  const MAX_PAGES = 50
  const productIds: string[] = []
  const listingIds: string[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "product_listing.id"],
      pagination: { take: PAGE_SIZE, skip: page * PAGE_SIZE },
    })
    const batch = data ?? []
    for (const p of batch) {
      const meta = (p as { metadata?: Record<string, unknown> }).metadata
      if (meta?.seller_customer_id !== customerId) continue
      productIds.push((p as { id: string }).id)
      const rawListing = (p as { product_listing?: unknown }).product_listing
      const listing = (
        Array.isArray(rawListing) ? rawListing[0] : rawListing
      ) as { id?: string } | undefined
      if (listing?.id) listingIds.push(listing.id)
    }
    if (batch.length < PAGE_SIZE) break
  }

  if (listingIds.length) {
    const listingService: ListingModuleService =
      req.scope.resolve(LISTING_MODULE)
    await listingService
      .updateProductListings(
        listingIds.map((id) => ({ id, status: "cancelled" as const }))
      )
      .catch((e) => console.error("Listing cancel failed:", e))
  }
  if (productIds.length) {
    await deleteProductsWorkflow(req.scope)
      .run({ input: { ids: productIds } })
      .catch((e) => console.error("Seller product cleanup failed:", e))
  }

  // ----- 2. Soft-delete any rider record on this email -----
  const riderService: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const riders = await riderService.listRiders({ email }, { take: 10 })
  if (riders.length) {
    await riderService.softDeleteRiders(riders.map((r) => r.id))
  }

  // ----- 3. Delete every auth identity for this email -----
  // OTP and Google sign-in both funnel into one derived emailpass identity
  // whose provider entity_id is the email, but sweep all providers to be safe.
  const authModule = req.scope.resolve(Modules.AUTH)
  const providerIdentities = await authModule.listProviderIdentities(
    { entity_id: email },
    { select: ["id", "auth_identity_id"] }
  )
  const authIdentityIds = [
    ...new Set(
      providerIdentities
        .map((p) => p.auth_identity_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  if (authIdentityIds.length) {
    await authModule.deleteAuthIdentities(authIdentityIds)
  }

  // ----- 4. Hard-delete the customer + its cross-module links -----
  // `link.delete` removes every link row that references this customer
  // (home hub, etc.) so nothing dangles after the hard delete.
  await link
    .delete({ [Modules.CUSTOMER]: { customer_id: customerId } })
    .catch((e) => console.error("Customer link cleanup failed:", e))
  await customerModule.deleteCustomers(customerId)

  res.json({ deleted: true })
}
