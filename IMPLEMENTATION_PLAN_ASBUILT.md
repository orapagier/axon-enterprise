# Mindanao Fresh Hub — As-Built Implementation Plan (v3)

> **Status of this document.** This plan is reverse-engineered from the actual
> codebase as of **2026-06-10**, not from the original spec. The original
> `IMPLEMENTATION_PLAN.md` (v2) is kept as-is — treat it as the *aspirational /
> superseded* spec. Where the two disagree, **this document reflects what is
> actually running**; the v2 ideas that were deliberately not built (Hub Credits,
> rider first-grab PWA) are preserved here only in the **Deferred Roadmap**.
>
> Two purposes:
> 1. Describe the system as it is built (so the team has a true map).
> 2. Lay out the remaining work — the **gaps** and **risks-to-watch** — as an
>    actionable forward roadmap.

> **Launch decisions (locked-in 2026-06-10).**
> - **Payments at launch = COD + OTC only. No PayMongo/online yet.** OTC is a
>   walk-in purchase at the physical hub store (pay + collect at the counter) and
>   doubles as the cash "prepay" rail.
> - **Prepay-lock = OTC-only, not blocked.** A buyer in a `prepay_locked_*` state
>   loses COD but can still buy by paying at the counter — no online prepay needed.
> - **No first-order COD cap / no upfront gate** (founder call, kept). Bogus buyers
>   are handled solely by the strike system + same-day resale of returned produce.
> - **Delivery is rider-driven and automated:** the rider's QR scan / "Delivered"
>   action marks the order fulfilled *and* records the COD cash as collected (the
>   rider now owes it). **Delivered ≠ remitted** — remittance (rider→hub) is a
>   separate, tracked event.
> - **Producer payout is gated on remittance, not delivery.**
> - **Rider accountability mirrors buyer strikes:** a rider with too much aged
>   collected-but-unremitted cash is flagged/blocked from taking new orders.

> **▶ Current build state (2026-06-10) — read this first if resuming.**
> - **Phase A (walk-in OTC) is RUNTIME-VERIFIED (2026-06-10):** migrations applied
>   (`rider` table + `otc_collected` constraint), PH region has COD+OTC attached, and a
>   live counter sale created a **paid** order (₱200), recorded `otc_collected`, stayed
>   **off every rider manifest**, and created a fulfillment — while a prepay-locked customer
>   got `checkout_blocked` and a normal/guest buyer saw **COD only (no OTC)**. Verification
>   caught + fixed one bug: the counter route queried `order.total` without `summary.*`/`items.*`,
>   so it read 0; now fixed (reads computed total with a summary fallback).
> - **Phase E (rider) is now RUNTIME-VERIFIED (2026-06-10):** live HTTP run of
>   `POST /rider/auth/login → GET /rider/manifest → POST /rider/orders/:id/delivered`
>   against a real COD order (display_id 2, ₱100): login issued a token, the manifest
>   listed the in_transit order, and `delivered` marked it delivered **and** wrote a
>   single `cod_collected` row (10000 centavos, rider_id + `recorded_by=rider:<id>`).
>   Idempotency held (second `delivered` returned the same txn, no duplicate); manifest
>   emptied after delivery. Negative paths confirmed: wrong PIN → 401, no token → 401,
>   another rider delivering this order → 403, **suspended rider login → 403**. The
>   producer-payout gate `getOrderCashState().settled` was **false** while collected-only
>   and flipped **true** after `rider_remitted` (delivered ≠ remitted holds end-to-end).
>   **Verification caught + fixed a launch-blocking bug:** `POST /rider/auth/login` was
>   unreachable — Medusa applies matching middlewares *cumulatively*, so the broad
>   `/rider/*` `authenticateRider` guard also ran on the login path (the separate
>   empty-middlewares matcher did **not** override it), 401-ing every login. Fixed by
>   exempting the login path *inside* `authenticateRider` (`req.path.endsWith("/rider/auth/login")`)
>   and dropping the misleading empty matcher entry — fails closed for any new `/rider/*` route.
> - **Code-complete (TypeScript-clean across the whole backend):**
>   - **Phase A (walk-in OTC, reframed 2026-06-10)** — OTC is **in-person only**, not an
>     online method. Locked buyers are **blocked from online checkout** (`/store/payment-methods`
>     → `checkout_blocked`; storefront shows "buy in person at the hub"). New **OTC Counter**
>     register: `POST/GET /admin/otc-counter` creates a paid, dispatch-skipped order
>     (`metadata.sale_channel="otc_counter"`) + `otc_collected` ledger row, with an
>     `src/admin/routes/otc-counter` page. `pp_otc_freshhub` is repurposed as the counter
>     cash provider; `recordOtcCollected` helper (`src/lib/otc-sale.ts`) is shared with the
>     legacy `POST /admin/orders/:id/otc-collected` (deprecated).
>   - **Phase E** — `rider` module + admin CRUD, `/rider/*` self-service (HS256 token,
>     scrypt PIN), `POST /admin/dispatch-orders/:id/delivered` (auto `cod_collected`),
>     shared `src/lib/delivery-actions.ts`, suspension-on-assignment, `rider-unremitted-tick`
>     (balance+aging), payout gate primitive (`src/lib/order-cash.ts`, `/admin/orders/:id/cash-state`).
> - **Setup (done 2026-06-10 — idempotent, re-run on a fresh DB):**
>   1. ✅ `cd apps/backend && npx medusa db:migrate` — applied the `rider` table + the
>      `otc_collected` constraint (Migrations `20260610120000`, `20260610130000`).
>   2. ✅ `npx medusa exec ./src/migration-scripts/add-philippines-region.ts` — attached
>      `pp_cod_freshhub` + `pp_otc_freshhub` to the PH region.
>   3. ✅ OTC smoke-test passed (counter sale paid + off-manifest + ledgered; locked buyer
>      blocked).
>   4. ✅ Rider smoke-test passed (login → manifest → delivered → `cod_collected`; idempotent;
>      ownership + suspended-login 403s; payout `settled` gate flips on remittance). Fixed the
>      `/rider/auth/login` middleware bug found during it. **Phase E is now runtime-verified.**
> - **Bug-fix pass (2026-06-10, post-verification; TypeScript-clean, 27/27 unit tests):**
>   1. **Warned-buyer recovery was dead code** — nothing ever wrote `last_clean_order_at`,
>      so `warned → normal` could never fire. Now: `confirmDelivery` stamps
>      `last_clean_order_at`; buyer-fault escalation to `warned` stamps
>      `recovery_eligible_at = strike + 6mo`; `clean-order-tick` recovers when the clock
>      passed AND a clean order exists since the strike (legacy warned rows self-heal).
>   2. **Online-OTC checkout bypass** — `pp_otc_freshhub.authorizePayment` always
>      authorized and is attached to the PH region, so a locked buyer hitting the raw
>      store API could place an unpaid "OTC" order that auto-dispatched. It now always
>      throws NOT_ALLOWED (safe: the counter flow pays via `markPaymentCollectionAsPaid`
>      → `pp_system_default`, never this provider).
>   3. **`cod_collected` omitted the delivery fee** — fee is metadata-only (never in
>      `order.total`) but is collected in cash at the door; auto-amount is now
>      `total + delivery_fee_php` (also added the `summary.*` fallback for the
>      computed-total query quirk).
>   4. **`pin_hash` leaked** from `GET /admin/riders` + `GET /admin/riders/:id`.
>   5. **Ledger bypass** — `PATCH /admin/dispatch/orders/:id` with
>      `delivery_status=delivered|refused` now routes through
>      `confirmDelivery`/`recordRefusal` instead of a bare field write.
>   6. **Rider manifest pagination** — `delivery_status=pending` now filtered in the DB
>      (history could push active orders out of the take-200 window); same class fixed in
>      `cod-reconcile` (date range now in the DB query).
>   7. **Cutoff-race stranded orders** — `assign-order-to-dispatch` rolls forward to the
>      next day's batch instead of throwing a 409 the subscriber swallows.
>   8. Late `rider_id` at delivery confirmation is persisted onto the dispatch order;
>      `cod-remitted` now requires a prior `cod_collected` row and a matching rider;
>      rider PATCH phone-uniqueness returns 409 instead of a raw 500.
>   **All of 1–8 RUNTIME-VERIFIED over live HTTP (2026-06-10 evening):** fee-inclusive
>   `cod_collected` (₱100 order + ₱30 fee → 13000 centavos, idempotent), warned→normal
>   recovery fired after a clean delivery (legacy row self-healed), raw-API OTC
>   completion rejected, remit guards 409'd, PATCH-delivered wrote the ledger row,
>   roll-forward landed an order on day+2 past a locked batch.
> - **Verification then exposed 4 MORE launch-blocking bugs (all fixed + runtime-verified
>   2026-06-10):**
>   1. **`customer-hub` link was 1:1** — after the first customer linked a hub, every
>      other customer's `POST /store/customers/me/hub` failed with "Cannot create
>      multiple links between 'customer' and 'hub'" (and unlinked customers' orders
>      never dispatch). Fixed with `isList: true` on the customer side; same
>      cardinality fix applied to `dispatch-batch-hub`, `pickup-window-hub-area`,
>      `cod-transaction-order` (currently-unpopulated tables, same landmine).
>      `pickup-slot-listing` (populated, 1:1) is intentionally untouched — flagged:
>      a listing re-reserving a slot after a no-show would hit the same error.
>   2. **COD checkout failed for EVERY logged-in customer** — `payment-cod`'s
>      accountability lookup runs in the payment module's isolated container, and the
>      Awilix cradle **throws** on unknown keys (it doesn't return undefined), so
>      `authorizePayment` crashed whenever a session had a customer (guests skipped the
>      check, which masked it). Provider check is now try/catch best-effort; the
>      **authoritative prepay-lock gate moved to a `completeCartWorkflow.hooks.validate`
>      hook** (`src/workflows/hooks/validate-cart-completion.ts`) — verified: locked
>      buyer's completion → not_allowed, unlocked → order placed.
>   3. **Dots in step names crash the workflow orchestrator** — `getPreviousStep`
>      splits step ids on `"."`, so `createStep("assign-order-to-dispatch.assign", …)`
>      made **every run of all 3 custom workflows** (dispatch assignment, dispute
>      resolution/strikes, pickup-slot reservation) die with `Cannot read properties of
>      undefined (reading 'id')`. Renamed to dash-only ids; assignment + dispute
>      resolution re-verified live end-to-end.
>   4. **Jobs weren't exec-runnable as their own docs instruct** — `npx medusa exec`
>      passes `{ container }` (ExecArgs) while the scheduler passes the bare container;
>      all 5 jobs now accept both.
> - **Phase B (notifications) BUILT + RUNTIME-VERIFIED (2026-06-10 night):** Resend email
>   provider for Medusa's Notification module (`src/modules/resend-notification`, raw
>   fetch — no SDK dep; without `RESEND_API_KEY` it logs + no-ops but still records the
>   notification row). Templates in `emails.ts` (pure, unit-tested); `sendEmail` helper
>   (`src/lib/notify.ts`) is best-effort everywhere — mail can never break a flow. Wired:
>   order placed (subscriber), batch in_transit (job), delivered + dispute opened
>   (`delivery-actions`), dispute resolved (route), membership approved/rejected/cancelled
>   (route). Live-verified: every template above produced a `success` notification row
>   through the real flows. **To go live: set `RESEND_API_KEY` + `EMAIL_FROM` (verified
>   domain) in env — everything else is already on.** Web Push remains a later add-on.
> - **Phase C (membership lifecycle) now ~done (2026-06-10):** new nightly
>   `membership-expiry-tick` (02:30) cancels expired memberships (+ removes from
>   `hub-members` group, emails "expired") and sends 30/7-day renewal reminders (once
>   each, flags re-armed on approval); the Special-tier gate now checks
>   `membership_expires_at`, not just status. Live-verified end-to-end (approve →
>   remind → expire → cancelled).
> - **Phase D (trader B2B pricing) backend BUILT + RUNTIME-VERIFIED (2026-06-11):**
>   negotiated per-trader discount as **automatic percentage promotions** (price lists
>   are absolute amounts — wrong primitive). Approving a trader
>   (`POST /admin/traders/:id {action:"approve", discount_percent, min_order_note?}`)
>   lazily creates a shared tier: customer group `traders-<pct>` + active automatic
>   promotion `TRADER-<pct>` (rule `customer.groups.id`), and moves the customer into
>   exactly one tier. Verified live: trader cart ₱100 → ₱90 with `TRADER-10`
>   auto-applied, guest cart untouched, revoke restores full price instantly,
>   re-approval reuses the tier (exactly one promotion row). `GET /store/trader-pricing`
>   exposes the state for storefront display; approve/revoke emails wired. **Remaining D
>   slice: storefront "your price" display** (consume `/store/trader-pricing`).
> - **Next on the roadmap (not started):** Phase F (address→hub resolution); the
>   **storefront trader-price display** (backend ready); the **rider PWA frontend**
>   (API ready); **producer payout disbursement** (gate exists). Web Push (Phase B
>   optional half) when wanted.
> - Full detail: **§9** status matrix, **§10** phase checkboxes (dated).

---

## Table of Contents
1. [What changed vs the v2 plan](#1-what-changed-vs-the-v2-plan)
2. [As-built architecture](#2-as-built-architecture)
3. [As-built data model](#3-as-built-data-model)
4. [Modules & responsibilities](#4-modules--responsibilities)
5. [Core flows (as built)](#5-core-flows-as-built)
6. [API surface (as built)](#6-api-surface-as-built)
7. [Admin surface (as built)](#7-admin-surface-as-built)
8. [Background jobs](#8-background-jobs)
9. [Shipped vs partial — status matrix](#9-shipped-vs-partial--status-matrix)
10. [Gaps & forward roadmap](#10-gaps--forward-roadmap)
11. [Risks to watch](#11-risks-to-watch)
12. [Deferred roadmap (superseded v2 ideas)](#12-deferred-roadmap-superseded-v2-ideas)

---

## 1. What changed vs the v2 plan

| Area | v2 plan said | As built |
|---|---|---|
| Repo layout | top-level `backend/`, `storefront/`, `rider-portal/`, `admin-extensions/` | Turbo monorepo: `apps/backend` + `apps/storefront`; admin pages live **inside** `apps/backend/src/admin`; **no** rider-portal app |
| Delivery | rider **first-grab** PWA + auto-release + rider penalties | **dispatch batches** with hub cutoff → lock → in_transit |
| Buyer trust | **Hub Credits** rewards wallet | **prepay-lock** accountability (refusal → strike → COD off, OTC-only) |
| Producer | `producer` module | `listing` module + storefront `producer`/`seller` flows |
| Pickup | `pickup-schedule` module | `pickup` module (windows + slots, capacity-locked) |
| Membership | `registration` module w/ DB tables | metadata-on-customer + `hub-members` customer group |
| Account types | Producer / Consumer / Trader | same (CPT); `seller`/`buyer` accepted as aliases |

Two conceptual things from v2 are **not built and intentionally so**: Hub Credits
and the rider first-grab PWA. They live in [§12](#12-deferred-roadmap-superseded-v2-ideas).

---

## 2. As-built architecture

```
freshhub/                         # Turborepo
├── apps/
│   ├── backend/                  # Medusa v2
│   │   └── src/
│   │       ├── modules/          # accountability, cod-ledger, delivery-fees,
│   │       │                     #   dispatch, hub, listing, payment-cod, pickup
│   │       ├── api/              # admin/ + store/ route handlers
│   │       ├── admin/routes/     # Medusa Admin custom pages (in-process)
│   │       ├── workflows/        # assign-order-to-dispatch, reserve-pickup-slot,
│   │       │                     #   resolve-dispute
│   │       ├── jobs/             # cron: lock/in-transit dispatch, expire pickup,
│   │       │                     #   clean-order-tick
│   │       ├── subscribers/      # order-placed, copy-delivery-metadata
│   │       ├── links/            # module-to-module links (hub↔customer, etc.)
│   │       └── migration-scripts/ # seeds (hubs, catalog, pickup windows, fees)
│   └── storefront/               # Next.js consumer store (incl. /producer flows)
└── IMPLEMENTATION_PLAN*.md
```

- **Payments:** custom `cod` payment provider, stays inside Medusa's
  initiate→authorize→capture flow.
- **Hub scoping:** every customer is linked to one hub; the catalog is per-hub.
- **Time:** all batch/cutoff math is fixed Asia/Manila (UTC+8, no DST).

---

## 3. As-built data model

Custom models (MikroORM via `model.define`). Medusa core tables (product, order,
customer, cart, payment, customer_group) are reused, not duplicated.

### hub  / hub_area
```
hub:        id, name, slug(unique), city, province, country=ph,
            timezone=Asia/Manila, dispatch_cutoff="12:00", dispatch_time="16:00",
            active, areas[]
hub_area:   id, name, postal_codes(json), barangays(json),
            pickup_day_of_week(json?), hub→
```

### product_listing  (producer listings)
```
product_listing: id,
  listing_type: direct_to_consumer | sell_to_freshhub,
  harvest_date?, pickup_window_id?,
  status: draft | pending_pickup | active | sold_out | expired | cancelled
```
Linked to a Medusa product (`product-listing` link) and to a hub (`product-hub`).

### pickup_window / pickup_slot  (sell-to-freshhub intake)
```
pickup_window: id, hub_id, hub_area_id, date, start_time, end_time,
               capacity_kg?, reserved_kg=0,
               status: open | full | closed | completed, slots[]
pickup_slot:   id, listing_id, estimated_kg,
               status: reserved | picked_up | no_show | rejected,
               picked_up_at?, notes?, pickup_window→
```

### dispatch_batch / dispatch_order  (delivery batching)
```
dispatch_batch: id, hub_id, dispatch_date, cutoff_at, dispatched_at?,
                status: collecting | locked | in_transit | completed, orders[]
dispatch_order: id, order_id, rider_id?, manifest_position=0, delivered_at?,
                delivery_status: pending | delivered | refused | missed | disputed,
                dispatch_batch→
```

### rider  (delivery riders)
```
rider: id, full_name, phone(unique), hub_id,
       status: active | inactive | suspended,
       pin_hash?(reserved for self-service login), notes?
```
`dispatch_order.rider_id` and `cod_transaction.rider_id` reference this id.

### hub_barangay_fee  (delivery pricing)
```
hub_barangay_fee: id, hub_id, barangay, standard_fee_php, special_fee_php,
                  active   — unique(hub_id, barangay)
```

### cod_transaction  (cash ledger)
```
cod_transaction: id, customer_id, order_id?,
                 type: cod_collected | rider_remitted | otc_collected | reconciled,
                 amount (centavos), reference?, rider_id?, recorded_by?, notes?
                 — unique(order_id, type) for idempotency
```

### buyer_account_status / refusal_dispute  (accountability)
```
buyer_account_status: id, customer_id(unique), strike_count=0,
  state: normal | warned | prepay_locked_30d | prepay_locked_permanent,
  state_until?, last_clean_order_at?, recovery_eligible_at?

refusal_dispute: id, order_id, dispatch_order_id, customer_id, rider_id?,
  rider_photo_url?, rider_notes?,
  buyer_reason: damaged_goods | wrong_item | not_home | other,
  buyer_notes?, buyer_responded_at?,
  producer_response?, producer_responded_at?,
  resolution: pending | buyer_fault | producer_fault | rider_fault | platform_fault,
  resolution_notes?, resolved_by?, resolved_at?
```

### Membership (no table — metadata on `customer`)
Keys: `membership_status` (pending|active|cancelled), `membership_tier`,
`membership_joined_at`, `membership_expires_at` (now+365d on approve),
`membership_requested_at`, `membership_payment_method`,
`membership_payment_reference`, `membership_events[]` (audit trail, capped 20).
Members are also mirrored into the `hub-members` customer group.

### Seller (no table — metadata on `customer`)
`account_type` (consumer|producer|trader; seller/buyer aliases),
`seller_verified`, `seller_verified_at`.

### Links
`customer-hub`, `product-hub`, `product-listing`, `pickup-slot-listing`,
`pickup-window-hub-area`, `dispatch-batch-hub`, `dispatch-order-order`,
`cod-transaction-order`, `refusal-dispute-order`, `buyer-account-status-customer`.

---

## 4. Modules & responsibilities

| Module | Owns | Notes |
|---|---|---|
| `hub` | hubs + service areas, cutoff/dispatch times, timezone | source of per-hub scoping |
| `listing` | producer product listings (both sell modes) + lifecycle | admin approve/reject; links product↔hub |
| `pickup` | sell-to-freshhub intake windows & slots, capacity in kg | concurrency-safe reservation |
| `dispatch` | delivery batches & per-order manifest | cutoff→lock→in_transit→completed |
| `rider` | delivery riders (per hub) + status | COD cash traced to a rider; suspendable |
| `delivery-fees` | per-(hub,barangay) standard/special fee table | drives the 3 checkout tiers |
| `payment-cod` | COD payment provider | enforces prepay-lock at authorize |
| `cod-ledger` | cash collected / remitted / reconciled | idempotent per (order, type) |
| `accountability` | buyer strikes & refusal disputes | escalation + nightly recovery |

Services are mostly Medusa auto-generated CRUD; **business logic lives in
workflows, jobs, and route handlers**.

---

## 5. Core flows (as built)

### 5.1 Hub scoping & catalog
- Customer is linked to one hub (`POST /store/customers/me/hub`).
- Catalog is per hub (`product-hub` link); store product reads are hub-filtered.
- Delivery + dispatch all key off the customer's hub.

### 5.2 Producer listing → pickup (sell-to-freshhub)
```
Seller (account_type=producer, seller_verified=true) creates a listing
  → direct_to_consumer: product goes through admin approve → active on storefront
  → sell_to_freshhub: reserve a pickup_window slot (reserve-pickup-slot workflow,
       per-window LOCK + capacity_kg check, listing↔slot link)
     → window flips to "full" when reserved_kg ≥ capacity_kg
     → nightly expire-pickup-windows closes past windows, orphan slots → no_show
```

### 5.3 Checkout → delivery tier selection
`GET /store/delivery-options?cart_id=` returns **3 tiers** for the cart's
(hub, barangay):

| Tier | Fee | ETA | Available when |
|---|---|---|---|
| Free | ₱0 | today/tomorrow at dispatch_time | before hub cutoff (12:00) |
| Standard | `standard_fee_php` | today, anytime | always |
| Special | `special_fee_php` | within ~1 hour | **Hub Members only** |

Chosen tier is written to cart metadata (`delivery_tier`, `delivery_fee_php`,
`delivery_barangay`, `delivery_hub_slug`) and copied to the order on placement
(`copy-delivery-metadata` subscriber). COD fee is collected in cash at the door.

### 5.4 Order → dispatch batch
```
order.placed → assign-order-to-dispatch workflow
  → resolve customer's hub + cutoff
  → find/create batch for (hub_id, dispatch_date); before cutoff = today, else tomorrow
  → append dispatch_order at next manifest_position
lock-dispatch-batches (*/15m):       collecting → locked   when cutoff_at passes
dispatch-batches-in-transit (*/15m): locked → in_transit   at hub dispatch_time
```
Failures in assignment are logged, never block checkout.

### 5.5 COD cash lifecycle
As built today (admin-recorded):
```
rider delivers → admin POST /admin/orders/:id/cod-collected   (cod_collected row)
rider hands cash to hub → POST /admin/orders/:id/cod-remitted  (rider_remitted row)
admin reconciliation view: GET /admin/cod-reconcile
```
Unique `(order_id, type)` index makes collected/remitted idempotent under races.

**Target (Phase E) — rider-driven, two separate events:**
- The rider's QR scan / "Delivered" action marks the order fulfilled **and**
  auto-records `cod_collected` — the rider is now on the hook for that cash. No
  admin step. The recorded amount is the full cash in hand: **order total +
  delivery fee** (`metadata.delivery_fee_php` — the fee never flows into
  `order.total` but is paid in cash at the door).
- **Delivered ≠ remitted.** Remittance (rider hands cash to hub) is a separate
  event; the reconcile view shows per-rider *collected − remitted = outstanding*.
- **Producer payout is gated on remittance, not delivery.**
- OTC (walk-in) has no remittance leg — cash is collected at the counter at
  purchase time.

### 5.6 Refusal → dispute → strike → prepay-lock
```
rider marks refusal → POST /admin/dispatch-orders/:id/refusal → creates refusal_dispute
buyer responds  → POST /store/customer/disputes/:id/respond (reason + notes)
seller responds → POST /store/seller/disputes/:id/respond
admin resolves  → POST /admin/disputes/:id/resolve → resolve-dispute workflow
  if buyer_fault: strike escalation
     1 strike  → warned
     2 strikes → prepay_locked_30d (state_until = +30d)
     3+ strikes→ prepay_locked_permanent
clean-order-tick (nightly 02:00):
     warned → normal (strikes reset) once recovery_eligible_at (= strike + 6mo,
       stamped at escalation) has passed AND a clean delivered order exists
       since the strike (last_clean_order_at, stamped by confirmDelivery)
     prepay_locked_30d past state_until → normal (strikes preserved)
     permanent → admin override only
```
**Enforcement:** `payment-cod.authorizePayment` blocks **COD** for any buyer in a
`prepay_locked_*` state. *Target (Phase A):* such buyers are not blocked outright
— they fall through to **OTC (pay at the hub counter)**, the launch prepay rail.
No online payment required.

### 5.7 Membership lifecycle
```
storefront request → membership_status=pending + payment ref on customer metadata
admin verifies payment → POST /admin/memberships/:id { action: approve }
  → status=active, expiresAt=now+365d, added to hub-members group
reject/cancel → status=cancelled
```
Members unlock the **Special (~1h)** delivery tier and are the hook point for
member pricing (price lists scoped to `hub-members`).

---

## 6. API surface (as built)

### Store
```
GET    /store/hubs                                  list active hubs
GET    /store/hubs/:slug                            hub detail
GET    /store/hubs/:slug/products                   hub catalog
GET    /store/hubs/:slug/barangays                  serviceable barangays
POST   /store/customers/me/hub                      set/clear my hub
GET    /store/delivery-options?cart_id=             3 delivery tiers for cart
POST   /store/delivery-options/select               choose tier → cart metadata
GET    /store/payment-methods                       COD/OTC eligibility (COD hidden if prepay-locked)
GET    /store/trader-pricing                        my trader discount state (display only)
POST   /store/carts/:id/line-items                  (custom add-to-cart)
# Seller (account_type=producer + seller_verified)
GET/POST /store/seller/products                     my listings / create listing
PATCH/GET /store/seller/products/:id                edit / read listing
GET    /store/seller/pickup-windows                 windows I can reserve
POST   /store/seller/uploads                        image upload (multer, ≤5×4MB)
POST   /store/seller/disputes/:id/respond           producer dispute response
# Buyer disputes
GET    /store/customer/disputes                     my disputes
POST   /store/customer/disputes/:id/respond         buyer dispute response
```

### Admin
```
GET/POST/PATCH /admin/hubs, /admin/hubs/:id
.../hubs/:id/areas[/:areaId]                         service areas
.../hubs/:id/barangay-fees[/:feeId]                  delivery fee table
GET/PATCH /admin/listings, /admin/listings/:id/{approve,reject}
GET/POST/PATCH /admin/pickup-windows[/bulk][/:id]    + /slots[/:slotId]
GET    /admin/dispatch/batches[/:id]                 dispatch board
GET/PATCH /admin/dispatch/orders/:id
POST   /admin/dispatch-orders/:id/refusal            open a refusal dispute
POST   /admin/dispatch-orders/:id/delivered          mark delivered + auto cod_collected (COD)
GET    /admin/disputes ; POST /admin/disputes/:id/resolve
GET/POST /admin/riders ; GET/PATCH /admin/riders/:id  rider management
GET    /admin/traders ; GET/POST /admin/traders/:id    trader approval + discount %
POST   /admin/orders/:id/cod-collected | cod-remitted | otc-collected
GET    /admin/orders/:id/cash-state                  settled? (payout gate)
GET    /admin/cod-reconcile                          cash reconciliation (rider + OTC)
GET/POST /admin/memberships ; POST /admin/memberships/:id  (approve|reject|cancel)
GET    /admin/sellers ; POST /admin/sellers/:id/verify
```

### Rider (self-service; HS256 rider token)
```
POST   /rider/auth/login                     phone + PIN → 30-day rider token (public)
GET    /rider/me                             my profile
GET    /rider/manifest                       my active-batch orders (by manifest_position)
POST   /rider/orders/:id/delivered           mark delivered + auto cod_collected (COD)
POST   /rider/orders/:id/refused             mark refused → opens dispute
```

Auth (`api/middlewares.ts`): `/store/seller*` requires a logged-in customer
(handler additionally checks `account_type`); all `/admin/*` custom routes
require an authenticated admin user; `/rider/*` (except `/rider/auth/login`)
requires a valid rider token via the `authenticateRider` middleware.

---

## 7. Admin surface (as built)

In-process Medusa Admin pages under `apps/backend/src/admin/routes/`:
`hubs`, `barangay-fees`, `listings`, `pickups` (+ window drawer), `dispatch`,
`disputes`, `cod-reconcile`, `memberships`, `sellers`.

---

## 8. Background jobs

| Job | Schedule | Does |
|---|---|---|
| `lock-dispatch-batches` | */15m | collecting → locked at cutoff |
| `dispatch-batches-in-transit` | */15m | locked → in_transit at dispatch_time |
| `expire-pickup-windows` | nightly 01:00 | close past windows; orphan slots → no_show |
| `clean-order-tick` | nightly 02:00 | buyer strike recovery (warned→normal, 30d lock expiry) |
| `rider-unremitted-tick` | nightly 03:00 | suspend riders over the unremitted-cash limit |
| `membership-expiry-tick` | nightly 02:30 | cancel expired memberships; 30/7-day renewal reminder emails |

---

## 9. Shipped vs partial — status matrix

| Capability | Status |
|---|---|
| Hub model + per-hub catalog scoping | ✅ shipped |
| Producer listings (direct + sell-to-hub) + admin approve/reject | ✅ shipped |
| Pickup windows/slots, capacity-locked reservation | ✅ shipped |
| Delivery fee tiers (free/standard/special) | ✅ shipped (2026-06-03) |
| Dispatch batching + cutoff + lock/in-transit | ✅ shipped (2026-05-22) |
| COD ledger (collected/remitted/reconcile) | ✅ shipped (~2026-05-28) |
| Refusal → dispute → strike → prepay-lock + recovery | ✅ shipped |
| Membership (metadata + group, admin approve) | ✅ shipped |
| Seller verification gate | ✅ shipped |
| **Walk-in OTC counter sales** (`/admin/otc-counter` → paid, dispatch-skipped order + `otc_collected`) | ✅ code-complete (Phase A, reframed 2026-06-10) — needs `db:migrate` + region seed + runtime verify (esp. stock-decrement fulfillment) |
| **Locked buyers blocked from online checkout** (no OTC online; "buy in person") | ✅ code-complete (Phase A, 2026-06-10) — needs runtime verify |
| **Transactional email** (Resend; 10 templates across order/dispute/membership flows) | ✅ shipped (2026-06-10) — set `RESEND_API_KEY` to enable delivery; Web Push still ❌ |
| **Membership expiry enforcement + renewal reminders** | ✅ shipped (2026-06-10) — nightly tick + 30/7d emails + expiry-aware tier gate |
| **Trader (B2B) pricing** | ✅ backend shipped (2026-06-11) — auto promotions per tier; storefront price display pending |
| **Rider entity + admin CRUD + delivered→collect + strikes** | ✅ shipped (Phase E, runtime-verified 2026-06-10) |
| **Rider self-service API** (login, manifest, delivered/refused) | ✅ shipped (Phase E, runtime-verified 2026-06-10) |
| **Rider PWA frontend** | ❌ missing (API ready; no rider-facing UI app yet) |
| **Producer-payout remittance gate** (`cash-state` / `settled`) | ✅ primitive ready; payout disbursement itself a separate phase |
| **Address → hub resolution** (multi-hub) | ⚠️ partial (city-name match, Tagum-only) |
| Online / GCash payment | ⏸️ deferred (no PayMongo budget; OTC covers prepay at launch) |
| QR codes / order labels | ⏸️ deferred (do not implement yet) |

---

## 10. Gaps & forward roadmap

Ordered by business priority. Each item is scoped to be a small, shippable slice.

### Phase A — Walk-in OTC counter (reframed 2026-06-10, highest priority)
**Problem:** `payment-cod.authorizePayment` blocks `prepay_locked_*` buyers from
COD. **Founder reframe (2026-06-10):** OTC is **walk-in only**, *not* an online
payment method — a locked buyer does **not** place an online order; they buy in
person at the hub like a normal retail purchase. So a locked buyer is **blocked
from online checkout** and directed to the counter. This also closes a latent
bug: the cart payment-providers list surfaced OTC online to *every* buyer, and
unpaid OTC orders would have auto-dispatched to riders.

> **Sealed founder decisions (kept):** (1) the universal upfront COD deposit was
> removed 2026-05-28 and stays removed; (2) there is **no first-order COD cap or
> any upfront gate** — bogus buyers are handled by the strike system + same-day
> resale of returned produce. Neither is to be reintroduced without an explicit
> founder call.

- [x] **Block online checkout for locked buyers (2026-06-10):** `GET /store/payment-methods`
      returns `checkout_blocked`/`block_reason`; storefront filters OTC out for
      everyone and, for locked buyers, drops COD too → empty methods → "buy in
      person at the hub" notice, submit hidden. COD `authorizePayment` block stays
      the safety net.
- [x] **OTC Counter register (2026-06-10):** `POST /admin/otc-counter` creates a real
      Medusa order via `createOrderWorkflow` (metadata `sale_channel="otc_counter"`),
      marks it paid (`createOrderPaymentCollectionWorkflow` + `markPaymentCollectionAsPaid`,
      provider `pp_otc_freshhub`), records `otc_collected`, and best-effort fulfills to
      decrement stock. `GET /admin/otc-counter` = today's drawer total. Admin page at
      `src/admin/routes/otc-counter`.
- [x] **Dispatch-skip (2026-06-10):** `order-placed` subscriber returns early for
      `metadata.sale_channel === "otc_counter"` (belt-and-suspenders;
      `createOrderWorkflow` doesn't emit `order.placed`). Walk-in OTC never reaches a rider.
- [x] **OTC cash unchanged (2026-06-10):** `otc_collected` ledger type (model +
      `Migration20260610120000`), hub-held, **no remittance leg**; `cod-reconcile`
      reports it separately. Shared `recordOtcCollected` (`src/lib/otc-sale.ts`); legacy
      `POST /admin/orders/:id/otc-collected` kept (deprecated). **Needs `db:migrate` +
      runtime verification, esp. the fulfillment/stock-decrement step.**
- [ ] Online/GCash prepay stays **deferred** (no PayMongo budget yet — see §12);
      when added it slots in as a separate online source with no redesign.

### Phase B — Notifications (email + push)
**Problem:** no subscriber sends any email/push. Order confirmations, dispute
updates, membership approvals, and renewal reminders are all silent today.
- [x] **Resend transactional email (2026-06-10):** provider module
      `src/modules/resend-notification` (channel `email`, plain fetch, no-op +
      warn without `RESEND_API_KEY`), pure templates in `emails.ts`, best-effort
      `sendEmail` in `src/lib/notify.ts`. Wired: order placed, dispatch
      in_transit, delivered, dispute opened/resolved, membership
      approved/rejected/cancelled, membership expiring (30/7d) + expired.
      Runtime-verified through the real flows (notification rows `success`).
- [ ] Web Push for delivery status (consumer) — optional, after email.

### Phase C — Membership lifecycle automation
**Problem:** `membership_expires_at` is set but nothing enforces it. The Special
tier checks `membership_status==active` only, not the expiry date.
- [x] Nightly `membership-expiry-tick` (2026-06-10): active memberships past
      `expires_at` → cancelled + removed from `hub-members` group + "expired" email.
- [x] Renewal reminder emails 30/7 days (2026-06-10) — sent once per window
      (`membership_reminder_{30,7}_sent`), re-armed on approval.
- [x] Tier gating checks expiry, not just status (2026-06-10) — both
      delivery-options routes.
- [ ] Storefront renewal flow (today renewal = pay at counter / new request).

### Phase D — Trader (B2B) pricing
**Problem:** Trader is a recognized account type but there is no B2B pricing.
For a perishable hub, bulk buyers clear volume fast — high ROI.
- [x] **Negotiated discount % per trader (2026-06-11)** — implemented as
      **automatic percentage promotions** per tier (`TRADER-<pct>` + group
      `traders-<pct>`, rule `customer.groups.id`), NOT price lists (those are
      absolute amount overrides, not percentages). Shared helpers in
      `src/lib/trader.ts`; tiers created lazily, reused across traders.
- [x] **Admin trader approval + discount entry + min-order note (2026-06-11)** —
      `GET /admin/traders[?approved=]`, `GET/POST /admin/traders/:id`
      (approve/revoke; re-approve to renegotiate). Approval emails wired.
- [ ] Storefront shows trader their discounted price ("your price" on product
      pages) — backend ready: `GET /store/trader-pricing` returns
      `{approved, discount_percent, min_order_note}`; the cart/order discount is
      already server-enforced regardless of display.

### Phase E — Rider operations & accountability
**Problem:** `rider_id` is free text on `dispatch_order` *and* `cod_transaction`;
there is no rider entity, auth, manifest view, or rider-side capture. A real
rider record is a **launch necessity** (COD cash must be traced to a rider) and
is also the foundation any future gig model would need.
- [x] **Rider entity (2026-06-10):** `rider` module (id, full_name, phone[unique],
      hub_id, status[active|inactive|suspended], pin_hash, notes) +
      `Migration20260610130000`; registered in `medusa-config.ts`. `rider_id`
      fields now hold a real rider id.
- [x] **Admin CRUD (2026-06-10):** `GET/POST /admin/riders`, `GET/PATCH
      /admin/riders/:id` (admin-only; no self-signup). Admin clears a suspension
      by PATCHing status back to `active`.
- [x] **Delivered action (2026-06-10):** `POST /admin/dispatch-orders/:id/delivered`
      → marks delivered **and** auto-records `cod_collected` for COD (rider owes
      the cash; skipped for already-paid OTC). **Refused** already exists
      (`.../refusal`). *Admin/cashier-operated for now (matches the refusal
      route); a `/rider/*` surface is the auth slice below.*
- [x] **Remittance separate (2026-06-10):** delivery records collection only;
      `rider_remitted` stays its own event; per-rider outstanding =
      `cod_collected − rider_remitted` (rider-strike job already sums it).
- [x] **Rider accountability (2026-06-10):** `rider-unremitted-tick` job
      (nightly) suspends an active rider whose unremitted balance exceeds
      `RIDER_UNREMITTED_LIMIT_CENTAVOS` (default ₱5,000). Recovery is admin-driven.
- [x] **Rider self-service auth + `/rider/*` (2026-06-10):** self-contained HS256
      rider token (no extra dep); `POST /rider/auth/login` (phone+PIN, scrypt
      hash), `GET /rider/me`, `GET /rider/manifest` (their active batch orders),
      `POST /rider/orders/:id/{delivered,refused}` (ownership-checked). Shared
      `confirmDelivery` / `recordRefusal` helpers back both the rider and admin
      routes. Admin rider create/update accept a `pin`.
- [x] **Enforce suspension on assignment (2026-06-10):** `PATCH /admin/dispatch/orders/:id`
      and the `delivered` route reject assigning a non-`active` rider (409).
      Unassigning and completing in-flight deliveries stay allowed.
- [x] **Aging refinement (2026-06-10):** strike job now suspends on balance
      **or** oldest-unremitted age (per-order matched; `RIDER_UNREMITTED_AGING_DAYS`,
      default 3).
- [x] **Producer-payout gate primitive (2026-06-10):** `getOrderCashState` +
      `GET /admin/orders/:id/cash-state` expose `settled` (OTC paid, or COD
      collected **and** remitted). *The payout disbursement itself is a separate
      phase; this is the gate it must read instead of "delivered".*

### Phase F — Multi-hub readiness
**Problem:** hub resolution in `delivery-options` matches on `city` string and
assumes Tagum. The data model already supports areas/barangays/postal codes.
- [ ] Resolve hub from address → `hub_area` (barangay/postal), not city name.
- [ ] Cross-hub "also available at <hub>" search (per existing product memory).

### Phase G — Dispute fairness & SLAs
- [ ] Buyer/seller response SLA timers; auto-resolve or escalate on no-response
      (`buyer_responded_at` already captured).
- [ ] Buyer-facing dispute status + appeal path so legit produce-quality
      complaints don't silently become strikes.

### Phase H — Hardening
- [ ] COD shortfall handling (collected ≠ order total) + remittance aging report.
- [ ] Tests for delivery-tier resolution, membership gating, dispute escalation.
- [ ] PostgreSQL backup strategy; basic observability on jobs.

---

## 11. Risks to watch

| Risk | Why it bites here | Mitigation |
|---|---|---|
| **Prepay-locked buyers can't get delivery** | OTC is walk-in only, so locked buyers lose online ordering entirely and must come to the hub | **Intended** deterrent (untrusted buyers transact in person); Phase A blocks their online checkout and points them to the **OTC Counter** |
| **Delivery latency vs expectations** | Batch model = "wait for next cutoff"; "Special within 1h" is promised but dispatch is batch-based | Make Special a genuine on-demand path or set ETAs honestly at checkout |
| **Rider deliver-and-pocket** | "Delivered" releases the order while the rider still holds the cash | Delivered ≠ remitted; producer payout gated on remittance; rider-strike block on aged unremitted balance (Phase E) |
| **Disputes feel unfair** | Auto-strikes on legit quality complaints alienate good buyers | Phase G appeals + clear buyer-facing status |
| **Silent system** | ~~No emails/push~~ Email shipped 2026-06-10; delivery OFF until `RESEND_API_KEY` is set | Set the key + verified `EMAIL_FROM`; Web Push later |
| **Membership expiry not enforced** | ~~resolved 2026-06-10~~ nightly tick + reminders + expiry-aware gate | Watch the 02:30 job logs |
| **City-name hub matching** | Breaks the moment a second hub launches | Phase F address→hub resolution |
| **Perishable write-offs on refusal** | Refused COD produce can't be restocked; strikes only deter *repeat* refusers | Same-day resale of returned goods (founder's model) + strikes; first refusal absorbed (no upfront gate, by decision) |
| **Membership state in metadata only** | No first-class table → admin list scans 1000 customers in memory | Move to link table / view when user base grows |

---

## 12. Deferred roadmap (superseded v2 ideas)

Kept intentionally out of the build for now; revisit when the trigger condition hits.

- **Hub Credits (rewards wallet).** A retention lever, not a survival one.
  Revisit when repeat-purchase rate is the bottleneck. Even then, GCash cashback
  may beat an in-house 12-month-expiry ledger.
- **Rider first-grab PWA + auto-release + rider penalties.** Needs order/rider
  density the single Tagum hub doesn't have yet. Batch dispatch is the right
  model at launch. Revisit when one hub exceeds batch capacity or genuine
  on-demand demand (Special tier) justifies it.
- **Online / GCash payment (PayMongo etc.).** Deferred — no budget at launch, and
  OTC already provides a cash prepay rail. Add when affordable; it slots in as
  another payment source (no redesign), and can also collect membership fees.
- **QR codes / printable order labels.** Phase 7 in v2; currently stub-only.
  Pairs naturally with Phase E (rider proof of delivery).

---

*As-built plan v3 | Generated 2026-06-10 | First hub: Tagum City, Davao del Norte*
*Companion to (does not replace) IMPLEMENTATION_PLAN.md v2.*
