/**
 * Seeds placeholder delivery fees for all 23 Tagum City barangays.
 *
 * IMPORTANT: These fees are PLACEHOLDERS for development. The hub owner is
 * expected to overwrite them through the admin "Barangay fees" page once
 * they know the local round-trip tricycle/habal-habal rates.
 *
 * Idempotent: re-running skips barangays that already have a row for the
 * Tagum hub. To force-reset, delete the rows in admin first.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/seed-barangay-fees-tagum.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"
import { DELIVERY_FEES_MODULE } from "../modules/delivery-fees"
import type DeliveryFeesModuleService from "../modules/delivery-fees/service"

type FeeRow = {
  barangay: string
  standard_fee_php: number
  special_fee_php: number
}

// Coarse 3-tier placeholder pricing based on rough geography. The hub owner
// edits these in admin once they have actual fare data.
const TAGUM_FEES: FeeRow[] = [
  // Central — near city proper, lowest fare
  { barangay: "Magugpo Poblacion", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Magugpo East", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Magugpo North", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Magugpo South", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Magugpo West", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Visayan Village", standard_fee_php: 40, special_fee_php: 120 },
  { barangay: "Mankilam", standard_fee_php: 40, special_fee_php: 120 },
  // Mid
  { barangay: "Apokon", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "La Filipina", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "Madaum", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "San Agustin", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "Pandapan", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "Canocotan", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "Cuambogan", standard_fee_php: 60, special_fee_php: 160 },
  { barangay: "Bincungan", standard_fee_php: 60, special_fee_php: 160 },
  // Outer
  { barangay: "Busaon", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "Liboganon", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "Magdum", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "New Balamban", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "Nueva Fuerza", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "Pagsabangan", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "San Isidro", standard_fee_php: 90, special_fee_php: 220 },
  { barangay: "San Miguel", standard_fee_php: 90, special_fee_php: 220 },
]

export default async function seedBarangayFeesTagum({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const hubService: HubModuleService = container.resolve(HUB_MODULE)
  const feesService: DeliveryFeesModuleService =
    container.resolve(DELIVERY_FEES_MODULE)

  const hub = (await hubService.listHubs({ slug: "tagumcityhub" }, { take: 1 }))[0]
  if (!hub) {
    logger.error(
      "Tagum hub not found. Run seed-hubs.ts first, then re-run this seed."
    )
    return
  }

  const existing = await feesService.listHubBarangayFees(
    { hub_id: hub.id },
    { take: 1000 }
  )
  const haveBarangay = new Set(existing.map((r) => r.barangay))

  const toInsert = TAGUM_FEES.filter((row) => !haveBarangay.has(row.barangay))
  if (toInsert.length === 0) {
    logger.info(
      `All ${TAGUM_FEES.length} Tagum barangay fees already seeded — skipping.`
    )
    return
  }

  await feesService.createHubBarangayFees(
    toInsert.map((row) => ({
      hub_id: hub.id,
      barangay: row.barangay,
      standard_fee_php: row.standard_fee_php,
      special_fee_php: row.special_fee_php,
      active: true,
    }))
  )
  logger.info(
    `Seeded ${toInsert.length} Tagum barangay fees (placeholders — hub owner should overwrite in admin).`
  )
}
