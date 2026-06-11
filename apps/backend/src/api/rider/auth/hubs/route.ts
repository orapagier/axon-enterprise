import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../modules/hub"
import type HubModuleService from "../../../../modules/hub/service"

/**
 * GET /rider/auth/hubs — active hubs for the rider signup form's hub picker
 * (public; exempted inside authenticateRider). Lives under /rider/auth/*
 * instead of reusing /store/hubs because store routes require a publishable
 * API key the rider PWA doesn't carry.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubs: HubModuleService = req.scope.resolve(HUB_MODULE)
  const list = await hubs.listHubs({ active: true }, { take: 100 })
  res.json({
    hubs: list.map((h) => ({ id: h.id, name: h.name, city: h.city })),
  })
}
