import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import GcashPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [GcashPaymentProviderService],
})
