/**
 * Runtime verification for the in-app customer notification inbox (header bell +
 * /account/notifications) against the LIVE database.
 *
 * What a unit test can't prove and this does:
 *   1. the `customer_notification` module LOADS + its table is migrated (we
 *      create/list/update/delete real rows);
 *   2. `notifyCustomer()` persists an inbox row;
 *   3. the tag-collapse path works: a second `notifyCustomer()` with the same
 *      (customer_id, tag) UPDATES the existing UNREAD row in place instead of
 *      stacking a duplicate (one row, latest title/body);
 *   4. once the row is READ, a same-tag notify no longer collapses — it creates
 *      a fresh unread row (the partial-unique index is read_at IS NULL);
 *   5. the list/count + mark-read flows the store API relies on behave.
 *
 * Creates rows under a throwaway customer_id, asserts, hard-deletes them. Safe
 * to run repeatedly.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-customer-notification.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyCustomer } from "../lib/notify-customer"
import { CUSTOMER_NOTIFICATION_MODULE } from "../modules/customer-notification"
import type CustomerNotificationModuleService from "../modules/customer-notification/service"

export default async function verifyCustomerNotification({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: CustomerNotificationModuleService = container.resolve(
    CUSTOMER_NOTIFICATION_MODULE
  )

  const customerId = `verify-notif-${Date.now()}`
  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) {
      pass++
      logger.info(`  ✓ ${name}`)
    } else {
      fail++
      logger.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`)
    }
  }

  const listAll = () =>
    service.listCustomerNotifications(
      { customer_id: customerId },
      { order: { created_at: "DESC" } }
    ) as Promise<
      {
        id: string
        title: string
        body: string
        tag: string | null
        read_at: Date | null
        created_at: Date
      }[]
    >

  try {
    // 1. notifyCustomer persists an inbox row.
    await notifyCustomer(container, {
      customerId,
      type: "order",
      title: "Order received",
      body: "first",
      url: "/account/orders",
      tag: "order-XYZ",
    })
    let rows = await listAll()
    check("notifyCustomer persists one row", rows.length === 1, `got ${rows.length}`)
    const firstCreatedAt = new Date(rows[0]?.created_at).getTime()

    // Make sure a real-clock gap exists so the refreshed created_at is provably
    // newer (created_at resolution is sub-second but not zero).
    await new Promise((r) => setTimeout(r, 1100))

    // 2. Same (customer, tag) while UNREAD collapses — still one row, updated to
    //    the latest title/body, and (after the fix) carrying a FRESH created_at
    //    so it bubbles to the top of the inbox instead of keeping a stale time.
    await notifyCustomer(container, {
      customerId,
      type: "delivery",
      title: "Out for delivery",
      body: "second",
      url: "/account/orders",
      tag: "order-XYZ",
    })
    rows = await listAll()
    check(
      "same-tag unread collapses (no duplicate)",
      rows.length === 1,
      `got ${rows.length}`
    )
    check(
      "collapsed row shows latest title/body",
      rows[0]?.title === "Out for delivery" && rows[0]?.body === "second",
      `title=${rows[0]?.title} body=${rows[0]?.body}`
    )
    check(
      "collapsed row refreshes created_at (bubbles to top)",
      new Date(rows[0]?.created_at).getTime() > firstCreatedAt,
      `before=${firstCreatedAt} after=${new Date(rows[0]?.created_at).getTime()}`
    )

    // 3. Mark the row read (what GET /store/notifications/:id does on open).
    await service.updateCustomerNotifications({
      id: rows[0].id,
      read_at: new Date(),
    })
    const [, unreadCount] = await service.listAndCountCustomerNotifications(
      { customer_id: customerId, read_at: null },
      { take: 1 }
    )
    check("mark-read clears unread count", unreadCount === 0, `unread=${unreadCount}`)

    // 4. Once READ, the same tag must NOT collapse — it starts a fresh unread
    //    row (the collapse only targets unread rows).
    await notifyCustomer(container, {
      customerId,
      type: "order",
      title: "Delivered",
      body: "third",
      url: "/account/orders",
      tag: "order-XYZ",
    })
    rows = await listAll()
    check(
      "same-tag after read creates a fresh row",
      rows.length === 2,
      `got ${rows.length}`
    )
    const [, unreadAfter] = await service.listAndCountCustomerNotifications(
      { customer_id: customerId, read_at: null },
      { take: 1 }
    )
    check("fresh row is unread", unreadAfter === 1, `unread=${unreadAfter}`)

    // 5. A tagless notify always stacks (generic notices never collapse).
    await notifyCustomer(container, {
      customerId,
      title: "Generic A",
      body: "a",
    })
    await notifyCustomer(container, {
      customerId,
      title: "Generic B",
      body: "b",
    })
    rows = await listAll()
    check("tagless notifications stack", rows.length === 4, `got ${rows.length}`)
  } catch (err) {
    fail++
    logger.error(`  ✗ threw: ${(err as Error).message}`)
  } finally {
    // Cleanup — hard delete every row we created.
    const rows = await listAll().catch(() => [])
    if (rows.length) {
      await service.deleteCustomerNotifications(rows.map((r) => r.id))
    }
    const leftover = await listAll().catch(() => [])
    check("cleanup removed all test rows", leftover.length === 0, `left ${leftover.length}`)
  }

  logger.info(`\ncustomer-notification verification: ${pass} passed, ${fail} failed`)
  if (fail > 0) {
    throw new Error(`customer-notification verification FAILED (${fail} failures)`)
  }
}
