import PushNotificationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PUSH_NOTIFICATION_MODULE = "push_notification"

export default Module(PUSH_NOTIFICATION_MODULE, {
  service: PushNotificationModuleService,
})
