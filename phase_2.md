# Phase 2 — Listing Types on Products

**Status:** complete
**Depends on:** Phase 1 (Hub) — complete
**Estimated time:** 1 week

---

## 1. Summary

Producers must declare *how* a product reaches the buyer at the moment they create the listing:

- **`direct_to_consumer`** — producer packs and delivers themselves; FreshHub takes membership fee only (no transaction commission until Phase 7).
- **`sell_to_freshhub`** — producer brings the harvest to the hub at a scheduled pickup window; FreshHub handles dispatch.

Pickup-window matching is stubbed in Phase 2 (validated only when a window exists). Phase 3 will wire the real `PickupWindow` table; this phase only needs the `pickup_window_id` FK column reserved.

Storefront product cards carry a small badge — **Producer Direct** or **FreshHub Verified** — so buyers know what they're getting.

---

## 2. Data Model

### 2.1 ProductListing

A new module `listing`. 1:1 with a producer-created product. Admin-created products (FreshHub house inventory) skip this row.

| Field | Type | Description |
|---|---|---|
| `id` | ULID PK | |
| `listing_type` | enum text | `direct_to_consumer` \| `sell_to_freshhub` |
| `harvest_date` | date nullable | required if `sell_to_freshhub`; null otherwise |
| `pickup_window_id` | text nullable | FK reserved for Phase 3; never populated in Phase 2 |
| `status` | enum text | `draft` \| `pending_pickup` \| `active` \| `sold_out` \| `expired` \| `cancelled` |
| `created_at`, `updated_at` | timestamps | Mikro-ORM defaults |

### 2.2 Link Table

- **`product_listing`** — exactly one listing per product. Use Medusa `defineLink` between `ProductModule.product` and `ListingModule.listing`. No FK column on `product` itself (Medusa v2 rule).

### 2.3 Enum constants

Export from `apps/backend/src/modules/listing/types.ts` so the storefront forms can import the string literal union without pulling in the whole module.

```ts
export const LISTING_TYPES = ["direct_to_consumer", "sell_to_freshhub"] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const LISTING_STATUSES = [
  "draft",
  "pending_pickup",
  "active",
  "sold_out",
  "expired",
  "cancelled",
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]
```

---

## 3. Files Created

### Backend — Listing Module
- `apps/backend/src/modules/listing/models/product-listing.ts`
- `apps/backend/src/modules/listing/service.ts`
- `apps/backend/src/modules/listing/index.ts`
- `apps/backend/src/modules/listing/types.ts`
- `apps/backend/src/modules/listing/migrations/Migration<timestamp>.ts` (generated)

### Backend — Links
- `apps/backend/src/links/product-listing.ts`

### Backend — Config + middleware
- `apps/backend/medusa-config.ts` — register `listing` module
- (no middleware change — existing `/store/seller/products*` rules still apply)

### Backend — API extensions
- `apps/backend/src/api/store/seller/products/route.ts` — POST accepts `listing_type`, `harvest_date`; GET response folds in the `listing` row
- `apps/backend/src/api/store/seller/products/[id]/route.ts` — PATCH allows changing listing fields only while `status=draft`
- `apps/backend/src/api/admin/listings/route.ts` — admin can list/filter all listings (read-only for this phase)

### Backend — Workflow / validation
- `apps/backend/src/modules/listing/validators.ts` — pure functions for harvest-date and gate checks, called from the routes

### Admin UI
- `apps/backend/src/admin/routes/sellers/page.tsx` — add **Listing type** column + filter chip (modify existing file)

### Storefront
- `apps/storefront/src/modules/producer/components/listing-type-field.tsx` — radio group (Direct / Sell-to-FreshHub) with help copy
- `apps/storefront/src/modules/producer/components/harvest-date-field.tsx` — date input restricted to `today + 3..5 days`
- `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/producer/listings/new/page.tsx` — wire both fields into the existing form (modify)
- `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/producer/listings/[id]/edit/page.tsx` — same; lock the type select when `status !== draft` (modify)
- `apps/storefront/src/modules/products/components/product-preview/listing-badge.tsx` — small inline badge
- `apps/storefront/src/modules/products/components/product-preview/index.tsx` — render `<ListingBadge>` (modify)
- `apps/storefront/src/lib/data/seller.ts` — `listing_type` & `harvest_date` on submit/update payloads (modify)

### Seed
- No seed required — listings are created by producers. Existing seeded products stay listing-less and remain visible to admin only (storefront already filters by hub link — listing-less products won't break anything).

---

## 4. API Contracts

### Store (seller, authenticated customer)

- **`POST /store/seller/products`**
  ```
  body extends current shape with:
    listing_type: "direct_to_consumer" | "sell_to_freshhub"   // required
    harvest_date: "YYYY-MM-DD"                                 // required iff listing_type=sell_to_freshhub
  201: { product, listing }
  400: missing/invalid listing_type, harvest_date out of 3..5-day window
  409: producer already has a listing on this product
  422: producer not eligible (membership_status≠active or seller_verified=false)
  ```

- **`PATCH /store/seller/products/:id`**
  ```
  body: { listing_type?, harvest_date?, status?: "draft" | "active" | "cancelled", ...productFields }
  200: { product, listing }
  409: cannot change listing_type once status != draft
  ```

- **`GET /store/seller/products`** — response items get a `listing` field; nullable for legacy products until producers re-save them.

### Store (public)
- **`GET /store/products?listing_type=direct_to_consumer`** — accept the filter in `paginated-products.tsx`. Implementation: fetch all hub-scoped IDs (Phase 1), intersect with IDs whose `listing.listing_type` matches via `GET /store/hubs/:slug/products?listing_type=…` (extend the existing route).

### Admin
- **`GET /admin/listings`** — paginated read of all listings; query params: `listing_type`, `status`, `producer_id`. Read-only for this phase (no create/update — that's a producer action).

---

## 5. Validation Rules (server-side, hard-fail)

All checks live in `modules/listing/validators.ts` and run inside the POST/PATCH route handlers.

1. **Producer eligibility (both types)**
   - `customer.metadata.membership_status === "active"`
   - `customer.metadata.seller_verified === true`
   - Producer is linked to a hub (Phase 1 link must exist)

2. **`sell_to_freshhub` only**
   - `harvest_date` parses as a valid ISO date.
   - `harvest_date` is `today + 3..5 days` (inclusive), evaluated in the producer's hub timezone (`Asia/Manila` for Tagum).
   - **Pickup-window match (deferred to Phase 3):** check if `pickup_window_id` resolution is wired; if the `PickupWindow` table is empty (Phase 2 state), accept the listing with `pickup_window_id=null` and `status="pending_pickup"`. Once Phase 3 lands, this check upgrades to a hard fail.

3. **Listing-type lock**
   - PATCH cannot change `listing_type` if current `status` is anything other than `draft`.
   - PATCH cannot change `harvest_date` if `status` is `active`, `sold_out`, or beyond.

4. **Status transitions**
   - `draft → active` allowed once required fields are filled.
   - `draft → cancelled` allowed.
   - `active → sold_out` allowed (set by inventory or admin).
   - `pending_pickup → active` set automatically by Phase 3 when a window is assigned. In Phase 2, producers manually set `draft → active` for `sell_to_freshhub` listings; admins can override.

---

## 6. Acceptance Criteria

- Producer can create a draft of either type via `/account/producer/listings/new`.
- Server rejects `sell_to_freshhub` if `harvest_date` is outside the 3–5-day window (returns 400 with field-level error).
- Server rejects either type if the producer is unverified or has no active membership (returns 422).
- PATCH on an `active` listing rejects `listing_type` change (returns 409).
- `GET /store/products?listing_type=direct_to_consumer` returns only direct listings inside the visitor's hub.
- Product card on `/store` shows the correct badge per listing.
- Sellers admin table shows the Listing type column and the chip filters the list.
- Existing seller products created before this phase load without errors (legacy `listing=null` accepted on GET).
- `npx medusa db:migrate` runs clean from a fresh DB.
- `tsc --noEmit` clean on both apps.

---

## 7. Seed Data

None. Listings come from real producer activity. Optional dev helper:

```bash
# Optional: backfill `listing=direct_to_consumer, status=active` for seeded
# producer products so the storefront badge renders out of the box.
npx medusa exec ./src/migration-scripts/backfill-listings.ts
```

`backfill-listings.ts` is **not required** to ship Phase 2 — only add it if visual QA needs badges on existing demo data.

---

## 8. What's NOT in this phase

Defer to later phases:

- `PickupWindow` table, slot allocation, capacity tracking — **Phase 3**.
- Auto-creating a `PickupSlot` on listing submit — **Phase 3** extends `POST /store/seller/products` for this.
- Cutoff / dispatch batching — **Phase 4**.
- COD + buyer deposit — **Phase 5**.
- Refusal disputes, strikes — **Phase 6**.
- Commission ledger for FreshHub-fulfilled direct sales — **Phase 7** (reserved).
