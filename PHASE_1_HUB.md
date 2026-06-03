# Phase 1 — Hub Module (Implementation-Grade Spec)

Read `IMPLEMENTATION_PLAN.md` first for context. This document drills into Phase 1 only. Follow file paths exactly. Where code is shown, treat it as the contract — names, signatures, conventions are decided.

---

## Goal

Add a first-class `Hub` entity to the backend so every product, producer, and consumer can be bound to a hub. The Tagum City Hub is the only hub at launch, but the model must already support multiple. Consumers see only their hub's catalog.

This phase is the foundation for Phases 2–6 — do not shortcut it.

---

## Deliverables

1. New Medusa custom module `hub` with `Hub` and `HubArea` entities.
2. Module migration creating the two tables.
3. Two link definitions: `customer ↔ hub` and `product ↔ hub`.
4. `medusa-config.ts` updated to register the module + links.
5. Admin REST API: `GET/POST/PATCH /admin/hubs`, `GET/POST/DELETE /admin/hubs/:id/areas`.
6. Store REST API: `GET /store/hubs`, `GET /store/hubs/:slug`.
7. Admin UI page at `/app/hubs` (Medusa admin route).
8. Storefront hub picker modal + cookie + middleware hub resolution.
9. Storefront account page section to change home hub.
10. Idempotent seed script for the Tagum City Hub.
11. Backward-compatible: existing products without a hub stay visible to admin but are filtered out of the public storefront until assigned.

---

## File map

Create these files. Paths are relative to the repo root.

```
apps/backend/
├── medusa-config.ts                                       # MODIFY: register module + links
├── src/
│   ├── modules/
│   │   └── hub/
│   │       ├── index.ts                                   # NEW: module export
│   │       ├── service.ts                                 # NEW: HubModuleService
│   │       ├── models/
│   │       │   ├── hub.ts                                 # NEW
│   │       │   └── hub-area.ts                            # NEW
│   │       └── migrations/
│   │           └── Migration<timestamp>.ts                # NEW: generated via medusa db:generate
│   ├── links/
│   │   ├── customer-hub.ts                                # NEW
│   │   └── product-hub.ts                                 # NEW
│   ├── api/
│   │   ├── admin/
│   │   │   └── hubs/
│   │   │       ├── route.ts                               # NEW: GET, POST
│   │   │       ├── [id]/
│   │   │       │   └── route.ts                           # NEW: GET, PATCH, DELETE
│   │   │       └── [id]/areas/
│   │   │           ├── route.ts                           # NEW: GET, POST
│   │   │           └── [areaId]/route.ts                  # NEW: PATCH, DELETE
│   │   └── store/
│   │       └── hubs/
│   │           ├── route.ts                               # NEW: GET (public list)
│   │           └── [slug]/route.ts                        # NEW: GET (public detail)
│   ├── admin/
│   │   └── routes/
│   │       └── hubs/
│   │           └── page.tsx                               # NEW: admin UI
│   └── migration-scripts/
│       └── seed-hubs.ts                                   # NEW: seed Tagum

apps/storefront/
├── src/
│   ├── middleware.ts                                      # MODIFY: add hub cookie resolution
│   ├── modules/
│   │   ├── hub/
│   │   │   ├── components/
│   │   │   │   ├── hub-picker-modal.tsx                   # NEW: first-visit modal
│   │   │   │   ├── hub-badge.tsx                          # NEW: small inline display
│   │   │   │   └── hub-switcher.tsx                       # NEW: nav-bar / account control
│   │   │   ├── actions/
│   │   │   │   └── set-hub.ts                             # NEW: server action setting cookie
│   │   │   └── data/
│   │   │       └── hubs.ts                                # NEW: fetch list of hubs
│   │   └── account/
│   │       └── components/
│   │           └── home-hub-section.tsx                   # NEW: account page widget
│   └── app/
│       └── [countryCode]/
│           └── (main)/
│               └── store/
│                   └── page.tsx                           # MODIFY: filter by hub cookie
```

---

## 1. Module: data model

### `apps/backend/src/modules/hub/models/hub.ts`

```ts
import { model } from "@medusajs/framework/utils"
import { HubArea } from "./hub-area"

export const Hub = model.define("hub", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  city: model.text(),
  province: model.text(),
  country: model.text().default("ph"),
  timezone: model.text().default("Asia/Manila"),
  dispatch_cutoff: model.text().default("12:00"), // HH:mm local time
  dispatch_time: model.text().default("16:00"),
  active: model.boolean().default(true),
  areas: model.hasMany(() => HubArea),
})
```

### `apps/backend/src/modules/hub/models/hub-area.ts`

```ts
import { model } from "@medusajs/framework/utils"
import { Hub } from "./hub"

export const HubArea = model.define("hub_area", {
  id: model.id().primaryKey(),
  name: model.text(),
  postal_codes: model.array(),  // string[] of PH postal codes covered
  barangays: model.array(),     // string[] of barangay names
  pickup_day_of_week: model.array(), // int[] 0=Sun..6=Sat — for Phase 3
  hub: model.belongsTo(() => Hub, { mappedBy: "areas" }),
})
```

### `apps/backend/src/modules/hub/service.ts`

```ts
import { MedusaService } from "@medusajs/framework/utils"
import { Hub } from "./models/hub"
import { HubArea } from "./models/hub-area"

class HubModuleService extends MedusaService({
  Hub,
  HubArea,
}) {}

export default HubModuleService
```

### `apps/backend/src/modules/hub/index.ts`

```ts
import { Module } from "@medusajs/framework/utils"
import HubModuleService from "./service"

export const HUB_MODULE = "hub"

export default Module(HUB_MODULE, {
  service: HubModuleService,
})
```

### Generate migration

After writing models:

```bash
cd apps/backend
npx medusa db:generate hub
npx medusa db:migrate
```

`db:generate` writes `apps/backend/src/modules/hub/migrations/Migration<timestamp>.ts`. Commit the generated file as-is — do not hand-edit.

---

## 2. Links: customer ↔ hub, product ↔ hub

Medusa v2 forbids cross-module foreign keys. Use module links.

### `apps/backend/src/links/customer-hub.ts`

```ts
import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import HubModule from "../modules/hub"

export default defineLink(
  CustomerModule.linkable.customer,
  HubModule.linkable.hub
)
```

### `apps/backend/src/links/product-hub.ts`

```ts
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import HubModule from "../modules/hub"

export default defineLink(
  ProductModule.linkable.product,
  HubModule.linkable.hub
)
```

Both are one-to-one from the consumer's perspective (a customer / product belongs to exactly one hub). Medusa creates a join table; query via `query.graph({ entity: "customer", fields: ["hub.*"] })`.

After adding link files, run:

```bash
npx medusa db:migrate
```

Medusa auto-generates link migrations.

---

## 3. Register in `medusa-config.ts`

Modify `apps/backend/medusa-config.ts` to register the module:

```ts
import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "./src/modules/hub",
    },
  ],
})
```

Links in `src/links/` are auto-discovered — no config entry needed.

---

## 4. Admin API

### `apps/backend/src/api/admin/hubs/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const hubs = await hubModule.listHubs({}, { relations: ["areas"], take: 100 })
  res.json({ hubs, count: hubs.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const body = req.body as {
    name: string
    slug: string
    city: string
    province: string
    country?: string
    timezone?: string
    dispatch_cutoff?: string
    dispatch_time?: string
  }
  // Minimal validation — full validation via zod in a follow-up.
  if (!body?.name || !body?.slug || !body?.city || !body?.province) {
    res.status(400).json({ error: "name, slug, city, province required" })
    return
  }
  const hub = await hubModule.createHubs(body)
  res.status(201).json({ hub })
}
```

### `apps/backend/src/api/admin/hubs/[id]/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../modules/hub"
import HubModuleService from "../../../../modules/hub/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const hub = await hubModule.retrieveHub(req.params.id, {
    relations: ["areas"],
  })
  res.json({ hub })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const hub = await hubModule.updateHubs({
    id: req.params.id,
    ...(req.body as Record<string, unknown>),
  })
  res.json({ hub })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  await hubModule.deleteHubs(req.params.id)
  res.status(204).end()
}
```

### `apps/backend/src/api/admin/hubs/[id]/areas/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../../modules/hub"
import HubModuleService from "../../../../../modules/hub/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const areas = await hubModule.listHubAreas(
    { hub_id: req.params.id },
    { take: 100 }
  )
  res.json({ areas })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const body = req.body as {
    name: string
    postal_codes?: string[]
    barangays?: string[]
    pickup_day_of_week?: number[]
  }
  const area = await hubModule.createHubAreas({
    ...body,
    hub_id: req.params.id,
  })
  res.status(201).json({ area })
}
```

### `apps/backend/src/api/admin/hubs/[id]/areas/[areaId]/route.ts`

Standard PATCH and DELETE mirroring the hub `[id]/route.ts` pattern. Implement following the same shape.

### Auth middleware

Extend `apps/backend/src/api/middlewares.ts` so `/admin/hubs*` requires the user auth (matches the existing `/admin/sellers*` pattern):

```ts
{
  matcher: "/admin/hubs*",
  method: ["GET", "POST", "PATCH", "DELETE"],
  middlewares: [authenticate("user", ["session", "bearer"])],
},
```

---

## 5. Store API

### `apps/backend/src/api/store/hubs/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const hubModule = _req.scope.resolve<HubModuleService>(HUB_MODULE)
  const hubs = await hubModule.listHubs(
    { active: true },
    { relations: ["areas"], take: 100 }
  )
  res.json({ hubs })
}
```

### `apps/backend/src/api/store/hubs/[slug]/route.ts`

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../modules/hub"
import HubModuleService from "../../../../modules/hub/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const [hub] = await hubModule.listHubs(
    { slug: req.params.slug, active: true },
    { relations: ["areas"], take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "Hub not found" })
    return
  }
  res.json({ hub })
}
```

Store routes do not need auth middleware — they are public.

---

## 6. Admin UI page

### `apps/backend/src/admin/routes/hubs/page.tsx`

Mirror the structure of `apps/backend/src/admin/routes/sellers/page.tsx`. Required features:

- `defineRouteConfig({ label: "Hubs", icon: <Map /> })` (use a Medusa Icons component)
- React Query: `useQuery({ queryKey: ["hubs"], queryFn: fetchHubs })`
- Table with columns: Slug, Name, City, Active, Areas count, Cutoff, Dispatch
- "Create hub" button opens a drawer/modal form
- Row click navigates to a detail panel showing areas with add/remove buttons
- Toggle `active` via PATCH

Use `@medusajs/ui` components (Table, Button, Drawer, Input, Select, Switch, Toaster) — same set used by sellers/memberships pages.

The `// @ts-nocheck` header at the top is required (same React 19 / @types/react mismatch the existing admin pages have).

---

## 7. Seed script

### `apps/backend/src/migration-scripts/seed-hubs.ts`

```ts
/**
 * Seeds the Tagum City Hub and its initial area.
 *
 * Idempotent: re-running skips existing hub/area by slug/name.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/seed-hubs.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"

export default async function seedHubs({ container }: ExecArgs) {
  const hubModule = container.resolve<HubModuleService>(HUB_MODULE)

  const existing = await hubModule.listHubs({ slug: "tagum" }, { take: 1 })
  let hub = existing[0]

  if (!hub) {
    hub = await hubModule.createHubs({
      name: "Tagum City Hub",
      slug: "tagum",
      city: "Tagum",
      province: "Davao del Norte",
      country: "ph",
      timezone: "Asia/Manila",
      dispatch_cutoff: "12:00",
      dispatch_time: "16:00",
      active: true,
    })
    console.log("Created Tagum City Hub")
  } else {
    console.log("Tagum City Hub already exists — skipping")
  }

  const areas = await hubModule.listHubAreas({ hub_id: hub.id }, { take: 100 })
  if (!areas.find((a) => a.name === "Tagum Central")) {
    await hubModule.createHubAreas({
      hub_id: hub.id,
      name: "Tagum Central",
      postal_codes: ["8100"],
      barangays: [
        "Apokon",
        "Magugpo East",
        "Magugpo North",
        "Magugpo Poblacion",
        "Magugpo South",
        "Magugpo West",
        "Visayan Village",
      ],
      pickup_day_of_week: [2, 5], // Tuesday, Friday — placeholder
    })
    console.log("Created area: Tagum Central")
  } else {
    console.log("Area Tagum Central already exists — skipping")
  }
}
```

Run after `db:migrate`:

```bash
cd apps/backend
npx medusa exec ./src/migration-scripts/seed-hubs.ts
```

---

## 8. Storefront: hub cookie + middleware

### Cookie

- Name: `fh_hub`
- Value: hub slug, e.g. `tagum`
- Path: `/`
- Max-Age: 1 year
- HttpOnly: false (client needs to read it for UI state)
- SameSite: lax
- Secure in production

### Server action: `apps/storefront/src/modules/hub/actions/set-hub.ts`

```ts
"use server"

import { cookies } from "next/headers"

const COOKIE_NAME = "fh_hub"
const ONE_YEAR = 60 * 60 * 24 * 365

export async function setHubCookie(slug: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, slug, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function getHubCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}
```

### Data fetch: `apps/storefront/src/modules/hub/data/hubs.ts`

```ts
const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!

export type Hub = {
  id: string
  slug: string
  name: string
  city: string
  province: string
  areas: { id: string; name: string }[]
}

export async function listHubs(): Promise<Hub[]> {
  const res = await fetch(`${BACKEND_URL}/store/hubs`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_API_KEY },
    next: { revalidate: 3600, tags: ["hubs"] },
  })
  if (!res.ok) return []
  const { hubs } = await res.json()
  return hubs
}

export async function getHub(slug: string): Promise<Hub | null> {
  const res = await fetch(`${BACKEND_URL}/store/hubs/${slug}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_API_KEY },
    next: { revalidate: 3600, tags: [`hub-${slug}`] },
  })
  if (!res.ok) return null
  const { hub } = await res.json()
  return hub
}
```

### Middleware: minimal change to `apps/storefront/src/middleware.ts`

Inside the existing `middleware` function, after the region resolution that's already there, do not redirect or block — just ensure first-visitors land somewhere that triggers the hub picker on the storefront pages. Concretely:

- Do **not** add hub-required redirects in middleware (it would interfere with the existing region/country logic).
- Hub resolution happens client-side via the `HubPickerModal` (next section) which calls `setHubCookie`.

If you find you do need a middleware tweak (e.g. to set a default hub from a `country → default hub` map later), add it as a narrow block at the end of the function with a comment explaining why.

### Hub picker modal: `apps/storefront/src/modules/hub/components/hub-picker-modal.tsx`

Client component. Behavior:

1. On mount, read `document.cookie` for `fh_hub`. If present, render nothing.
2. If absent, call `listHubs()` (via a server action wrapper or pass hubs as props from the layout).
3. Show a modal with a list of hubs (just "Tagum City Hub" at launch).
4. Selecting a hub calls the `setHubCookie` server action, then closes.
5. Use `@medusajs/ui`-equivalent or whatever modal primitive already exists in the storefront (`apps/storefront/src/modules/common/components/modal` — check before adding a new one).

Mount it once in the root layout: `apps/storefront/src/app/[countryCode]/(main)/layout.tsx`.

### Hub switcher: `apps/storefront/src/modules/hub/components/hub-switcher.tsx`

A dropdown in the navbar (existing nav lives at `apps/storefront/src/modules/layout/templates/nav.tsx`). Shows the current hub name, opens to a list, switches the cookie + revalidates the page.

### Account page widget: `apps/storefront/src/modules/account/components/home-hub-section.tsx`

Add to the account profile area showing "Home Hub: Tagum City Hub" with a "Change" button. Persists the chosen hub to the user's customer record via a new endpoint:

```
POST /store/customers/me/hub  { slug: "tagum" }
```

Add this endpoint at `apps/backend/src/api/store/customers/me/hub/route.ts`. It uses Medusa's link service to set or replace the customer↔hub link:

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) return res.status(401).json({ error: "Not authenticated" })

  const slug = (req.body as { slug?: string })?.slug
  if (!slug) return res.status(400).json({ error: "slug required" })

  const hubModule = req.scope.resolve<HubModuleService>(HUB_MODULE)
  const [hub] = await hubModule.listHubs({ slug, active: true }, { take: 1 })
  if (!hub) return res.status(404).json({ error: "Hub not found" })

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  await link.dismiss({
    [Modules.CUSTOMER]: { customer_id: customerId },
    [HUB_MODULE]: { hub_id: undefined as any },
  })
  await link.create({
    [Modules.CUSTOMER]: { customer_id: customerId },
    [HUB_MODULE]: { hub_id: hub.id },
  })

  res.json({ hub_id: hub.id, slug })
}
```

Add the matching middleware entry: customer-authenticated, `matcher: "/store/customers/me/hub"`.

### Store page filter

Modify `apps/storefront/src/app/[countryCode]/(main)/store/page.tsx` to:

1. Read `fh_hub` from cookies (server component).
2. Pass it down to whatever currently fetches products.
3. The product fetch must filter products by hub. Use Medusa's `query.graph` from the backend via a new helper endpoint or add a query param to the existing product list call.

Simplest path: add a `GET /store/products?hub=<slug>` filter on the backend side — extend the existing `/store/products` route (or add a thin wrapper) that filters products whose `hub.slug` matches. This uses the product↔hub link.

If a product has no hub link (legacy data), exclude it from the public storefront. Admin keeps seeing it.

---

## 9. Acceptance criteria

Mark phase complete only when ALL pass:

- [x] `npx medusa db:migrate` runs clean from a fresh DB and creates `hub`, `hub_area`, and the two link tables.
- [x] `npx medusa exec ./src/migration-scripts/seed-hubs.ts` creates Tagum hub + Tagum Central area, idempotently.
- [x] `curl /admin/hubs` (with admin auth) returns the Tagum hub with one area.
- [x] `curl /store/hubs` returns the same hub, no auth needed.
- [x] Admin UI at `/app/hubs` lists hubs and lets you create/edit a hub + add an area.
- [x] Storefront first-visit (no `fh_hub` cookie) shows the hub picker modal.
- [x] Selecting a hub sets the cookie; reload no longer shows the modal.
- [x] Nav-bar hub switcher changes the cookie and refreshes the page.
- [x] Account page shows "Home Hub: Tagum City Hub" and Change updates the customer↔hub link.
- [x] `/store` page shows ONLY products linked to the cookie's hub. Products with no hub link do not appear.
- [x] Creating a product in admin without a hub link succeeds (admin can still create) but the storefront filters it out.
- [x] All existing admin pages (`/app/sellers`, `/app/memberships`) still work — nothing broke.
- [x] `tsc --noEmit` passes on both `apps/backend` and `apps/storefront`.

---

## 10. Known gotchas

1. **React 19 / @types/react mismatch in admin pages.** Same `// @ts-nocheck` header pattern as existing admin pages — add it to `hubs/page.tsx`.
2. **`db:generate` requires the module to be registered in `medusa-config.ts` BEFORE generating.** Register first, then generate.
3. **Link migrations are auto-generated** but only after both linked modules exist and are registered. If `db:migrate` complains about a missing link table, re-run after a clean `npx medusa db:migrate`.
4. **Don't add `hub_id` columns directly to `customer` or `product`.** Medusa v2 forbids this. Use the link tables only.
5. **The legacy account-type aliases (`buyer` / `seller`) must not break.** This phase does not touch account types — but if you find yourself reaching into customer auth logic, preserve the alias acceptance.
6. **Cookie name `fh_hub` is not the same as the existing `_mfh_country` region cookie.** Both coexist. Don't collide.
7. **Storefront fetches with `next.revalidate: 3600`** — when a hub is updated in admin, the storefront can be up to 1 hour stale. Acceptable for launch. Add cache tag invalidation later if needed.

---

## 11. What's NOT in this phase

These are Phase 2+, do not build now:

- Listing-type field on products (`direct_to_consumer` / `sell_to_freshhub`)
- Pickup windows + slots
- Dispatch batches and cutoff enforcement
- COD payment provider
- Deposit / disputes / strikes
- Producer-side UI showing which hub their listings belong to (defer to Phase 2)
- Auto-assigning a producer's hub on signup (manual admin assignment is fine for launch)

If you finish Phase 1 acceptance and want to keep going, return to `IMPLEMENTATION_PLAN.md` §5 and start Phase 2.
