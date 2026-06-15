import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"

/**
 * GET /admin/hubs — list all hubs with their areas
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const hubs = await hubService.listHubs(
    {},
    {
      relations: ["areas"],
    }
  )

  res.json({ hubs, count: hubs.length })
}

/**
 * POST /admin/hubs — create a new hub
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = req.body as {
    name?: string
    slug?: string
    city?: string
    province?: string
    country?: string
    active?: boolean
    dispatch_cutoff?: string
    dispatch_time?: string
    delivery_open?: string
    delivery_close?: string
    timezone?: string
  }

  if (!body.name || !body.slug || !body.city || !body.province) {
    res.status(400).json({
      error: "name, slug, city, and province are required",
    })
    return
  }

  // Check for duplicate slug
  const existing = await hubService.listHubs({ slug: body.slug })
  if (existing.length > 0) {
    res.status(409).json({
      error: `Hub with slug "${body.slug}" already exists`,
    })
    return
  }

  const hub = await hubService.createHubs({
    name: body.name,
    slug: body.slug.toLowerCase(),
    city: body.city,
    province: body.province,
    country: (body.country ?? "ph").toLowerCase(),
    active: body.active ?? true,
    dispatch_cutoff: body.dispatch_cutoff ?? "12:00",
    dispatch_time: body.dispatch_time ?? "16:00",
    delivery_open: body.delivery_open ?? "06:00",
    delivery_close: body.delivery_close ?? "18:00",
    timezone: body.timezone ?? "Asia/Manila",
  })

  res.status(201).json({ hub })
}