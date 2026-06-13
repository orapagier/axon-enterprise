import { MedusaService } from "@medusajs/framework/utils"
import PushSubscription from "./models/push-subscription"

class PushNotificationModuleService extends MedusaService({
  PushSubscription,
}) {}

export default PushNotificationModuleService
