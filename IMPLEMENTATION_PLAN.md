# FreshHub — Implementation Plan

This document is a self-contained spec for an AI implementer who has not seen the planning conversation. Follow it phase-by-phase. Do not re-litigate the business decisions in §2 — they are sealed. If you find a conflict between this document and the codebase, treat the codebase as the source of truth for *what exists*, and this document as the source of truth for *what to build next*.

---

## 1. Project context

**FreshHub** is a localized fresh-goods marketplace launching May 2026 in Tagum City, Philippines. It connects local **Producers** (farmers, fishers, traders) with local **Consumers** through a physical hub that aggregates orders and dispatches deliveries once daily.

Built as a monorepo on Medusa v2 (backend) + Next.js 15 (storefront):

- `apps/backend` — Medusa v2 app
- `apps/storefront` — Next.js 15 App Router storefront
- Region: Philippines, currency PHP
- Primary hub at launch: Tagum City

Account types (stored on `customer.metadata.account_type`):

- `consumer` — buyer
- `producer` — farmer/seller (must have active Premium membership to list)
- `trader` — bulk/wholesale producer variant; same gates as `producer`

Legacy values `buyer` / `seller` exist in some records and are still accepted as aliases. **Do not break the legacy aliases.**

---

## 2. Sealed business decisions (do not redesign)

These were debated and decided. Implement to match — do not propose alternatives.

1. **Stay on Medusa.** Do not migrate to Vendure / Sharetribe / custom. Add modules on top of Medusa primitives.
2. **Producer Premium membership (₱500/year) is required to create listings.** Already partially implemented via `customer.metadata.membership_status === "active"`.
3. **Two listing modes** chosen by the producer at posting time:
   - `direct_to_consumer` — Producer handles their own packing and delivery. FreshHub takes membership fee only (no transaction commission, until Phase 7 fulfillment option exists).
   - `sell_to_freshhub` — Producer commits goods to FreshHub at scheduled pickup. FreshHub owns the goods from pickup, resells to consumers. Producer is paid at pickup minus any agreed price spread.
4. **COD only at launch.** PayMongo / Xendit integration is deferred until after launch validation. Architect cleanly so a payment provider can be slotted in later, but do not build it now.
5. **Buyer accountability is NOT a paid membership tier.** Use a **deposit + strike + dispute** system:
   - First COD order requires a refundable ₱100 deposit (paid via GCash to FreshHub's QR, manually verified at launch).
   - Refusal triggers a dispute flow: rider uploads photo, buyer states reason, producer can contest. FreshHub admin adjudicates.
   - Only buyer-fault refusals count as strikes. Strikes escalate: warning → 30-day prepay-only lock → permanent prepay-only.
   - Strikes expire 6 months after the last clean order.
6. **No Buyer Premium at launch.** Defer to a later phase. Do not build buyer-side membership tiers.
7. **Hub geography is core.** Every product, producer, and order is bound to a hub. Consumers see only their hub's catalog. A producer can belong to one hub.
8. **Daily ops rhythm:** orders placed before **12:00 PM** local time ship in that day's **4:00 PM** dispatch batch. Orders after 12:00 PM roll to the next day's batch.
9. **`sell_to_freshhub` listings must be posted 3–5 days before harvest.** Hub admin sets fixed pickup windows per area; listings outside those windows are rejected or queued.

---

## 3. What's already built (do not rebuild)

Inspect these before adding anything:

- `apps/backend/src/api/admin/sellers/` — admin endpoint listing producers, with `[id]/verify` to mark them verified.
- `apps/backend/src/api/admin/memberships/` — admin endpoint listing pending / active / cancelled memberships, with `[id]/route.ts` to approve.
- `apps/backend/src/api/store/seller/products/` — producer-facing endpoint to list and create their own products. Already gates on `account_type === "producer"` and `profile_completed === true`.
- `apps/backend/src/api/store/seller/uploads/` — multer-backed image upload for producer listings.
- `apps/backend/src/admin/routes/sellers/page.tsx` and `apps/backend/src/admin/routes/memberships/page.tsx` — admin UI tabs for both queues.
- `apps/backend/src/api/middlewares.ts` — auth middleware mapping `/store/seller*` → customer auth, `/admin/sellers*` and `/admin/memberships*` → user auth.
- `apps/backend/src/migration-scripts/` — one-off ExecArgs scripts: PH region, PHP prices, account-type rename, seller verification seed, MFH catalog seed.

**Membership metadata fields already in use** on `customer.metadata`:

```
account_type          "consumer" | "producer" | "trader" (+ legacy "buyer"/"seller")
profile_completed     boolean
seller_verified       boolean
seller_verified_at    ISO string
membership_status     "pending" | "active" | "cancelled"
membership_tier       string (free-form for now)
membership_joined_at  ISO string
membership_expires_at ISO string
membership_payment_method     string
membership_payment_reference  string
membership_events     array of audit events
```

**Pattern to follow** for small extensions: customer.metadata. **Pattern to switch to** for the new modules in this plan: real Medusa custom modules under `apps/backend/src/modules/<name>/`, not metadata. Metadata is fine for 2–3 fields per entity; it does not scale to hubs, listings, deposits, strikes, disputes, pickups, ledger.

---

## 4. Top-level architecture additions

Create these custom Medusa modules under `apps/backend/src/modules/`:

| Module | Purpose |
|---|---|
| `hub` | Hub geography. Cities, coverage areas, dispatch windows. |
| `listing` | Per-product listing-type metadata (`direct_to_consumer` vs `sell_to_freshhub`), pickup schedule reference, harvest date. |
| `pickup` | Pickup windows per area, producer pickup slots, fulfillment status of each scheduled pickup. |
| `cod_ledger` | Buyer deposit balance, COD remittance from riders, daily reconciliation entries. |
| `accountability` | Strike count, dispute records, prepay-lock state per consumer. |
| `dispatch` | The daily 4 PM batch: which orders ship today, manifest per rider, cutoff enforcement. |
| `commission_ledger` | Reserved for Phase 7. Stub the module but do not implement until FreshHub-fulfilled direct sales exist. |

Each module follows Medusa v2 module conventions: `index.ts` registers the service, `models/` defines entities, `services/` holds logic, migrations under `migrations/`. Register modules in `medusa-config.ts`.

Storefront mirrors:

- `apps/storefront/src/modules/hub/` — hub picker, hub-scoped catalog
- `apps/storefront/src/modules/account/listings/` — producer's "My listings" with listing-type chooser
- `apps/storefront/src/modules/checkout/cod/` — COD checkout flow with deposit gating
- `apps/storefront/src/modules/account/disputes/` — buyer dispute submission

---

## 5. Phased build order

Each phase has: **goal · data model · endpoints · admin · storefront · acceptance**. Ship phase-by-phase. Do not start phase N+1 before phase N is end-to-end exercisable.

---

### Phase 1 — Hub geography

**Goal:** Every product, producer, and order is bound to a hub. Consumers only see their hub.

**Data model** (new module `hub`):

```
Hub
  id                ulid
  name              string         e.g. "Tagum City Hub"
  slug              string unique  e.g. "tagum"
  city              string
  province          string
  country           string         "ph"
  active            boolean
  dispatch_cutoff   time           default "12:00"
  dispatch_time     time           default "16:00"
  timezone          string         default "Asia/Manila"
  created_at, updated_at

HubArea
  id, hub_id (fk), name, postal_codes (string[]), barangays (string[])
  pickup_day_of_week  int[]        0=Sun..6=Sat — days FreshHub picks up here
```

Link tables (use Medusa link definitions in `apps/backend/src/links/`):

- `customer_hub` — one hub per customer (their home hub). Field on `Customer ↔ Hub`.
- `product_hub` — one hub per product. Field on `Product ↔ Hub`.

**Endpoints:**

- `GET /admin/hubs` — list hubs
- `POST /admin/hubs` — create
- `PATCH /admin/hubs/:id` — update
- `GET /store/hubs` — public list (used by storefront hub picker)
- `GET /store/hubs/:slug` — public details

**Admin UI:** new `apps/backend/src/admin/routes/hubs/page.tsx` with table + create/edit modal.

**Storefront:**

- First-visit hub picker (modal). Persist selected hub slug in cookie `fh_hub`.
- `middleware.ts` reads `fh_hub` and rewrites product listing queries to filter by hub.
- Product detail and store pages show hub badge.
- Account page lets user change their home hub.

**Seed:** one row — `Tagum City Hub`, slug `tagum`, single HubArea covering Tagum's postal codes.

**Acceptance:**
- Creating a product without a hub fails validation.
- Visiting `/ph/store` from a Tagum cookie shows only Tagum-hub products.
- Switching hub in the UI changes the catalog.

---

### Phase 2 — Listing types on products

**Goal:** Producer chooses `direct_to_consumer` or `sell_to_freshhub` at listing time. Storefront and admin both surface the type clearly.

**Data model** (new module `listing`):

```
ProductListing
  id                ulid
  product_id        fk (link to Product)
  listing_type      enum("direct_to_consumer", "sell_to_freshhub")
  harvest_date      date         null for direct_to_consumer
  pickup_window_id  fk(PickupWindow) nullable — set in Phase 3
  status            enum("draft", "pending_pickup", "active", "sold_out", "expired", "cancelled")
  created_at, updated_at
```

A `ProductListing` row exists 1:1 with each producer-created product. (Admin-created products for FreshHub's own inventory don't need a row.)

**Endpoints (extensions to existing `/store/seller/products`):**

- `POST /store/seller/products` body now requires `listing_type` and (if `sell_to_freshhub`) `harvest_date`.
- `GET /store/seller/products` response includes `listing` payload.
- `PATCH /store/seller/products/:id` allows changing draft listing only; once `active`, type is locked.

**Admin UI:** sellers admin table gains a "Listing type" column. Filter chip.

**Storefront:**

- Producer "Create listing" form gets a radio: **Direct to consumer** vs **Sell to FreshHub**.
- Direct mode: explain "you pack and deliver this order yourself."
- Sell-to-FreshHub mode: requires harvest date 3–5 days out, shows the next available pickup window from Phase 3.
- Product card on store page shows a small badge: "Producer Direct" or "FreshHub Verified."

**Validation rules (server-side, hard-fail):**

- `direct_to_consumer` listings: producer must have membership_status=active AND seller_verified=true.
- `sell_to_freshhub` listings: same gates, PLUS harvest_date must be `today + 3..5 days` AND a matching open `PickupWindow` must exist in the producer's hub area.

**Acceptance:**
- Producer can create a draft of both types.
- Server rejects `sell_to_freshhub` if no pickup window matches.
- Storefront filter `?listing_type=direct` works.

---

### Phase 3 — Pickup scheduling (for `sell_to_freshhub`)

**Goal:** Hub admin defines pickup windows per area (e.g. "Carmen barangay, every Tuesday & Friday, 6–10 AM"). Producers can only post `sell_to_freshhub` listings whose harvest date matches an upcoming window.

**Data model** (new module `pickup`):

```
PickupWindow
  id, hub_id, hub_area_id
  date              date
  start_time, end_time   time
  capacity_kg       int      null = unlimited
  status            enum("open", "full", "closed", "completed")

PickupSlot
  id, pickup_window_id, listing_id (fk ProductListing)
  estimated_kg      int
  status            enum("reserved", "picked_up", "no_show", "rejected")
  picked_up_at      timestamp nullable
  notes             string
```

**Endpoints:**

- `GET /admin/pickup-windows?hub=&from=&to=` — list
- `POST /admin/pickup-windows` — create
- `PATCH /admin/pickup-windows/:id` — close / reopen
- `GET /store/pickup-windows?hub_area_id=&from=&to=` — producer-facing list of open windows
- `POST /store/seller/products` (Phase 2 endpoint) — auto-creates a `PickupSlot` reserving capacity when `listing_type=sell_to_freshhub`.

**Job:** nightly cron `expire-pickup-windows` — closes any open window past its date, marks slots without `picked_up_at` as `no_show`.

**Admin UI:** new `apps/backend/src/admin/routes/pickups/page.tsx`. Calendar-style by week, click a window to see slots. Action: "Mark picked up" toggles `PickupSlot.status` and triggers producer payout (Phase 7 stub — for now just record the event).

**Storefront:** producer's "Create listing" form for `sell_to_freshhub` shows next 5 open windows in their area as a select.

**Acceptance:**
- Admin can create a recurring weekly window (script or repeated create).
- Producer's listing reserves a slot and decrements `capacity_kg`.
- A window with no remaining capacity is auto-marked `full` and disappears from producer select.

---

### Phase 4 — Cutoff and dispatch batching

**Goal:** Orders placed before 12:00 ship today; after 12:00 ship tomorrow. One daily 4:00 PM dispatch per hub.

**Data model** (new module `dispatch`):

```
DispatchBatch
  id, hub_id
  dispatch_date     date
  cutoff_at         timestamp   the 12:00 boundary (UTC stored)
  dispatched_at     timestamp nullable
  status            enum("collecting", "locked", "in_transit", "completed")

DispatchOrder
  id, dispatch_batch_id, order_id (fk Order)
  rider_id          fk User nullable
  manifest_position int        sort order on rider's manifest
  delivered_at      timestamp nullable
  delivery_status   enum("pending", "delivered", "refused", "missed", "disputed")
```

**Workflow** (`apps/backend/src/workflows/assign-order-to-dispatch.ts`):

- Triggered by `order.placed` subscriber.
- Reads order's hub → resolves "current open batch" (today's if before cutoff, else tomorrow's).
- Creates or finds the `DispatchBatch`, adds a `DispatchOrder`.

**Subscriber:** `apps/backend/src/subscribers/order-placed.ts` invokes the workflow above.

**Job:** `lock-dispatch-batches` — runs at hub's cutoff (12:00) per timezone, sets matching batches to `locked`. A second cron at 16:00 sets `in_transit`.

**Admin UI:** new `apps/backend/src/admin/routes/dispatch/page.tsx`. Shows today's batch per hub, list of orders with rider assignment, "Print manifest" action.

**Storefront:** order confirmation page shows estimated delivery: "Today by 6 PM" if before cutoff, "Tomorrow by 6 PM" otherwise.

**Acceptance:**
- Order at 11:59 AM lands in today's batch.
- Order at 12:01 PM lands in tomorrow's batch.
- Locked batch cannot accept new orders (returns 409 if attempted).

---

### Phase 5 — COD checkout + buyer deposit

**Goal:** Buyers can check out with COD. First-time COD buyers must pay ₱100 refundable deposit via GCash (manual verification at launch). Implement as a Medusa payment provider so checkout flow stays standard.

**Data model** (new module `cod_ledger`):

```
BuyerWallet
  id, customer_id (link to Customer, unique)
  deposit_balance   int        in centavos
  status            enum("none", "pending_verification", "verified")
  verified_at       timestamp nullable

CodTransaction
  id, customer_id, order_id, type
  type              enum("deposit_in", "deposit_refund", "deposit_forfeit",
                          "cod_collected", "rider_remitted", "reconciled")
  amount            int        centavos, signed
  reference         string     e.g. GCash ref number
  rider_id          fk User nullable
  created_at, recorded_by  (user id)
```

**Payment provider:**

- New module `apps/backend/src/modules/payment-cod/` registering as a Medusa payment provider with id `pp_cod_freshhub`.
- `authorizePayment` succeeds if either:
  - `BuyerWallet.status === "verified"`, OR
  - the buyer is in a prepay-only state (Phase 6) — then it must FAIL.
- `capturePayment` is invoked by admin marking order `cod_collected`.

**Endpoints:**

- `POST /store/customer/deposit/initiate` — buyer submits GCash reference; creates pending `BuyerWallet`.
- `POST /admin/deposits/:id/verify` — admin marks wallet `verified`, writes `deposit_in` ledger row.
- `POST /admin/orders/:id/cod-collected` — admin records collection (after rider remit).
- `POST /admin/orders/:id/cod-remitted` — rider hands cash to hub cashier.

**Admin UI:** new `apps/backend/src/admin/routes/deposits/page.tsx` with queue of pending verifications. New `apps/backend/src/admin/routes/cod-reconcile/page.tsx` for end-of-day reconciliation.

**Storefront:**

- Checkout payment step: if buyer has no verified wallet, show "Pay ₱100 refundable deposit to enable COD" with GCash QR + reference field.
- Block checkout submission until wallet is verified (status check before payment session creation).
- Display deposit balance on account page.

**Acceptance:**
- First-time buyer is blocked at COD checkout until deposit is verified.
- Returning verified buyer skips the deposit step.
- Ledger entries reconcile: sum of `cod_collected` for a batch == sum of `rider_remitted` after close-out.

---

### Phase 6 — Refusal disputes + strike system

**Goal:** Refusals route through a dispute flow. Only buyer-fault refusals create strikes. Strikes escalate. Buyer can recover with 6 months clean.

**Data model** (new module `accountability`):

```
RefusalDispute
  id, order_id, dispatch_order_id, customer_id
  rider_photo_url       string     uploaded by rider at handover
  rider_notes           string
  buyer_reason          string     one of: damaged_goods | wrong_item | not_home | other
  buyer_notes           string
  producer_response     string     nullable
  resolution            enum("pending", "buyer_fault", "producer_fault",
                              "rider_fault", "platform_fault")
  resolution_notes      string
  resolved_by           fk User nullable
  resolved_at           timestamp
  deposit_action        enum("none", "forfeit", "refund")

BuyerAccountStatus
  id, customer_id (unique)
  strike_count          int default 0
  state                 enum("normal", "warned", "prepay_locked_30d",
                              "prepay_locked_permanent")
  state_until           timestamp nullable    for the 30-day lock
  last_clean_order_at   timestamp nullable
  recovery_eligible_at  timestamp nullable    last_clean_order_at + 6mo
```

**State transitions:**

```
Resolution = buyer_fault →
  strike_count++
  if strike_count == 1: state = "warned",                deposit_action = "forfeit"
  if strike_count == 2: state = "prepay_locked_30d",     state_until = now + 30d
  if strike_count >= 3: state = "prepay_locked_permanent"

Job clean-order-tick (nightly):
  for each customer with last_clean_order_at older than 6mo and >= 1 strike,
    if state in ("warned",): reset strike_count = 0, state = "normal"
    if prepay_locked_30d and state_until passed: state = "normal"
    permanent lock requires admin override to clear
```

**Endpoints:**

- `POST /admin/dispatch-orders/:id/refusal` — rider-facing (or admin entering for rider). Creates `RefusalDispute`, uploads photo.
- `POST /store/customer/disputes/:id/respond` — buyer adds reason + notes within 48h.
- `POST /store/seller/disputes/:id/respond` — producer contests within 48h.
- `POST /admin/disputes/:id/resolve` — admin sets resolution + writes ledger consequences.

**Admin UI:** new `apps/backend/src/admin/routes/disputes/page.tsx`. Queue of `pending` disputes. Resolution form shows photo, buyer/producer statements, dropdown resolution, notes field.

**Storefront:**

- Buyer account: "My disputes" page. Shows pending disputes with response form.
- Buyer account: status banner ("You're in a 30-day prepay-only period until <date>") if locked.
- Checkout: payment provider `pp_cod_freshhub` returns 403 with reason code if buyer is prepay-locked, message explains why and points to dispute history.

**Acceptance:**
- Rider can flag refusal with photo on a delivered-failed order.
- Buyer can submit reason within 48h.
- Admin resolves; if buyer_fault and strike 1, deposit is forfeited and buyer enters `warned`.
- 6-month clean-order job resets warned buyers but never the permanent lock.

---

### Phase 7 — (Reserved) Commission ledger for FreshHub-fulfilled direct sales

**Out of scope for launch.** Module stub only — do not implement logic.

When ready (post-launch), this module will track 2% commission on `direct_to_consumer` listings that opt into FreshHub fulfillment. For launch, all `direct_to_consumer` listings are producer-fulfilled and earn no per-transaction commission. Revenue from direct mode is membership-only.

Create the empty `apps/backend/src/modules/commission-ledger/` with a README explaining the deferral. Do not register it in `medusa-config.ts` yet.

---

## 6. Cross-cutting requirements

### 6.1 Hub-scoped everything

Every list endpoint (products, orders, listings, disputes, deposits) must accept `?hub=<slug>` and default to the requester's home hub. Admin endpoints accept `?hub=` with no default (admins see across hubs).

### 6.2 Timezone

All cron / cutoff math uses the hub's timezone (default `Asia/Manila`). Store timestamps in UTC, render in hub TZ. Use `date-fns-tz` (already in storefront deps) for conversions.

### 6.3 Currency

Single currency PHP at launch. Do not generalize to multi-currency.

### 6.4 Logging + audit trail

For every state transition in `accountability`, `cod_ledger`, `pickup`, `dispatch`, append an event row (module-local `*_events` table) with `actor_id`, `actor_type` (user/customer/system), `event_type`, `data` json. This is the audit log when something goes wrong — do not skip it.

### 6.5 Idempotency

Migration scripts and seed scripts must be idempotent — follow the pattern in `apps/backend/src/migration-scripts/add-philippines-region.ts`.

### 6.6 Backward compatibility with legacy account types

Anywhere code checks `account_type`, also accept the legacy values (`buyer` → consumer, `seller` → producer). The existing seller-products route shows the pattern.

---

## 7. Suggested build sequence (8–14 weeks solo, faster with help)

| Week | Phase |
|---|---|
| 1 | Phase 1 (Hub) — foundation, blocks everything else |
| 2 | Phase 2 (Listing types) |
| 3–4 | Phase 3 (Pickup scheduling) |
| 5 | Phase 4 (Dispatch batching + cutoff) |
| 6–7 | Phase 5 (COD payment provider + deposit) |
| 8–9 | Phase 6 (Disputes + strikes) |
| 10 | Internal dogfood: create 5 test producers, place 20 test orders, run 5 fake refusals |
| 11–14 | Bugfix, admin UX polish, real producer onboarding |

Phase 7 is post-launch.

---

## 8. Out of scope (do not build now)

- PayMongo / Xendit / any online payment integration
- Buyer-side Premium membership tier
- In-app buyer ↔ producer chat (Shopee-style)
- Multi-hub expansion tooling (one hub is enough at launch)
- Multi-currency, multi-region beyond Philippines
- Rider mobile app (riders will use the admin web app on mobile at launch)
- Producer payout automation for `direct_to_consumer` mode (no commission to collect at launch)
- Buyer ratings / producer ratings (defer)

If something seems necessary that is not in this plan, raise it explicitly before implementing. Do not silently expand scope.

---

## 9. Testing notes

- Unit-test the state machines in `accountability` (strike escalation, recovery) thoroughly — these are the most failure-prone pieces.
- Integration-test the cutoff: place an order at 11:59 / 12:01 local time, assert it lands in the correct batch.
- Manual QA each phase with the dev seed (`apps/backend/src/migration-scripts/seed-mfh-catalog.ts` — extend as needed).
- Before launch, do one full end-to-end rehearsal: producer posts listing → admin verifies → consumer orders → rider delivers → reconciliation → next-day repeat.

---

## 10. Glossary

- **Hub** — physical aggregation point. Tagum City Hub at launch.
- **Producer** — seller account (`account_type=producer` or `trader`).
- **Consumer** — buyer account (`account_type=consumer`).
- **Listing** — a product posted by a producer; carries listing-type metadata.
- **Direct to consumer** — producer packs and delivers themselves.
- **Sell to FreshHub** — producer commits goods at scheduled pickup; FreshHub resells.
- **Cutoff** — 12:00 PM local time; orders after this roll to tomorrow's batch.
- **Dispatch** — 4:00 PM daily; locked batch goes out with riders.
- **Deposit** — refundable ₱100 a buyer pays via GCash to enable COD on their first order.
- **Strike** — buyer-fault refusal recorded against a consumer account.
- **Prepay-locked** — consumer cannot use COD; must prepay until lock expires (or permanent).
