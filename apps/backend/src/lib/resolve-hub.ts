import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"

/**
 * Hub resolution for delivery (Phase F, reframed 2026-06-11).
 *
 * Founder decision: hubs are deliberately per-CITY (a hub/store per barangay is
 * unaffordable) and ALL operations are local to a hub — Tagum Hub only
 * processes Tagum City. So the city IS the service boundary; barangays matter
 * only inside a hub's city (delivery fee table, service areas). Address→hub
 * resolution by barangay/postal across hubs is intentionally NOT built.
 *
 * Resolution rule:
 *  1. A logged-in customer with a home hub gets THAT hub — and their shipping
 *     address must be inside the hub's city, otherwise the request is
 *     rejected. (Without this, a customer could be quoted another city's fees
 *     while dispatch — which keys off the home-hub link — still put the order
 *     on their home hub's batch.)
 *  2. Guests / customers without a home hub fall back to matching an active
 *     hub by the address city.
 */

type Hub = Awaited<ReturnType<HubModuleService["listHubs"]>>[number]

export function normalizeCity(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s*city$/i, "")
    .trim()
}

export function cityMatchesHub(
  addressCity: string | null | undefined,
  hubCity: string | null | undefined
): boolean {
  const a = normalizeCity(addressCity)
  return a.length > 0 && a === normalizeCity(hubCity)
}

export type HubResolution =
  | { ok: true; hub: Hub; source: "home_hub" | "city_match" }
  | { ok: false; status: number; error: string; hint?: string }

export async function resolveHubForDelivery(
  container: MedusaContainer,
  args: { customerId: string | null; city: string | null | undefined }
): Promise<HubResolution> {
  const hubService: HubModuleService = container.resolve(HUB_MODULE)

  if (args.customerId) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "hub.id"],
      filters: { id: args.customerId },
    })
    const linkedHubId = (
      data[0] as { hub?: { id: string } | null } | undefined
    )?.hub?.id

    if (linkedHubId) {
      const [hub] = await hubService.listHubs(
        { id: linkedHubId, active: true },
        { take: 1 }
      )
      if (hub) {
        if (!cityMatchesHub(args.city, hub.city)) {
          return {
            ok: false,
            status: 400,
            error: `${hub.name} delivers within ${hub.city} only — this address (${
              args.city || "no city"
            }) is outside your hub's service area.`,
          }
        }
        return { ok: true, hub, source: "home_hub" }
      }
      // linked hub is inactive/gone — fall through to city matching
    }
  }

  const allHubs = await hubService.listHubs({ active: true }, { take: 100 })
  const hub = allHubs.find((h) => cityMatchesHub(args.city, h.city))
  if (!hub) {
    return {
      ok: false,
      status: 404,
      error: "no hub serves this address",
      hint: "/partner-hub",
    }
  }
  return { ok: true, hub, source: "city_match" }
}
