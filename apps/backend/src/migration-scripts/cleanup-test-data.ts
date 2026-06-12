/**
 * One-off test-data purge (2026-06-12, founder-approved):
 *
 *   - KEEPS only the three real accounts: orapajelmar@gmail.com,
 *     funchamheart@gmail.com, escuderohazelmae@gmail.com. Every other
 *     customer (synthetic *.local / *.mfh / example.com fixtures and the
 *     remaining Gmail test signups) is removed the same way the
 *     self-service DELETE /store/customers/me/account does it:
 *     producer catalog retired, rider record soft-deleted (COD ledger
 *     traceability), auth identities hard-deleted, module links removed,
 *     customer row hard-deleted.
 *   - Deletes the 4 live test products (Potato + 3 Bananas by
 *     orapagier@gmail.com) via the core workflow and hard-deletes all
 *     their listing rows, plus the orphaned listing left by the
 *     soft-deleted "Sweet Mangoes (Test5)".
 *   - Soft-deletes every order placed by a removed account (and guest
 *     test checkouts with no email) so they stop cluttering the admin;
 *     rows stay in the DB for ledger traceability.
 *
 * Idempotent: re-running skips anything already gone.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/cleanup-test-data.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { LISTING_MODULE } from "../modules/listing"
import type ListingModuleService from "../modules/listing/service"

const KEEP_EMAILS = new Set([
  "orapajelmar@gmail.com",
  "funchamheart@gmail.com",
  "escuderohazelmae@gmail.com",
])

// Listing row orphaned by the already-soft-deleted "Sweet Mangoes (Test5)".
const EXTRA_LISTING_IDS = ["01KSGK1B104C7B5PY3NPV0JM20"]

export default async function cleanupTestData({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const authModule = container.resolve(Modules.AUTH)
  const orderModule = container.resolve(Modules.ORDER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const riderService: RiderModuleService = container.resolve(RIDER_MODULE)
  const listingService: ListingModuleService = container.resolve(LISTING_MODULE)

  // withDeleted so the already-soft-deleted fixtures get purged too.
  const customers = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email"], withDeleted: true }
  )

  const doomed = customers.filter(
    (c) => !KEEP_EMAILS.has((c.email ?? "").toLowerCase())
  )
  console.log(
    `Keeping ${customers.length - doomed.length} customers, removing ${doomed.length}.`
  )

  // ----- 1. Retire every doomed customer's producer catalog -----
  const doomedIds = new Set(doomed.map((c) => c.id))
  const productIds: string[] = []
  const listingIds: string[] = [...EXTRA_LISTING_IDS]

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
    console.log(`Deleted ${productIds.length} products: ${productIds.join(", ")}`)
  }

  // ----- 2. Per-customer teardown (same recipe as the account-delete route) -----
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

  // ----- 3. Soft-delete test orders (removed accounts + guest test checkouts) -----
  const orders = await orderModule.listOrders(
    {},
    { take: 1000, select: ["id", "email", "display_id"] }
  )
  const testOrders = orders.filter((o) => {
    const email = (o.email ?? "").toLowerCase()
    return !email || doomedEmails.has(email)
  })
  if (testOrders.length) {
    await orderModule.softDeleteOrders(testOrders.map((o) => o.id))
    console.log(
      `Soft-deleted ${testOrders.length} test orders: ${testOrders
        .map((o) => `#${o.display_id}`)
        .join(", ")}`
    )
  }

  console.log("Cleanup done.")
}
