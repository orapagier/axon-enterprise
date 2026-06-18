import type { ExecArgs } from "@medusajs/framework/types"
import { CUSTOMER_NOTIFICATION_MODULE } from "../modules/customer-notification"
import type CustomerNotificationModuleService from "../modules/customer-notification/service"

/**
 * Throwaway smoke test for the in-app notification module/service against the
 * live DB. Run: `npx medusa exec ./src/scripts/verify-customer-notification.ts`
 * Cleans up after itself.
 */
export default async function ({ container }: ExecArgs) {
  const svc: CustomerNotificationModuleService = container.resolve(
    CUSTOMER_NOTIFICATION_MODULE
  )
  const customerId = `cus_verify_${Date.now()}`
  let pass = 0
  const fail: string[] = []
  const check = (cond: boolean, label: string) =>
    cond ? pass++ : fail.push(label)

  // create
  const created = await svc.createCustomerNotifications({
    customer_id: customerId,
    type: "order",
    title: "Verify title",
    body: "Verify body",
    url: "/account/orders",
    tag: `order-verify-${customerId}`,
  })
  const id = (created as { id: string }).id
  check(!!id, "create returns id")

  // tag de-dupe: second create with same tag via the helper path would update;
  // here we just confirm the unread+tag filter finds the row.
  const [byTag] = await svc.listCustomerNotifications(
    { customer_id: customerId, tag: `order-verify-${customerId}`, read_at: null },
    { take: 1, select: ["id"] }
  )
  check(!!byTag && byTag.id === id, "unread+tag lookup finds the row")

  // list + unread count
  const [, unread] = await svc.listAndCountCustomerNotifications(
    { customer_id: customerId, read_at: null },
    { take: 1 }
  )
  check(unread === 1, `unread count is 1 (got ${unread})`)

  // mark read
  await svc.updateCustomerNotifications({ id, read_at: new Date() })
  const [, unreadAfter] = await svc.listAndCountCustomerNotifications(
    { customer_id: customerId, read_at: null },
    { take: 1 }
  )
  check(unreadAfter === 0, `unread count after read is 0 (got ${unreadAfter})`)

  // cleanup
  await svc.deleteCustomerNotifications([id])
  const [, total] = await svc.listAndCountCustomerNotifications(
    { customer_id: customerId },
    { take: 1 }
  )
  check(total === 0, `cleaned up (got ${total})`)

  console.log(
    `\n[verify-customer-notification] ${pass} passed, ${fail.length} failed`
  )
  if (fail.length) {
    console.log("FAILED:\n - " + fail.join("\n - "))
    process.exitCode = 1
  }
}
