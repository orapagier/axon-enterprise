import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import OtcPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [OtcPaymentProviderService],
})
