/**
 * Full user purge (founder-approved reset). Removes EVERY user from the
 * backend — there is no keep list. Mirrors the proven teardown recipe in
 * cleanup-test-data.ts and the self-service DELETE /store/customers/me/account:
 *
 *   - Producer catalog (products + listing rows) for every customer is retired.
 *   - Rider records are SOFT-deleted (not hard) so the existing COD ledger
 *     (cod_transaction) and dispatch_order rows keep a traceable rider_id.
 *     They disappear from the admin Riders page (which filters deleted_at IS NULL).
 *   - Auth identities (OTP / Google / emailpass) are hard-deleted so the login
 *     is gone.
 *   - Module links for each customer are removed, then the customer row is
 *     hard-deleted. "Producer" and "membership" are customer.metadata, so they
 *     go with the customer.
 *   - Orders placed by any removed account (i.e. all of them) are soft-deleted
 *     so they stop cluttering the admin while staying in the DB for ledger
 *     traceability.
 *
 * This does NOT touch the admin `user` table — admin logins are separate from
 * storefront customers.
 *
 * Idempotent: re-running skips anything already gone.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/purge-all-users.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { LISTING_MODULE } from "../modules/listing"
import type ListingModuleService from "../modules/listing/service"

export default async function purgeAllUsers({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const authModule = container.resolve(Modules.AUTH)
  const orderModule = container.resolve(Modules.ORDER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const riderService: RiderModuleService = container.resolve(RIDER_MODULE)
  const listingService: ListingModuleService = container.resolve(LISTING_MODULE)

  // withDeleted so already-soft-deleted fixtures get fully purged too.
  const doomed = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email"], withDeleted: true }
  )
  console.log(`Removing ${doomed.length} customers (no keep list).`)

  // ----- 1. Retire every customer's producer catalog -----
  const doomedIds = new Set(doomed.map((c) => c.id))
  const productIds: string[] = []
  const listingIds: string[] = []

  const PAGE_SIZE = 200
  for (let page = 0; page < 50; page++) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "product_listing.id"],
      pagination: { take: PAGE_SIZE, skip: page * PAGE_SIZE },
    })
    const batch = data ?? []
    for (const p of batch) {
      const seller = (p as { metadata?: Record<string, unknown> }).metadata
        ?.seller_customer_id
      if (typeof seller !== "string" || !doomedIds.has(seller)) continue
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
    await listingService
      .deleteProductListings(listingIds)
      .catch((e) => console.error("Listing delete failed:", e.message))
    console.log(`Deleted ${listingIds.length} listing rows.`)
  }
  if (productIds.length) {
    await deleteProductsWorkflow(container)
      .run({ input: { ids: productIds } })
      .catch((e) => console.error("Product delete failed:", e.message))
    console.log(`Deleted ${productIds.length} products.`)
  }

  // ----- 2. Per-customer teardown -----
  const doomedEmails = new Set<string>()
  for (const c of doomed) {
    const email = (c.email ?? "").toLowerCase()
    if (email) doomedEmails.add(email)

    if (email) {
      const riders = await riderService.listRiders({ email }, { take: 10 })
      if (riders.length) {
        await riderService.softDeleteRiders(riders.map((r) => r.id))
        console.log(`  rider soft-deleted for ${email}`)
      }

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
    }

    await link
      .delete({ [Modules.CUSTOMER]: { customer_id: c.id } })
      .catch((e) => console.error(`  link cleanup failed for ${email}:`, e.message))
    await customerModule.deleteCustomers(c.id)
    console.log(`  removed ${email || c.id}`)
  }

  // ----- 3. Soft-delete any remaining live orders (all belong to removed users) -----
  const orders = await orderModule.listOrders(
    {},
    { take: 1000, select: ["id", "email", "display_id"] }
  )
  if (orders.length) {
    await orderModule.softDeleteOrders(orders.map((o) => o.id))
    console.log(`Soft-deleted ${orders.length} orders.`)
  }

  // ----- 4. Sweep any rider rows left without a matching customer -----
  const leftoverRiders = await riderService.listRiders({}, { take: 1000 })
  if (leftoverRiders.length) {
    await riderService.softDeleteRiders(leftoverRiders.map((r) => r.id))
    console.log(`Soft-deleted ${leftoverRiders.length} leftover rider rows.`)
  }

  console.log("User purge done.")
}
