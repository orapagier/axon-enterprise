# Phase 1 — Hub Data Model

**Status:** in progress
**Foundation for:** all subsequent phases
**Estimated time:** 1 week

---

## 1. Summary

Establish the hub geography layer. Every product, producer, and order is bound to a single hub. Consumers see only their hub's catalog. At launch there is one hub: **Tagum City Hub**.

---

## 2. Data Model

### 2.1 Hub

| Field | Type | Description |
|---|---|---|
| `id` | ULID PK | |
| `name` | text | e.g. "Tagum City Hub" |
| `slug` | text unique | e.g. "tagum" |
| `city` | text | |
| `province` | text | |
| `country` | text | defaults "ph" |
| `active` | boolean | defaults true |
| `dispatch_cutoff` | text | "12:00" (HH:mm in hub TZ) |
| `dispatch_time` | text | "16:00" (HH:mm in hub TZ) |
| `timezone` | text | defaults "Asia/Manila" |

### 2.2 HubArea

| Field | Type | Description |
|---|---|---|
| `id` | ULID PK | |
| `hub_id` | FK → Hub | belongsTo |
| `name` | text | e.g. "Carmen" |
| `postal_codes` | json (string[]) | |
| `barangays` | json (string[]) | |
| `pickup_day_of_week` | json (int[]) nullable | 0=Sun..6=Sat |

### 2.3 Link Tables

- **`customer_hub`** — one hub per customer (home hub).
- **`product_hub`** — one hub per product.

---

## 3. Files Created

### Backend — Hub Module
- `apps/backend/src/modules/hub/models/hub.ts` ✓
- `apps/backend/src/modules/hub/models/hub-area.ts` ✓
- `apps/backend/src/modules/hub/service.ts` ✓
- `apps/backend/src/modules/hub/index.ts` ✓

### Pending
- Link definitions: `customer-hub.ts`, `product-hub.ts`
- API routes: `api/admin/hubs/`, `api/store/hubs/`
- Admin UI: `admin/routes/hubs/page.tsx`
- Seed script
- `medusa-config.ts` update
- Storefront: hub picker, middleware extension, hub context

---

## 4. API Contracts

### Admin
- `GET /admin/hubs` — list all hubs with areas
- `POST /admin/hubs` — create hub
- `PATCH /admin/hubs/:id` — update hub

### Store
- `GET /store/hubs` — list active hubs (public)
- `GET /store/hubs/:slug` — hub details

---

## 5. Acceptance Criteria

- Creating a product without a hub fails validation
- Visiting `/ph/store` from a Tagum cookie shows only Tagum-hub products
- Switching hub changes the catalog
- Admin can create/edit hubs and areas
- Seed: one Tagum City Hub + HubArea

---

## 6. Seed Data

```typescript
// Tagum City Hub
{
  name: "Tagum City Hub",
  slug: "tagum",
  city: "Tagum",
  province: "Davao del Norte",
  country: "ph",
  active: true,
  dispatch_cutoff: "12:00",
  dispatch_time: "16:00",
  timezone: "Asia/Manila",
}

// HubArea
{
  name: "Tagum Proper",
  postal_codes: ["8100", "8101"],
  barangays: ["Apokon", "Magugpo East", "Magugpo West"],
  pickup_day_of_week: [1, 4], // Monday & Thursday
}
```