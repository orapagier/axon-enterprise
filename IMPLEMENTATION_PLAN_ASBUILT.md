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
> - **Hubs are per-CITY and all operations are hub-local (founder call 2026-06-11).**
>   A hub/store per barangay is unaffordable; Tagum Hub processes Tagum City only.
>   The city is the service boundary — barangays matter only INSIDE a hub's city
>   (fee table, service areas). Cross-city barangay/postal hub resolution is
>   intentionally not built.

> **▶ Runtime verification (2026-06-14) — read this first if resuming.**
> The 2026-06-13 batch + stackable-role conversions are now **RUNTIME-VERIFIED over
> live HTTP** (throwaway admin + minted customer sessions against the running
> backend/storefront; all fixtures cleaned up afterwards). 26 HTTP assertions +
> exec data-state checks; **50/50 jest unit tests still pass**, backend `tsc` clean
> (one *pre-existing, unrelated* error in `migration-scripts/purge-dev-data.ts`,
> `deleteFulfillments` typo — not touched here).
> - **Launch-blocker FOUND + FIXED — producer payout insert was 500ing.** The
>   `producer_payout` model declared `gross_centavos`/`amount_centavos` as
>   `model.bigNumber()`, but `Migration20260613130000` created plain `numeric`
>   columns with **no companion `raw_*_centavos` jsonb columns** BigNumber needs —
>   so **every `createProducerPayouts` insert threw** `column "raw_gross_centavos"
>   does not exist` (both the admin "Mark paid" DTC remit and the hub-intake form).
>   The 50/50 unit tests never caught it (they exercise `listOwedDtc` math, never a
>   DB insert). Fixed to `model.number()` to match the cod-ledger centavos
>   convention (works against the existing `numeric` columns; no new migration).
>   Re-verified: `hub_intake` records cleanly (amount ₱250 = 25000¢, gross ₱300 =
>   30000¢) and shows in `recent`.
> - **Verified PASS:** catalog empty (0 live/total products + listings, via DB + the
>   store hub-products API); **rider PWA removal** (`api/rider-app/` and
>   `api/rider/auth/*` deleted; the `/rider/*` token API — manifest/me/summary/
>   delivered/refused — intact; `authenticateRider` 401s every `/rider/*` incl. the
>   now-deleted auth paths); **Web Push backend** (`push-notification` module
>   resolves, table present, `POST/DELETE /store/push/subscribe` persist + upsert +
>   validate keys (400) + auth-gate (401)); **trader pricing** (admin approve with
>   no `discount_percent` → **defaults to 10%**, `GET /store/trader-pricing` reflects
>   it, revoke clears); **producer payouts** (owed shape, `dtc_remit` on an unsettled
>   order → **409 gate**, hub-intake records — see fix above); **membership renewal**
>   (approve **extends +365d from the current expiry, not now** → no days lost; join
>   date preserved; `renewal_pending`/payment-ref cleared; **rejecting a renewal
>   keeps the member active** with term untouched); **stackable roles** (`POST
>   /store/customers/me` `roles[]` persists; the seller guard reads live roles —
>   consumer → "Producer account required", producer → `PROFILE_INCOMPLETE`).
> - **Correction to the 2026-06-13 note below:** `/rider-app` no longer **302s** —
>   the route handler was *deleted* in the batch, so it now **404s** (and all
>   `/rider/auth/*` handlers are gone). Treat the "302 → storefront" wording as
>   superseded.
> - **Still genuinely manual (needs a real browser/phone — cannot be automated
>   here):** the end-to-end Web Push round-trip (an actual notification delivered to
>   a subscribed browser, needs a secure-context `PushManager`); a real-phone visual
>   pass of `/account/rider`; storefront *visual* rendering of the trader struck
>   price / producer-payouts / renewal UI (their data/API paths are verified).
>
> **▶ Current build state (2026-06-13) — read this first if resuming.**
> - **Six-item batch BUILT + TS-CLEAN + 50/50 unit tests (2026-06-13):**
>   1. **Trader-price display + admin editor.** Storefront now shows an approved
>      trader their negotiated "Trader −X%" price (struck list price) on product
>      detail, mobile actions, and product cards — computed from the customer's own
>      `trader_discount_percent` metadata (no extra fetch), trader > member > free
>      priority (`src/lib/util/trader.ts`). New admin **Traders** page
>      (`src/admin/routes/traders/page.tsx`) edits the discount per trader; approval
>      **defaults to 10%** when none is entered (`DEFAULT_TRADER_DISCOUNT` in
>      `src/lib/trader.ts`, applied in `POST /admin/traders/:id`).
>   2. **Producer payouts (founder calls): DTC = hub-collects-then-remits;
>      sell-to-hub = cash-in-person ledger.** New `producer-payout` module + table
>      (`Migration20260613130000`, APPLIED) + admin **Producer payouts** page
>      (`src/admin/routes/producer-payouts/page.tsx`) and `GET/POST
>      /admin/producer-payouts`. "Owed" tab lists **settled** DTC orders grouped by
>      producer (attributed via product `metadata.seller_customer_id`; gated on
>      `getOrderCashState().settled`) with a commission% → net "Mark paid"; a
>      hub-intake form records cash payouts; history below. Owed math in
>      `src/lib/producer-payout.ts`. One remittance per (order, producer).
>   3. **Membership renewal.** Active/grace members get a **Renew** disclosure on
>      `/account/membership` running the same payment form; submitting sets a
>      `membership_renewal_pending` flag WITHOUT downgrading (perks stay on). Admin
>      approve now **extends from max(now, current expiry)** (never lose remaining
>      days) and preserves join date; the pending queue surfaces renewals (New vs
>      Renewal badge); rejecting a renewal drops only the request (keeps the term);
>      `cancelMembershipRenewal` storefront action.
>   4. **Web Push (Phase B push half) BUILT.** New `push-notification` module +
>      `push_subscription` table (`Migration20260613120000`, APPLIED), customer-auth
>      `POST/DELETE /store/push/subscribe`, best-effort `sendPush`
>      (`src/lib/push.ts`, web-push lib, env-gated like Resend, prunes dead 404/410
>      subs) wired into **order in-transit + delivered** (alongside email).
>      Storefront: `public/push-sw.js` (push + click only, no fetch handler),
>      `PushOptIn` card on the account Overview, `src/lib/data/push.ts`. **VAPID keys
>      set** in both env files (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`
>      backend; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` storefront). **Runtime needs a backend
>      + storefront restart** (new modules + env read only at boot) and a secure
>      context/real browser to verify end-to-end.
>   5. **Catalog cleaned.** All test/sample listings removed — the Banana test
>      listing (`prod_01KTX843…`/`01KTX8441…`) + 2 other DTC test listings
>      soft-deleted via `src/migration-scripts/cleanup-orphan-listings.ts`
>      (idempotent). Now **0 live products, 0 live listings** — launch-ready empty.
>   6. **Legacy rider PWA REMOVED.** Deleted `src/rider-app/`, `src/api/rider-app/*`,
>      and the PWA auth routes `src/api/rider/auth/{login,signup,hubs,google}` +
>      orphaned `src/lib/google-oauth.ts`. The `/rider/*` token API
>      (manifest/me/summary/delivered/refused) and the storefront rail
>      (`/store/riders/session` + `/store/riders/register`) are untouched — riders
>      still log in via the storefront. `authenticateRider` now requires a token on
>      every `/rider/*` path (no public exemptions left); `rider.pin_hash` kept as
>      vestigial. `rider-auth.ts` signup-ticket helpers removed.
>   - **Heads-up:** `npx medusa db:migrate` prompts to DROP some stale link tables
>     (e.g. `cod_ledger.buyer_wallet`) — pre-existing orphans unrelated to this work;
>     left untouched (do not confirm those deletions without a decision).
>   - **Still manual / not done:** real-phone pass of `/account/rider`; real-browser
>     web-push round-trip after restart; the rider Google OAuth callback URI (now
>     moot — those routes are gone).
>
> **▶ Prior build state (2026-06-12).**
> - **Upgrade payment flow RUNTIME-VERIFIED + test data PURGED (2026-06-12 PM):**
>   the producer/trader yearly-registration payment rail (OTC cash at the counter
>   or **GCash 09631225067 / Jelmar Orapa**, both manually verified by an admin)
>   was exercised end-to-end over live HTTP: customer submitted a GCash reference →
>   `membership_status=pending` → `/account/account-types` shows **“Verifying
>   payment”** (no longer a false “Active” — the original bug) → listing creation
>   422 `MEMBERSHIP_INACTIVE` while pending → admin queue
>   (`GET /admin/memberships?status=pending`) showed method+reference →
>   `POST /admin/memberships/:id {action:"approve"}` flipped status to active
>   (expires +365d) → the same listing POST passed the membership gate. Bank
>   transfer stays disabled until a receiving account is configured
>   (`MEMBERSHIP_PAYOUT` in `apps/storefront/src/lib/util/membership.ts`).
>   **Test-data purge (founder-approved):** `cleanup-test-data.ts`
>   (migration-scripts, idempotent, run via `medusa exec`) kept only
>   orapajelmar@gmail.com, funchamheart@gmail.com, escuderohazelmae@gmail.com and
>   removed 15 test customers (incl. oraparamlej@gmail.com per explicit
>   instruction), 4 test products + all 5 listing rows, soft-deleted 2 test riders
>   + 15 test orders, and dropped 2 test admin users + orphan auth identities.
>   The storefront catalog is now EMPTY (0 live products) until a real producer
>   lists.
> - **Stackable account roles BUILT + TS-CLEAN + 50/50 unit tests (2026-06-12, founder
>   call):** account types are no longer exclusive — every customer is a **Consumer
>   base**, and Producer / Trader / Rider are roles stacked on top via
>   `customer.metadata.roles` (array; legacy single `account_type` still honoured as a
>   fallback until a roles array exists — once present, `roles` is authoritative so
>   downgrades stick). Shared helpers `hasRole`/`rolesOf` live in
>   `apps/backend/src/lib/roles.ts` + storefront mirror `src/lib/util/roles.ts`; ALL
>   guards now use them (seller routes ×3, `isTraderAccount`, admin sellers/traders,
>   producer pages, account/header navs — navs show every role's entry, e.g.
>   producer-rider sees My Listings + Deliveries). **Rules:** Producer ⊕ Trader
>   (mutually exclusive, traders buy B2B and never list); Rider combines with either.
>   **Conversions:** new `/account/account-types` page — add Producer or Trader via
>   server actions in `src/lib/data/roles.ts` (asks only the missing info; trader lands
>   `trader_approved=false` → existing admin Traders approval), add Rider via the
>   existing `/account/rider` registration which now also stamps the rider role
>   (backend register route). **Yearly fee + 30-day grace:** producer/trader
>   registration uses the membership_* rail (pay at hub → admin approves; renewal =
>   same as first registration). `membership-expiry-tick` reworked: active→`grace` at
>   expiry (`membership_grace_until`=+30d, new `membership-grace` email, perks STAY ON
>   during grace — `validateProducerEligibility` + `getMembership` accept "grace");
>   grace→**downgrade** past the window (status=cancelled, producer/trader role
>   stripped, **producer listings DELETED** (founder call), hub-members +
>   `traders-<pct>` groups removed, trader approval cleared, reworded
>   `membership-expired` email). Admin membership approve clears the grace flag.
>   Migration `migrate-roles.ts` RUN against the dev DB (17 customers seeded).
>   Storefront + backend `tsc` clean; smoke: `/ph/account/account-types` 200 on dev.
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
> - **Phase F reframed + enforced (2026-06-11):** per the founder call above, city-level
>   hub matching is the *intended* model, not a gap. What WAS missing is enforcement of
>   hub-locality: delivery-options used to trust the typed address city, so (with a 2nd
>   hub) a Tagum-linked buyer with a Davao address would get Davao fees while dispatch
>   put the order on the Tagum batch. Now `src/lib/resolve-hub.ts` resolves the hub from
>   the customer's **home hub** and rejects addresses outside its city (400 with a clear
>   message); guests still match by city. Runtime-verified (Tagum address → 3 tiers;
>   Davao address → rejected; guest → city match). Cross-hub "also available at <hub>"
>   search stays future.
> - **Rider PWA BUILT + API-LOOP-VERIFIED (2026-06-11):** single-file, mobile-first PWA
>   served BY THE BACKEND at **GET /rider-app** (same-origin → zero CORS config; no new
>   app/deploy target; installable via /rider-app/manifest + /rider-app/sw). Vanilla
>   HTML/JS in `src/rider-app/app-html.ts` (TS string export so `medusa build` ships it).
>   Login (phone+PIN) → run sheet of waybill-style stop tickets (customer, barangay,
>   address, tap-to-call, **COLLECT amount = total + delivery fee** in mono), Delivered /
>   Refused bottom-sheet confirms with a rubber-stamp effect, day strip (stops left /
>   done / collected today) and a sticky **cash-in-hand bar** that warns near and over
>   the ₱5,000 remit limit. New **GET /rider/summary** backs it (outstanding =
>   collected−remitted per order, today's tally, limit — same math as the suspension
>   job). Verified live end-to-end: login → summary (₱230 outstanding) → manifest stop
>   (collect ₱250) → delivered → summary ₱480 / today 1 / manifest empty. SW is
>   network-first on the shell only — /rider/* is never intercepted (a silently queued
>   "delivered" would lie about cash). **Visual pass on a real phone still recommended:**
>   open `http://<backend>/rider-app`, log in, add to home screen.
> - **Rider "Sign in with Google" BUILT + ROUTE-VERIFIED (2026-06-11):** the PWA login
>   now offers Google next to phone+PIN, mirroring the storefront's auth rail. Backend
>   code flow at **GET /rider/auth/google/start → callback** (state nonce in a 10-min
>   httpOnly cookie scoped to `/rider/auth/google`; same GOOGLE_CLIENT_ID/SECRET as the
>   storefront, now also in backend .env). The callback matches the **verified Google
>   email against the new admin-registered `rider.email`** column (lowercased; partial
>   unique index; settable via POST/PATCH /admin/riders — riders still never
>   self-signup) and redirects to `/rider-app#rt=<token>` with the same 30-day HS256
>   rider token phone+PIN issues (errors come back as `#gerror=<code>`; the app maps
>   them to friendly messages). Both google paths exempted *inside* `authenticateRider`
>   (cumulative-middleware rule). Verified live: start 302s to Google with correct
>   client/redirect/state, bogus state → `gerror=state`, valid-state-bad-code →
>   `gerror=auth_failed`, migration applied. **Remaining manual steps:** add
>   `<backend origin>/rider/auth/google/callback` as an authorized redirect URI on the
>   Google OAuth client, set each rider's email via /admin/riders, then a real-account
>   round-trip on a phone.
> - **Rider login + run sheet MOVED INTO THE STOREFRONT — RUNTIME-VERIFIED (2026-06-11,
>   supersedes the standalone PWA above):** riders now sign in on the storefront like any
>   user (OTP / Google customer auth — no separate login page, no PIN) and work deliveries
>   from **/account/rider** ("Deliveries" tab, rider-typed accounts only). Rail:
>   **GET /store/riders/session** (customer-authenticated) matches customer.email ↔
>   rider.email and exchanges the session for the same 30-day HS256 rider token, which the
>   storefront uses SERVER-SIDE against the unchanged `/rider/*` API (token never reaches
>   the browser; `apps/storefront/src/lib/data/rider.ts`). **POST /store/riders/register**
>   creates a pending rider from the signed-in customer (email taken from the session, not
>   the body; no PIN needed) — the /account/rider page walks register → pending (pay bond)
>   → suspended/inactive notice → active run sheet (stats, cash-in-hand bar vs ₱5k limit,
>   stop tickets with tap-to-call + collect = total + fee, Delivered/Refused confirm
>   sheet). **GET /rider-app now 302s to the storefront /account** (legacy shell kept in
>   `src/rider-app/app-html.ts`; /rider/* API and PIN login remain for any old tokens).
>   Verified live end-to-end: customer signup → exchange (`rider:null`) → register (201
>   pending, token null) → admin-activate → exchange token works on /rider/manifest →
>   seeded stop → **Delivered through the browser UI** (manifest 1→0, cod_collected
>   idempotent) — plus negatives (customer JWT on /rider/* → 401, anonymous exchange →
>   401). Dev DB keeps test user `rider-e2e@test.mfh` (active rider, Tagum hub).
> - **Storefront UI sweep (2026-06-11):** playwright audit at 320/390/1440px across all
>   pages (anonymous + logged-in + carted). Fixed: account **Overview was fully hidden on
>   mobile** (`hidden small:block`) — rebuilt on-brand with role shortcut card (rider →
>   run sheet, producer → listings); **Disputes page 401'd for every customer** (client
>   components called the JWT-guarded endpoint from the browser; now server-side via
>   `lib/data/disputes.ts`, banner is an RSC); footer newsletter button overflowed the
>   viewport (input `min-w-0`); product grids were 3-up at phone width (now 2-up
>   `grid-cols-2 xsmall:grid-cols-3` in store/related/featured); barangay combobox label
>   overlapped its "Pick city first" placeholder; profile rendered literal "null null" /
>   "null"; cart showed "Variant: Default" noise; free-shipping nudge fixed 400px width;
>   side-menu selects min-w-[320px] overflowed 320px phones; rider signup notice copy now
>   matches the bond flow; rider onboarding redirects to /account/rider. Storefront
>   `next build` clean, backend tsc clean, 43/43 unit tests pass.
> - **Next on the roadmap (not started):** the **storefront trader-price display**
>   (backend ready); **producer payout disbursement** (gate exists). Web Push (Phase B
>   optional half) when wanted. Manual: real-phone pass of /account/rider; consider
>   removing the rider Google PWA routes (`/rider/auth/google/*`) once storefront-only
>   login is confirmed in the field.
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
│   # rider PWA is NOT a separate app — served by the backend at /rider-app
│   # (src/rider-app/app-html.ts), same-origin with the /rider/* API
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
GET    /store/customer/disputes                     my disputes (+ appeal_eligible per row)
POST   /store/customer/disputes/:id/respond         buyer dispute response
POST   /store/customer/disputes/:id/appeal          buyer appeals a buyer_fault strike (14-day window)
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

### Rider app (DEPRECATED 2026-06-11 — riders use the storefront /account/rider)
```
GET    /rider-app                            302 → <storefront>/account (legacy shell kept in src/rider-app/)
GET    /rider-app/manifest                   web app manifest (legacy installs)
GET    /rider-app/sw                         service worker (legacy installs)
```

### Rider session via storefront (customer JWT; the new primary rail)
```
GET    /store/riders/session                 customer session → rider + 30-day rider token
                                             (email match; token null unless status=active)
POST   /store/riders/register                signed-in customer self-registers as a
                                             pending rider (email from session, no PIN)
```

### Rider (self-service; HS256 rider token — used server-side by the storefront)
```
POST   /rider/auth/login                     phone + PIN → 30-day rider token (public, legacy)
GET    /rider/me                             my profile
GET    /rider/summary                        my cash position (outstanding/limit/today)
GET    /rider/manifest                       my active-batch orders (by manifest_position)
POST   /rider/orders/:id/delivered           mark delivered + auto cod_collected (COD)
POST   /rider/orders/:id/refused             mark refused → opens dispute
```

Auth (`api/middlewares.ts`): `/store/seller*` and `/store/riders*` require a
logged-in customer (handlers additionally check role/ownership); all `/admin/*`
custom routes require an authenticated admin user; `/rider/*` (except the
`/rider/auth/*` entry points) requires a valid rider token via the
`authenticateRider` middleware.

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
| **Transactional email** (Resend; 10 templates across order/dispute/membership flows) | ✅ shipped (2026-06-10) — live since 2026-06-12 |
| **Web Push** (delivery in-transit + delivered) | ✅ backend RUNTIME-VERIFIED (2026-06-14) — module loads, table present, `POST/DELETE /store/push/subscribe` persist/upsert/validate/auth-gate; VAPID set. Real-browser push-delivery round-trip still manual |
| **Membership expiry enforcement + renewal reminders** | ✅ shipped (2026-06-10) — nightly tick + 30/7d emails + expiry-aware tier gate |
| **Membership renewal (self-service)** | ✅ RUNTIME-VERIFIED (2026-06-14) — approve extends +365d from current expiry (no days lost), join date preserved, renewal_pending cleared; rejecting a renewal keeps the member active |
| **Trader (B2B) pricing** | ✅ RUNTIME-VERIFIED (2026-06-14) — admin approve defaults to 10%, `GET /store/trader-pricing` reflects it, revoke clears; auto-promotion tiers (2026-06-11) |
| **Producer payouts** (DTC remit + hub-intake cash ledger) | ✅ RUNTIME-VERIFIED (2026-06-14) — `dtc_remit` settled-gate 409s, hub-intake records. **Fixed a launch-blocker:** bigNumber→number centavos (insert was 500ing on missing `raw_*` columns) |
| **Rider entity + admin CRUD + delivered→collect + strikes** | ✅ shipped (Phase E, runtime-verified 2026-06-10) |
| **Rider self-service API** (login, manifest, delivered/refused) | ✅ shipped (Phase E, runtime-verified 2026-06-10) |
| **Rider PWA frontend** | ✅ shipped (2026-06-11) — served by the backend at `/rider-app` (installable, same-origin); needs a real-phone visual pass |
| **Rider "Sign in with Google"** | ✅ shipped (2026-06-11) — `/rider/auth/google/start`+`callback` match verified Google email to admin-set `rider.email`, issue the same rider token; needs callback URI registered on the Google client + rider emails set + real-account round-trip |
| **Producer-payout remittance gate** (`cash-state` / `settled`) | ✅ primitive ready; payout disbursement itself a separate phase |
| **Address → hub resolution** | ✅ by design city = hub service boundary (founder 2026-06-11); home-hub + city enforcement shipped (`src/lib/resolve-hub.ts`) |
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
- [x] **Web Push for delivery status (consumer) — built 2026-06-13.**
      `push-notification` module + `push_subscription` table, customer-auth
      `POST/DELETE /store/push/subscribe`, best-effort `sendPush`
      (`src/lib/push.ts`) on order in-transit + delivered, `public/push-sw.js`,
      and a `PushOptIn` card on the account Overview. VAPID keys in env; needs a
      server restart + real-browser round-trip to verify.

### Phase C — Membership lifecycle automation
**Problem:** `membership_expires_at` is set but nothing enforces it. The Special
tier checks `membership_status==active` only, not the expiry date.
- [x] Nightly `membership-expiry-tick` (2026-06-10): active memberships past
      `expires_at` → cancelled + removed from `hub-members` group + "expired" email.
- [x] Renewal reminder emails 30/7 days (2026-06-10) — sent once per window
      (`membership_reminder_{30,7}_sent`), re-armed on approval.
- [x] Tier gating checks expiry, not just status (2026-06-10) — both
      delivery-options routes.
- [x] **Storefront renewal flow — built 2026-06-13.** Active/grace members get a
      Renew disclosure on `/account/membership` (same payment form); it sets
      `membership_renewal_pending` without downgrading, the admin approve extends
      from `max(now, current expiry)`, and the pending queue tags New vs Renewal.

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
- [x] **Storefront shows trader their discounted price — built 2026-06-13.**
      Approved traders see a "Trader −X%" price (struck list price) on product
      detail, mobile actions, and product cards, computed from their own
      `trader_discount_percent` metadata (`src/lib/util/trader.ts`); trader >
      member > free priority. New admin **Traders** page edits the discount and
      defaults new approvals to 10%.

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
      collected **and** remitted).
- [x] **Producer payout disbursement — built 2026-06-13 (founder calls).** DTC =
      hub-collects-then-remits: admin **Producer payouts** page lists settled DTC
      orders grouped by producer (attributed via product
      `metadata.seller_customer_id`, gated on `settled`) with a commission% → net
      "Mark paid". Sell-to-hub = a cash-payout ledger (record producer, amount,
      method at intake). `producer-payout` module + `GET/POST
      /admin/producer-payouts`; owed math in `src/lib/producer-payout.ts`.

### Phase F — Multi-hub readiness (reframed 2026-06-11)
**Founder decision:** hubs are per-CITY (a hub per barangay is unaffordable) and
all operations are hub-local — Tagum Hub processes Tagum City only. City-level
matching is therefore the intended model; barangay/postal hub resolution is
**deliberately not built**.
- [x] ~~Resolve hub from address → `hub_area` (barangay/postal)~~ — dropped by
      founder decision; the city IS the service boundary.
- [x] **Enforce hub-locality (2026-06-11):** shared `resolveHubForDelivery`
      (`src/lib/resolve-hub.ts`) — a customer's home hub wins and their shipping
      address must be inside that hub's city (400 otherwise); guests match an
      active hub by normalized city name. Used by both delivery-options routes.
- [ ] Cross-hub "also available at <hub>" search (per existing product memory) —
      catalog stays per-hub; future.

### Phase G — Dispute fairness & SLAs — built 2026-06-14 (NOT yet runtime-verified)
- [x] **Response SLA timers + nightly sweep.** `dispute-sla-tick` job (02:15)
      classifies each pending dispute via the pure `classifyDisputeForSla`
      (`src/lib/dispute-sla.ts`): a silent buyer is **reminded** at 24h
      (`dispute-reminder` email + push, stamps `buyer_reminder_sent_at`) and any
      dispute still unresolved past the **48h SLA** is **flagged for admin**
      (`escalated_at`) — surfaced as an `overdue` badge in the admin queue.
      **Founder call (2026-06-14): no auto-strike** — a human always decides.
      The "silence = forfeit" auto-resolve-as-buyer_fault branch is fully built
      + tested but gated off behind `DISPUTE_NO_RESPONSE_AUTO_RESOLVE = false`;
      flip that one constant to adopt option 1 later.
- [x] **Buyer-facing status + appeal path.** After a `buyer_fault` resolution
      the buyer has **14 days** (`DISPUTE_APPEAL_WINDOW_MS`) to appeal the
      strike. `POST /store/customer/disputes/:id/appeal` → `appeal_state`
      requested; admin adjudicates via `POST /admin/disputes/:id/appeal`
      ({decision: uphold|overturn}) running `appeal-dispute` workflow. **Overturn
      reverses the strike** (`reverseBuyerFaultStrike`, the inverse of the
      escalation rule via shared `stateForStrikeCount`) and recomputes the
      account state; the original `resolution` stays buyer_fault for audit while
      `appeal_state` (none|requested|upheld|overturned) governs the effective
      outcome. Eligibility is the pure `canAppeal`/`evaluateAppealEligibility`,
      reused by the store GET route (`appeal_eligible` per dispute) and the
      respond gate. Storefront disputes page shows the appeal button/form +
      live status; admin gets an "Appeals to review" filter + uphold/overturn
      panel. Emails: `dispute-reminder`, `dispute-appeal-received`,
      `dispute-appeal-resolved`. Model gained `buyer_reminder_sent_at`,
      `escalated_at`, `auto_resolved`, `appeal_*` (migration
      `Migration20260613211052`). 71/71 unit tests green; both apps tsc-clean.
      **Still TODO:** apply the migration (`medusa db:migrate` — declines the
      stale cod_ledger.buyer_wallet drop prompt) + runtime-verify over HTTP.

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
| **City-name hub matching** | ~~reframed 2026-06-11~~ city = intended service boundary; hub-locality now enforced from the home hub | When hub #2 launches, seed its city + fee table; watch for city-name spelling drift in addresses |
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
