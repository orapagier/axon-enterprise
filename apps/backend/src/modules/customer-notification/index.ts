import CustomerNotificationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

// NOTE: not "notification" — that key belongs to Medusa's core notification
// module (the Resend email provider). This is the customer-facing in-app inbox.
export const CUSTOMER_NOTIFICATION_MODULE = "customer_notification"

export default Module(CUSTOMER_NOTIFICATION_MODULE, {
  service: CustomerNotificationModuleService,
})
