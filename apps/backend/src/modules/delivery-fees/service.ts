import { MedusaService } from "@medusajs/framework/utils"
import HubBarangayFee from "./models/hub-barangay-fee"

class DeliveryFeesModuleService extends MedusaService({
  HubBarangayFee,
}) {
  async retrieveByHubBarangay(
    hubId: string,
    barangay: string
  ): Promise<{ standard_fee_php: number; special_fee_php: number } | null> {
    const rows = await this.listHubBarangayFees({
      hub_id: hubId,
      barangay,
      active: true,
    })
    const row = rows[0]
    if (!row) return null
    return {
      standard_fee_php: row.standard_fee_php,
      special_fee_php: row.special_fee_php,
    }
  }
}

export default DeliveryFeesModuleService
