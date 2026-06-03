# Phase 3 — Pickup Scheduling

**Status:** complete
**Depends on:** Phase 1 (Hub) ✓, Phase 2 (Listing types) ✓
**Estimated time:** 1–2 weeks

---

## 1. Summary

`sell_to_freshhub` listings need a real pickup window before they can go live. Hub admins define windows per `HubArea` (date + time range + optional capacity). When a producer creates a `sell_to_freshhub` listing, the server auto-reserves a `PickupSlot` against the matching window — that's how Phase 2's deferred `pickup_window_id` finally gets populated.

A nightly cron closes expired windows and marks no-show slots.

---

## 2. Data Model

### 2.1 PickupWindow

| Field | Type | Description |
|---|---|---|
| `id` | ULID PK | |
| `hub_id` | text | belongsTo Hub (via link) |
| `hub_area_id` | text | belongsTo HubArea (via link) |
| `date` | date | the calendar day the window runs |
| `start_time` | text | "HH:mm" local hub TZ |
| `end_time` | text | "HH:mm" local hub TZ |
| `capacity_kg` | int nullable | null = unlimited |
| `reserved_kg` | int default 0 | running total of slot `estimated_kg` |
| `status` | enum text | `open` \| `full` \| `closed` \| `completed` |
| `created_at`, `updated_at` | timestamps | |

Status transitions:
- `open → full` — automatic when `reserved_kg >= capacity_kg`
- `open → closed` — admin action
- `open|full → completed` — set by the nightly cron after the window's date passes

### 2.2 PickupSlot

| Field | Type | Description |
|---|---|---|
| `id` | ULID PK | |
| `pickup_window_id` | text | belongsTo PickupWindow |
| `listing_id` | text | belongsTo ProductListing |
| `estimated_kg` | int | producer-supplied estimate at listing time |
| `status` | enum text | `reserved` \| `picked_up` \| `no_show` \| `rejected` |
| `picked_up_at` | timestamp nullable | |
| `notes` | text nullable | admin-only freeform notes |
| `created_at`, `updated_at` | timestamps | |

### 2.3 Links

- **`pickup_window_hub_area`** — already implied by `hub_area_id`; use a `defineLink` so admin queries can hop `hub_area → windows` cleanly.
- **`pickup_slot_listing`** — link `ProductListing` ↔ `PickupSlot`. This is what finally fills Phase 2's reserved `pickup_window_id` slot — but as a Medusa link, not a raw FK column.

---

## 3. Files Created

### Backend — Pickup Module
- `apps/backend/src/modules/pickup/models/pickup-window.ts`
- `apps/backend/src/modules/pickup/models/pickup-slot.ts`
- `apps/backend/src/modules/pickup/service.ts`
- `apps/backend/src/modules/pickup/index.ts`
- `apps/backend/src/modules/pickup/types.ts` — enum constants (`PICKUP_WINDOW_STATUSES`, `PICKUP_SLOT_STATUSES`)
- `apps/backend/src/modules/pickup/migrations/Migration<timestamp>.ts` (generated)

### Backend — Links
- `apps/backend/src/links/pickup-window-hub-area.ts`
- `apps/backend/src/links/pickup-slot-listing.ts`

### Backend — Config + middleware
- `apps/backend/medusa-config.ts` — register `pickup` module
- `apps/backend/src/api/middlewares.ts` — add admin auth for `/admin/pickup-windows*`; customer auth for `/store/seller/pickup-windows*`

### Backend — API
- `apps/backend/src/api/admin/pickup-windows/route.ts` — GET (list with filters), POST (create)
- `apps/backend/src/api/admin/pickup-windows/[id]/route.ts` — GET, PATCH (close/reopen, edit capacity), DELETE (only if no slots)
- `apps/backend/src/api/admin/pickup-windows/[id]/slots/route.ts` — GET list, PATCH `mark-picked-up` action handled here
- `apps/backend/src/api/admin/pickup-windows/[id]/slots/[slotId]/route.ts` — PATCH (status transitions, notes), DELETE
- `apps/backend/src/api/admin/pickup-windows/bulk/route.ts` — POST for recurring-window generation (see §6)
- `apps/backend/src/api/store/seller/pickup-windows/route.ts` — GET open windows in producer's hub area, filterable by date range
- `apps/backend/src/api/store/seller/products/route.ts` — POST extended: on `listing_type=sell_to_freshhub`, resolve & reserve a slot atomically (modify existing Phase 2 file)

### Backend — Workflow / validation
- `apps/backend/src/modules/pickup/validators.ts` — pure helpers: capacity check, time-range parsing, status-transition guard
- `apps/backend/src/workflows/reserve-pickup-slot.ts` — Medusa workflow used by the seller product POST so reserve + listing create roll back together
- `apps/backend/src/jobs/expire-pickup-windows.ts` — nightly cron (`0 1 * * *` in hub TZ): closes overdue `open|full` windows and flips orphan slots to `no_show`

### Admin UI
- `apps/backend/src/admin/routes/pickups/page.tsx` — calendar-style week view, click window for slot drawer, "Mark picked up" action
- `apps/backend/src/admin/routes/pickups/components/window-drawer.tsx` — extracted because the route file gets long

### Storefront
- `apps/storefront/src/modules/producer/components/pickup-window-select.tsx` — replaces the Phase 2 placeholder; lists next 5 open windows in the producer's hub area
- `apps/storefront/src/modules/producer/components/estimated-kg-field.tsx` — number input with min/step validation
- `apps/storefront/src/app/[countryCode]/(main)/account/@dashboard/producer/listings/new/page.tsx` — wire both fields when `listing_type=sell_to_freshhub` (modify)
- `apps/storefront/src/lib/data/seller.ts` — submit `pickup_window_id` + `estimated_kg` (modify)
- `apps/storefront/src/lib/data/pickup.ts` — new file: `listOpenPickupWindows()` for the form

### Seed
- `apps/backend/src/migration-scripts/seed-pickup-windows.ts` — idempotent: creates 4 weeks of recurring Tue/Fri 06:00–10:00 windows for Tagum Central (matches the area's `pickup_day_of_week=[2,5]` from Phase 1 seed)

---

## 4. API Contracts

### Admin

- **`GET /admin/pickup-windows?hub=tagum&from=2026-05-22&to=2026-06-19&status=open`**
  → `{ windows: PickupWindow[], count }` — windows include `slots_count`, `reserved_kg`, `capacity_kg`.

- **`POST /admin/pickup-windows`**
  ```
  body: {
    hub_area_id: string,
    date: "YYYY-MM-DD",
    start_time: "HH:mm",
    end_time: "HH:mm",
    capacity_kg?: number | null
  }
  201: { window }
  400: end_time <= start_time, date in the past, hub_area_id unknown
  409: duplicate window (same area + date + start_time)
  ```

- **`POST /admin/pickup-windows/bulk`**
  ```
  body: {
    hub_area_id: string,
    from: "YYYY-MM-DD",
    to: "YYYY-MM-DD",
    days_of_week: number[],           // 0=Sun..6=Sat
    start_time: "HH:mm",
    end_time: "HH:mm",
    capacity_kg?: number | null
  }
  201: { created: PickupWindow[], skipped: { date, reason }[] }
  ```
  Skips dates that already have a window with the same `start_time` so the call is idempotent.

- **`PATCH /admin/pickup-windows/:id`** — `{ status?, capacity_kg?, start_time?, end_time? }`. Editing `start_time`/`end_time` allowed only while `status=open` and `slots_count=0`.

- **`GET /admin/pickup-windows/:id/slots`** → `{ slots: PickupSlot[] }` with producer + listing fields embedded via `query.graph`.

- **`PATCH /admin/pickup-windows/:id/slots/:slotId`** — `{ status?, picked_up_at?, notes? }`. Transition table enforced server-side.

### Store (seller)

- **`GET /store/seller/pickup-windows?from=&to=&limit=5`**
  Returns open windows in the authenticated producer's hub area. Excludes `status=full|closed|completed`. Sort: `date asc, start_time asc`.

- **`POST /store/seller/products`** *(extended from Phase 2)*
  When `listing_type=sell_to_freshhub`, body must include:
  ```
  pickup_window_id: string
  estimated_kg: number
  ```
  Workflow:
  1. Validate listing fields (Phase 2 rules) and Phase 3 capacity check.
  2. Inside a single `reserve-pickup-slot` workflow: create `PickupSlot(status=reserved)`, increment `PickupWindow.reserved_kg`, and create the `ProductListing(status=active)`.
  3. If `reserved_kg >= capacity_kg`, flip the window to `status=full` in the same transaction.
  4. Roll back atomically if any step fails.

---

## 5. Validation Rules (server-side, hard-fail)

1. **Window create**
   - `start_time < end_time`
   - `date >= today` (in hub TZ)
   - `hub_area_id` exists and is active
   - No duplicate by (area, date, start_time)

2. **Slot reserve**
   - Window `status === "open"`
   - Window `date` matches the listing's `harvest_date` (Phase 2 field)
   - Producer's hub area === window's hub area
   - `estimated_kg > 0`
   - `reserved_kg + estimated_kg <= capacity_kg` (skip if `capacity_kg = null`)

3. **Slot status transitions**
   - `reserved → picked_up` requires admin auth and a non-null `picked_up_at`
   - `reserved → no_show` allowed by cron or admin after the window's date passes
   - `reserved → rejected` admin-only, requires a `notes` reason
   - Picked-up/no_show/rejected are terminal — no further transitions

4. **Window status transitions**
   - `open ↔ closed` admin-only
   - `open → full` automatic on capacity (do not allow admin to manually set `full`)
   - `full → open` only if a slot is cancelled, freeing capacity
   - `open|full → completed` cron-only, after the date passes

---

## 6. Recurring Windows

Two options offered:

1. **`POST /admin/pickup-windows/bulk`** — admin picks a date range + `days_of_week[]` and the server fans out individual `PickupWindow` rows. Idempotent on (area, date, start_time).
2. **Admin UI shortcut** — the `pickups/page.tsx` "Generate windows" button drives the bulk endpoint with a 4-week default look-ahead.

No CRON-driven generation in Phase 3 — operators always trigger creation explicitly so the schedule never appears without intent.

---

## 7. Background Job

- **`expire-pickup-windows`** — `apps/backend/src/jobs/expire-pickup-windows.ts`
- Schedule: `0 1 * * *` (01:00 local hub TZ — after the day's pickups are over)
- Logic:
  1. Find windows with `date < today` AND `status IN (open, full)` → set `status=completed`.
  2. For each completed window, any slot still in `status=reserved` → set `status=no_show`. (Producer strike accumulation is Phase 6.)
  3. Emit an audit log line per affected row.

---

## 8. Acceptance Criteria

- Admin can create a one-off window (`POST /admin/pickup-windows`) and a 4-week recurrence (`POST /admin/pickup-windows/bulk`).
- Bulk creation is idempotent: re-running for the same range adds no duplicates.
- Producer creating a `sell_to_freshhub` listing sees a non-empty select if any open window matches their hub area + harvest date — and the listing POST fails with a clear error if no window matches.
- A successful listing POST decrements remaining capacity; once `reserved_kg >= capacity_kg`, the window auto-flips to `full` and disappears from the producer select.
- `mark-picked-up` action on a slot sets `status=picked_up` and `picked_up_at=now()`.
- Nightly cron, when run manually (`npx medusa exec ./src/jobs/expire-pickup-windows.ts`), closes overdue windows and flags no-shows.
- `npx medusa db:migrate` clean on a fresh DB.
- `tsc --noEmit` clean on both apps.

---

## 9. Seed Data

```ts
// 4 weeks of recurring Tagum Central windows
{
  hub_area: "Tagum Central",
  days_of_week: [2, 5],       // Tue + Fri — matches Phase 1 seed
  start_time: "06:00",
  end_time: "10:00",
  capacity_kg: 500,
  from: today,
  to: today + 28 days,
}
```

Run with:

```bash
npx medusa exec ./src/migration-scripts/seed-pickup-windows.ts
```

Idempotent — re-running skips already-present (area, date, start_time) triples.

---

## 10. What's NOT in this phase

- Cutoff + dispatch batching — **Phase 4**.
- COD + buyer deposit — **Phase 5**.
- Strikes on `no_show` — **Phase 6** (Phase 3 only records the status; Phase 6 reads it).
- Producer payout on `picked_up` — **Phase 7** (stub only; record the event with no money movement).
- Storefront-side display of pickup windows to *buyers* — out of scope; pickup is an internal logistics concept.
