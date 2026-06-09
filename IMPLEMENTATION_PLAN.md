# Mindanao Fresh Hub — Full Implementation Plan
### For use with Claude Code + Medusa v2

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema & Data Models](#4-database-schema--data-models)
5. [Medusa Custom Modules](#5-medusa-custom-modules)
6. [Phase-by-Phase Build Plan](#6-phase-by-phase-build-plan)
7. [Feature Specifications](#7-feature-specifications)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Storefront Pages](#9-storefront-pages)
10. [Rider PWA Pages](#10-rider-pwa-pages)
11. [Admin Dashboard Extensions](#11-admin-dashboard-extensions)
12. [Payment & Fee Logic](#12-payment--fee-logic)
13. [Notifications & Events](#13-notifications--events)
14. [Environment Variables](#14-environment-variables)
15. [Claude Code Prompting Guide](#15-claude-code-prompting-guide)

---

## 1. Project Overview

**Mindanao Fresh Hub** is a multi-sided fresh farm produce marketplace operating across multiple city hubs in Mindanao, Philippines. It connects Producers, Consumers, Traders, and Riders through a single platform, with each hub operating independently under a unified storefront.

### User Roles Summary

| Role | Registration Fee | Key Function |
|---|---|---|
| Producer | ₱500/year | Lists products (direct or sell-to-hub), belongs to a specific hub |
| Consumer (Free) | Free | Buys products, no rewards |
| Consumer (Premium) | ₱300/year | Buys products + Hub Credits + scheduled free delivery |
| Trader | ₱1,000/year | B2B buyer, negotiated flat % discount, manual coordination |
| Rider | ₱500 cash bond | Delivers orders via first-grab system, belongs to a specific hub |
| Hub Admin | N/A | Manages one hub — riders, pickups, hub submissions |
| Super Admin | N/A | Manages all hubs, platform-wide oversight |

### Two Fulfillment Modes

**Mode A — Direct from Producer**
- Producer manages listing, packaging, and their own courier
- Platform holds payment (COD collected by producer's courier or remitted after delivery)
- 3% platform fee deducted from remittance
- Disclaimer shown to consumer at checkout
- Products appear immediately on the hub's storefront after producer posts them

**Mode B — Sell to Hub**
- Producer posts 3–5 days before harvest
- Hub Admin reviews, approves, assigns to Monday pickup batch
- Company picks up every Monday
- Hub Admin posts to storefront; seller shown to consumers is "Mindanao Fresh Hub"
- Company handles quality, packaging, and delivery via platform riders

### Multi-Hub Model

- One unified storefront; consumer selects their hub/city on first visit
- All products, riders, pickup schedules, and admins are scoped to a hub
- A product listed by a Tagum producer is only visible to Tagum hub consumers (unless admin enables cross-hub visibility in the future)
- Super Admin can view and manage all hubs; Hub Admin only sees their own hub
- Each hub has its own delivery fee schedule

---

## 2. Tech Stack

### Backend
- **Medusa v2** — core commerce engine (products, orders, customers, price lists)
- **Node.js / TypeScript** — custom modules and services
- **PostgreSQL** — primary database (self-hosted)
- **Redis** — job queues, session cache (self-hosted)
- **BullMQ** — background jobs (order release timer, credit expiry, cash remittance reminders)

### Storefront
- **Next.js 14 (App Router)** — consumer-facing store
- **Tailwind CSS** — styling
- **Medusa JS Client / Fetch** — API communication

### Rider PWA
- **Next.js 14** with **next-pwa** — installable mobile-first rider portal
- **jsQR or ZXing-js** — QR/barcode scanning via phone camera
- **Web Push API** — push notifications for new order alerts

### Admin
- **Medusa Admin (extended)** — built-in dashboard + custom routes and widgets
- Custom React pages injected via Medusa Admin Extensions

### Payments
- **COD (Cash on Delivery)** — rider collects cash, remits to hub
- **OTC Walk-in** — consumer pays at hub counter, admin marks as paid
- **Online payments: deferred** (PayMongo or similar added in a future phase)
- Registration fees paid in person at hub; admin marks registration as paid

### File Storage
- **MinIO** — self-hosted S3-compatible object storage (runs as Docker container on your server)
- Used for: product images, delivery proof photos, QR code image assets
- Medusa S3 file plugin pointed to MinIO endpoint

### Notifications
- **Email** — Resend (transactional email, generous free tier, simple API)
- **Push Notifications** — Web Push API via `web-push` npm package (rider PWA + consumer storefront)
- SMS: deferred to future phase

### Infrastructure (Self-Hosted)
- **Docker Compose** — runs Medusa backend, PostgreSQL, Redis, MinIO as containers
- **Nginx** — reverse proxy for all services
- **PM2 or Docker** — process management for Next.js apps
- Recommended server: Ubuntu 22.04 LTS, minimum 4 vCPU / 8GB RAM to start

---

## 3. Repository Structure

```
mindanao-fresh-hub/
├── backend/                        # Medusa v2 project
│   ├── src/
│   │   ├── modules/
│   │   │   ├── producer/           # Producer module
│   │   │   ├── rider/              # Rider + penalty + earnings module
│   │   │   ├── hub-credit/         # Rewards/cashback wallet module
│   │   │   ├── registration/       # Fee & registration lifecycle module
│   │   │   ├── pickup-schedule/    # Monday pickup scheduler module
│   │   │   └── hub/                # Hub management module
│   │   ├── api/
│   │   │   ├── store/              # Storefront API routes
│   │   │   ├── admin/              # Admin API routes
│   │   │   └── rider/              # Rider portal API routes
│   │   ├── workflows/              # Medusa workflows
│   │   ├── subscribers/            # Event subscribers
│   │   ├── jobs/                   # Scheduled BullMQ jobs
│   │   └── utils/
│   ├── docker-compose.yml          # PostgreSQL + Redis + MinIO
│   ├── medusa-config.ts
│   └── package.json
│
├── storefront/                     # Next.js consumer store
│   ├── app/
│   │   ├── (store)/
│   │   │   ├── page.tsx            # Homepage (hub selector on first visit)
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── account/
│   │   └── layout.tsx
│   └── package.json
│
├── rider-portal/                   # Next.js PWA for riders
│   ├── app/
│   │   ├── page.tsx               # Available orders feed
│   │   ├── my-orders/
│   │   ├── scan/
│   │   ├── earnings/
│   │   └── profile/
│   ├── public/manifest.json
│   ├── next.config.js             # PWA + service worker config
│   └── package.json
│
└── admin-extensions/               # Medusa Admin custom pages/widgets
    └── src/
        ├── routes/
        │   ├── hubs/
        │   ├── producers/
        │   ├── riders/
        │   ├── pickup-schedule/
        │   ├── traders/
        │   └── hub-credits/
        └── widgets/
```

---

## 4. Database Schema & Data Models

Custom tables added alongside Medusa's core tables.

### hubs
```sql
CREATE TABLE hubs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,        -- e.g. "Tagum City Hub"
  address           TEXT,
  city              VARCHAR(100),
  province          VARCHAR(100),
  latitude          DECIMAL(10, 8),
  longitude         DECIMAL(11, 8),
  pickup_day        VARCHAR(20) DEFAULT 'monday',
  delivery_fee_local   DECIMAL(10,2) DEFAULT 50.00,
  delivery_fee_nearby  DECIMAL(10,2) DEFAULT 80.00,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### hub_admins
```sql
CREATE TABLE hub_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id      UUID REFERENCES hubs(id),
  user_id     TEXT UNIQUE,                        -- Medusa admin user ID
  is_super    BOOLEAN DEFAULT FALSE,              -- super admin sees all hubs
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### producers
```sql
CREATE TABLE producers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               TEXT REFERENCES customer(id),
  hub_id                    UUID REFERENCES hubs(id),
  business_name             VARCHAR(255),
  contact_person            VARCHAR(255),
  phone                     VARCHAR(20),
  farm_address              TEXT,
  registration_status       VARCHAR(50) DEFAULT 'pending',
  -- pending | active | expired | suspended
  registration_expires_at   TIMESTAMP,
  push_subscription         JSONB,               -- Web Push subscription object
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);
```

### producer_products
```sql
CREATE TABLE producer_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          TEXT REFERENCES product(id),  -- Medusa product
  producer_id         UUID REFERENCES producers(id),
  hub_id              UUID REFERENCES hubs(id),
  sell_mode           VARCHAR(20) NOT NULL,          -- 'direct' | 'hub'
  harvest_date        DATE,
  pickup_week         DATE,                          -- the Monday pickup date
  hub_status          VARCHAR(50) DEFAULT 'draft',
  -- draft | pending_review | approved | pending_pickup | picked_up | posted | rejected
  direct_status       VARCHAR(50) DEFAULT 'active',  -- active | paused | out_of_stock
  rejection_reason    TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);
```

### traders
```sql
CREATE TABLE traders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             TEXT REFERENCES customer(id),
  hub_id                  UUID REFERENCES hubs(id),
  business_name           VARCHAR(255),
  business_address        TEXT,
  contact_person          VARCHAR(255),
  phone                   VARCHAR(20),
  tin                     VARCHAR(20),
  registration_status     VARCHAR(50) DEFAULT 'pending',
  -- pending | active | expired | rejected
  registration_expires_at TIMESTAMP,
  discount_percentage     DECIMAL(5,2) DEFAULT 0,   -- e.g. 15.00 = 15% off
  price_list_id           TEXT,                      -- Medusa price list ID
  admin_notes             TEXT,
  created_at              TIMESTAMP DEFAULT NOW()
);
```

### riders
```sql
CREATE TABLE riders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id                UUID REFERENCES hubs(id),
  user_id               TEXT UNIQUE,                -- internal auth user (admin-created)
  full_name             VARCHAR(255),
  phone                 VARCHAR(20),
  vehicle_type          VARCHAR(50),
  plate_number          VARCHAR(20),
  cash_bond             DECIMAL(10,2) DEFAULT 500.00,
  bond_status           VARCHAR(20) DEFAULT 'paid', -- paid | forfeited
  status                VARCHAR(20) DEFAULT 'offline', -- online | offline | on_delivery
  push_subscription     JSONB,                      -- Web Push subscription object
  latitude              DECIMAL(10, 8),
  longitude             DECIMAL(11, 8),
  last_location_update  TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

### rider_orders
```sql
CREATE TABLE rider_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              TEXT REFERENCES order(id),  -- Medusa order
  rider_id              UUID REFERENCES riders(id),
  hub_id                UUID REFERENCES hubs(id),
  status                VARCHAR(30) DEFAULT 'assigned',
  -- assigned | picked_up | delivered | cancelled | auto_released
  claimed_at            TIMESTAMP,
  picked_up_at          TIMESTAMP,
  delivered_at          TIMESTAMP,
  delivery_fee          DECIMAL(10,2),
  rider_gross           DECIMAL(10,2),              -- 75% of delivery_fee
  penalty_deducted      DECIMAL(10,2) DEFAULT 0,
  rider_net             DECIMAL(10,2),              -- gross - deductions
  cash_collected        DECIMAL(10,2) DEFAULT 0,    -- COD amount collected
  cash_remitted_at      TIMESTAMP,                  -- when rider remitted cash to hub
  delivery_proof_type   VARCHAR(20),                -- 'qr_scan' | 'photo'
  delivery_proof_value  TEXT,                       -- scanned code or photo URL (MinIO)
  cancellation_reason   TEXT,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

### rider_penalties
```sql
CREATE TABLE rider_penalties (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id                  UUID REFERENCES riders(id),
  rider_order_id            UUID REFERENCES rider_orders(id),  -- the cancelled order
  amount                    DECIMAL(10,2),
  reason                    TEXT,
  status                    VARCHAR(20) DEFAULT 'pending',
  -- pending | deducted | waived
  deducted_from_order_id    UUID REFERENCES rider_orders(id),  -- which delivery deducted it
  waived_by_admin_id        TEXT,
  waived_reason             TEXT,
  created_at                TIMESTAMP DEFAULT NOW()
);
```

### hub_credits
```sql
CREATE TABLE hub_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT REFERENCES customer(id),
  balance     DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### hub_credit_transactions
```sql
CREATE TABLE hub_credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   TEXT REFERENCES customer(id),
  order_id      TEXT,
  type          VARCHAR(20),
  -- 'earned' | 'redeemed' | 'expired' | 'adjusted'
  amount        DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  expires_at    TIMESTAMP,                    -- 12 months from earn date (for 'earned' type)
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### registrations
```sql
CREATE TABLE registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          UUID REFERENCES hubs(id),
  entity_type     VARCHAR(30),
  -- 'producer' | 'consumer_premium' | 'trader' | 'rider_bond'
  entity_id       TEXT,
  amount          DECIMAL(10,2),
  payment_method  VARCHAR(20) DEFAULT 'otc',  -- 'otc' | 'cod' | 'online' (future)
  payment_ref     TEXT,                        -- receipt number or admin note
  marked_paid_by  TEXT,                        -- admin user ID who confirmed
  paid_at         TIMESTAMP,
  expires_at      TIMESTAMP,                   -- 1 year from paid_at (null for rider bond)
  status          VARCHAR(20) DEFAULT 'pending',
  -- pending | paid | expired | refunded
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(20),              -- 'rider' | 'consumer'
  entity_id     TEXT,
  subscription  JSONB NOT NULL,           -- Web Push subscription object
  created_at    TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Medusa Custom Modules

Each registered in `medusa-config.ts`.

### 5.1 Hub Module (`src/modules/hub`)
- `HubService` — CRUD for hubs, get active hubs, get hub by city
- Used to scope all other data per hub
- Events: `hub.created`, `hub.deactivated`

### 5.2 Producer Module (`src/modules/producer`)
- `ProducerService` — registration, product listing (both modes), hub submission
- Validates harvest date on hub submissions (must be 3–5 days ahead)
- Events: `producer.registered`, `producer.product.direct_posted`, `producer.product.hub_submitted`

### 5.3 Rider Module (`src/modules/rider`)
- `RiderService` — admin-created riders, status toggle, order claim (with lock), pickup/delivery confirmation, location update
- `PenaltyService` — create on cancellation, auto-apply on next payout, admin waive
- `EarningsService` — gross/net calculation per delivery, cumulative ledger
- `CashRemittanceService` — track COD cash collected, mark as remitted to hub
- Events: `rider.order.claimed`, `rider.order.delivered`, `rider.order.cancelled`, `rider.penalty.applied`, `rider.cash.remitted`

### 5.4 Hub Credit Module (`src/modules/hub-credit`)
- `HubCreditService` — earn, redeem, expire, get balance, get history
- `CreditExpiryJob` — BullMQ job runs nightly, expires credits > 12 months old
- Events: `hub_credit.earned`, `hub_credit.redeemed`, `hub_credit.expired`

### 5.5 Registration Module (`src/modules/registration`)
- `RegistrationService` — create registration, admin marks as paid, set expiry, check status
- `RenewalReminderJob` — BullMQ job runs daily, sends email to registrations expiring in 30 days and 7 days
- Events: `registration.paid`, `registration.expired`, `registration.renewed`

### 5.6 Pickup Schedule Module (`src/modules/pickup-schedule`)
- `PickupScheduleService` — list upcoming Mondays, assign hub submissions to pickup date, mark pickup as completed
- On completion: triggers admin notification to post products to storefront

---

## 6. Phase-by-Phase Build Plan

### Phase 0 — Infrastructure & Foundation (Week 1–2)
- [ ] Create `docker-compose.yml` with PostgreSQL, Redis, MinIO
- [ ] Configure MinIO: create bucket, set public read policy for product images
- [ ] Connect Medusa v2 to PostgreSQL and Redis
- [ ] Configure Medusa file storage plugin to use MinIO (S3-compatible endpoint)
- [ ] Create all custom DB migrations (run in order: hubs → producers → riders → etc.)
- [ ] Seed: one hub record for Tagum City, one super admin user
- [ ] Set up Nginx reverse proxy config for all services
- [ ] Configure Resend for transactional email
- [ ] Set up monorepo structure and verify all 3 apps (backend, storefront, rider PWA) run

### Phase 1 — Hub System & Auth (Week 3)
- [ ] Hub Module: CRUD, list active hubs API endpoint
- [ ] Hub selector on storefront: first-visit modal, save to localStorage/cookie
- [ ] All subsequent store API calls include `hub_id` in context
- [ ] Hub Admin and Super Admin roles in Medusa admin
- [ ] Hub Admin only sees their hub's data in admin dashboard
- [ ] Super Admin sees all hubs with hub switcher in admin dashboard

### Phase 2 — User Registration (Week 4–5)
- [ ] Consumer free registration (standard Medusa customer flow)
- [ ] Consumer premium upgrade (submit form → hub visits → admin marks paid → premium tag applied → Hub Credits wallet created)
- [ ] Producer registration form (submit → admin marks paid → active status)
- [ ] Trader registration form (submit → admin marks paid → pending admin approval → approved → price list assigned)
- [ ] Rider registration: admin-only form in hub admin dashboard (no self-registration)
- [ ] Registration expiry tracking and renewal email reminders (30 days, 7 days)
- [ ] Registration status check middleware: block expired producers/traders from key actions

### Phase 3 — Producer Dashboard & Listings (Week 6–7)
- [ ] Producer login (separate portal or tab within storefront `/producer`)
- [ ] Producer dashboard: active listings, pending hub submissions, recent orders, earnings summary
- [ ] **Direct sell product form:** photos (MinIO upload), name, description, price, quantity, harvest date, unit (kg/piece/bundle)
- [ ] Direct sell product publishes immediately to hub's storefront with "Direct from Producer" badge
- [ ] **Hub sell submission form:** same fields + harvest date validation (3–5 days ahead), shows calculated pickup Monday
- [ ] Hub submission enters admin review queue (status: pending_review), NOT visible on storefront
- [ ] Producer can pause/resume direct listings
- [ ] Producer can view orders placed on their direct products
- [ ] Producer earnings page: pending remittances, completed remittances, platform fee breakdown

### Phase 4 — Storefront & Consumer Shopping (Week 8–10)
- [ ] Homepage: hub-specific featured products, hub vs direct sections, categories
- [ ] Product listing page: filter by category, "Hub Guaranteed" vs "Direct from Farm", price range
- [ ] Product detail page: producer name for direct, company name for hub, stock quantity
- [ ] **Direct product checkout:** mandatory disclaimer modal with checkbox before proceeding
- [ ] Cart supports mixed orders (hub + direct products, each fulfilled separately)
- [ ] Checkout: address form, delivery time selection (premium 3–5pm Mon–Fri slot), payment method (COD)
- [ ] Hub Credits display at checkout, optional redemption (min ₱20 balance required)
- [ ] Order placed: status = `pending_payment` for COD, confirmed when rider collects
- [ ] Consumer order history with live status updates
- [ ] Consumer account: profile, Hub Credits balance + history, membership status, upgrade CTA

### Phase 5 — Rider System & Delivery (Week 11–13)
- [ ] Rider PWA: Next.js with next-pwa config, manifest.json, service worker
- [ ] Rider login (phone number + PIN, admin-set)
- [ ] Rider status toggle: Online / Offline in profile page
- [ ] Available orders feed: shows orders in rider's hub, real-time (10-second poll for V1)
- [ ] "Take This Order" button with optimistic lock (only one rider can claim)
- [ ] 15-minute auto-release timer (BullMQ delayed job on claim)
- [ ] Order detail page: consumer name, address, items, COD amount to collect, delivery fee
- [ ] "Mark as Picked Up" button (status: in_transit)
- [ ] Delivery confirmation page: camera QR scanner (jsQR) + photo upload fallback (MinIO)
- [ ] On delivery confirmed: order → delivered, stock deducted, COD amount logged to rider, earnings recorded
- [ ] Cash remittance tracking: rider logs when they've handed cash to hub
- [ ] Earnings ledger: per delivery (gross, deductions, net), total pending cash to remit
- [ ] Penalty auto-apply on next successful delivery payout
- [ ] Web Push notifications to riders when new order is available
- [ ] Admin waive penalty feature in hub admin dashboard

### Phase 6 — Admin Dashboard Extensions (Week 14–15)
- [ ] Hub submissions queue: review, approve (assigns pickup Monday), reject with reason
- [ ] Pickup schedule view: calendar of upcoming Mondays, products per batch, mark as completed
- [ ] Post hub product to storefront: admin creates the storefront listing after pickup
- [ ] Trader approval queue: review, approve, set discount percentage
- [ ] Rider management: register new, view status/penalties/earnings, cash remittance log
- [ ] Producer remittances: pending remittances (direct sell), mark as released
- [ ] Registrations management: all pending paid-at-hub registrations, mark as paid
- [ ] Hub Credits overview: total issued, redeemed, expired; per-consumer lookup
- [ ] Revenue dashboard: total platform fees, registration fees collected, total GMV

### Phase 7 — QR Codes & Order Packaging (Week 16)
- [ ] Auto-generate QR code for each order on placement (encode order ID)
- [ ] QR code stored in MinIO, linked to order record
- [ ] Print-ready order label: QR code + order ID + consumer name + address + items
- [ ] Hub admin can print labels from admin dashboard
- [ ] Rider scans QR on delivery = matches order ID = confirms delivery

### Phase 8 — Polish & Launch Prep (Week 17–18)
- [ ] Mobile responsiveness audit on storefront (test on actual Android phone)
- [ ] PWA install prompt for rider portal ("Add to Home Screen")
- [ ] Error handling: out-of-stock, failed QR scan, network offline
- [ ] Loading states and optimistic UI throughout
- [ ] End-to-end flow testing: producer → list → consumer buy → rider deliver
- [ ] End-to-end flow testing: producer → hub submit → admin post → consumer buy → rider deliver
- [ ] Seed realistic test data: Tagum City hub, 2 producers, 5 products each, 2 riders, 3 consumers
- [ ] Backup strategy: PostgreSQL daily dump to MinIO bucket
- [ ] Go-live checklist and soft launch with pilot producers

---

## 7. Feature Specifications

### 7.1 Multi-Hub Scoping

Every data query involving products, orders, riders, and producers must include `hub_id` as a filter.

Consumer hub selection:
1. First visit: modal appears "Select your area" — lists active hubs
2. Selection saved to cookie (30-day expiry)
3. All API calls include `hub_id` in headers or query params
4. Consumer can change hub from the header/nav
5. Cart is cleared when hub is changed (products belong to a specific hub)

Hub Admin data isolation:
- Hub Admin JWT includes `hub_id` claim
- All admin API routes check `hub_id` from JWT
- Super Admin JWT includes `is_super: true` — bypasses hub filter, sees all data
- Admin dashboard shows hub switcher for super admin

### 7.2 COD Payment Flow

```
Consumer places order → status: awaiting_pickup
Rider claims order → rider sees COD amount on order detail
Rider delivers → collects cash from consumer
Rider confirms delivery (QR/photo) → cash_collected logged on rider_order
Rider remits cash to hub counter → hub admin marks cash_remitted_at
Order status → completed
```

For hub-sell products: platform is seller, so cash goes directly to hub.
For direct-sell products: cash goes to producer (via rider who remits to hub, hub remits to producer — or producer arranges their own rider outside platform).

**Hub Credits redemption with COD:**
Credits reduce the COD amount the consumer pays to the rider.
Example: ₱500 order, consumer redeems ₱50 credits → rider collects ₱450 cash.
Credit redemption is tracked separately; hub absorbs that ₱50 reduction.

### 7.3 Trader Pricing

Setup flow:
1. Trader registers and pays ₱1,000 at hub
2. Admin marks registration as paid → account status: pending_approval
3. Admin negotiates discount % offline (phone/in-person)
4. Admin approves trader account and enters `discount_percentage` (e.g. 15.00)
5. System creates a Medusa price list for this trader's customer group with the discount applied
6. Trader logs in → sees all products at their discounted price
7. No Hub Credits, no scheduled delivery for traders (standard fulfillment)
8. Minimum order quantities are noted in admin_notes field; enforced manually for now

**Price display:** Traders see the discounted price on all product pages. Regular prices are not shown to them.

### 7.4 Hub Credits (Reward System)

Earning:
- Only Premium consumers earn credits
- Rate: 0.5% of order subtotal (before delivery fee)
- Credits added only after order status = `delivered`
- Each earn transaction has expiry = 12 months from created_at

Redeeming:
- Shown at checkout as "Use Hub Credits"
- Minimum ₱20 balance to redeem
- Can partially or fully cover the COD amount
- If order cancelled, credits refunded to wallet immediately

Expiry:
- Nightly BullMQ job checks `hub_credit_transactions` where type='earned' and expires_at < NOW() and not yet expired
- Creates a negative 'expired' transaction, deducts from balance
- Sends expiry notification email to consumer

### 7.5 Rider First-Grab System

Order enters available feed when:
- Payment confirmed (COD: when order is placed and accepted)
- Order is for hub fulfillment OR consumer chose platform delivery

Claim lock mechanism:
- Use PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` on the order record
- First rider to claim acquires the lock, others get "already taken" response
- Avoids race conditions without Redis locks

Auto-release (BullMQ delayed job):
- On claim: schedule a job for 15 minutes later
- Job checks if order is still in `assigned` status (not `picked_up`)
- If still assigned: release back to feed, log auto-release event, notify rider
- 3 auto-releases for same rider → flag for admin review

Penalty on cancellation:
- Rider explicitly cancels after claiming
- `penalty = delivery_fee × 0.50`
- Penalty record created with status `pending`
- On rider's next successful delivery: penalty deducted from gross, penalty marked `deducted`
- If net is negative (penalty > gross), carry remainder as new pending penalty
- Admin can view and waive any penalty with a reason

### 7.6 Delivery Confirmation & Stock Deduction

QR Scan flow:
1. Rider taps "Confirm Delivery" on order detail page
2. Camera opens (HTML5 getUserMedia + jsQR)
3. Rider scans QR code on package label
4. QR decodes to order ID — system validates it matches current order
5. On match: delivery confirmed, proof_type = 'qr_scan', proof_value = decoded string

Photo fallback:
1. Rider taps "Can't Scan — Upload Photo"
2. Camera opens in photo mode (or file picker)
3. Photo uploaded to MinIO
4. Delivery confirmed, proof_type = 'photo', proof_value = MinIO URL
5. Hub admin can review photos flagged for quality check

Stock deduction on delivery:
- Order items loop: for each item, reduce `variant.inventory_quantity` in Medusa by the ordered quantity
- This covers the "10kg in stock, delivered 2kg, remaining = 8kg" scenario
- Medusa's inventory module handles this natively via the `adjustInventory` workflow

### 7.7 Producer Hub Submission Flow

```
Producer submits (harvest_date must be 3-5 days from today)
  → system calculates next available Monday on or after harvest_date + 1 day
  → producer sees: "Scheduled for pickup: Monday, [date]"
  → status: pending_review

Hub Admin reviews submission
  → approve: status = approved, assigned to that Monday's pickup batch
  → reject: status = rejected, rejection_reason saved, producer notified by email

On pickup Monday:
  → Admin views all products in that batch
  → Admin marks batch/individual items as picked_up
  → Admin creates storefront listing (Medusa product) with company as seller
  → Product posted to storefront, visible to hub consumers
```

---

## 8. API Endpoints Reference

### Store API (consumers & producers)

```
GET    /store/hubs                            # List active hubs (for hub selector)
POST   /store/producers/register              # Producer registration
POST   /store/consumers/upgrade-premium       # Premium upgrade (mark intent, pay at hub)
POST   /store/traders/register                # Trader registration
GET    /store/products?hub_id=&mode=          # Products filtered by hub + sell mode
GET    /store/products/:id                    # Product detail
POST   /store/cart                            # Create cart (includes hub_id)
POST   /store/cart/:id/line-items             # Add to cart
DELETE /store/cart/:id/line-items/:item_id    # Remove from cart
POST   /store/cart/:id/hub-credits/apply      # Apply Hub Credits to cart
POST   /store/orders                          # Place order
GET    /store/customers/me/orders             # Order history
GET    /store/customers/me/hub-credits        # Credits balance + history
POST   /store/orders/:id/confirm-receipt      # Consumer confirms receipt (direct sell dispute window)

# Producer portal endpoints
GET    /store/producer/me                     # Producer profile
GET    /store/producer/products               # My listings
POST   /store/producer/products               # Create listing (direct or hub)
PATCH  /store/producer/products/:id           # Edit listing
PATCH  /store/producer/products/:id/pause     # Pause direct listing
GET    /store/producer/orders                 # Orders for my products
GET    /store/producer/earnings               # Remittance history
```

### Admin API

```
# Hub management
GET    /admin/hubs                            # All hubs (super admin only)
POST   /admin/hubs                            # Create new hub
PATCH  /admin/hubs/:id                        # Update hub

# Registrations
GET    /admin/registrations?hub_id=&status=  # List registrations
PATCH  /admin/registrations/:id/mark-paid    # Mark as paid at hub

# Hub submissions (producer hub-sell queue)
GET    /admin/hub-submissions?hub_id=        # Pending submissions
PATCH  /admin/hub-submissions/:id/approve    # Approve + assign pickup Monday
PATCH  /admin/hub-submissions/:id/reject     # Reject with reason

# Pickup schedule
GET    /admin/pickup-schedule?hub_id=        # Upcoming pickup batches
PATCH  /admin/pickup-batches/:id/complete    # Mark pickup as done

# Trader management
GET    /admin/traders?hub_id=&status=        # List traders
PATCH  /admin/traders/:id/approve            # Approve + set discount %
PATCH  /admin/traders/:id/reject             # Reject trader

# Rider management
GET    /admin/riders?hub_id=                 # List riders
POST   /admin/riders                          # Register new rider
PATCH  /admin/riders/:id                     # Update rider
GET    /admin/riders/:id/earnings            # Earnings ledger
GET    /admin/riders/:id/penalties           # Penalty history
PATCH  /admin/penalties/:id/waive            # Waive penalty
GET    /admin/riders/:id/cash-remittances    # Cash collected, pending remittance
PATCH  /admin/rider-orders/:id/mark-remitted # Mark cash as remitted to hub

# Remittances (direct sell producers)
GET    /admin/remittances?hub_id=&status=    # Producer remittances
PATCH  /admin/remittances/:id/release        # Mark as released to producer

# Hub Credits
GET    /admin/hub-credits/overview           # Platform-wide credit stats
GET    /admin/hub-credits/:customer_id       # Per-consumer credit detail

# Reports
GET    /admin/reports/revenue?hub_id=&from=&to=   # Revenue summary
GET    /admin/reports/orders?hub_id=&from=&to=    # Order summary
```

### Rider API

```
POST   /rider/auth/login                     # Login (phone + PIN)
PATCH  /rider/status                         # Toggle online/offline
POST   /rider/push-subscription              # Save Web Push subscription
GET    /rider/orders/available               # Available orders in my hub
POST   /rider/orders/:id/claim              # Claim order
PATCH  /rider/orders/:id/picked-up          # Mark as picked up
POST   /rider/orders/:id/deliver            # Confirm delivery (QR scan or photo)
GET    /rider/my-orders                      # My order history
GET    /rider/earnings                       # Earnings ledger
GET    /rider/penalties                      # Penalty history
POST   /rider/cash-remittances              # Log cash remitted to hub
GET    /rider/profile                        # My profile
```

---

## 9. Storefront Pages

```
/                                   # Homepage: hub-specific, featured products
/hub-select                         # Hub selector (modal on first visit)
/products                           # All products with filters
/products/[id]                      # Product detail
/cart                               # Cart review, Hub Credits toggle
/checkout                           # Address, delivery slot, COD confirmation
/checkout/success/[order_id]        # Order confirmed page
/account                            # Account dashboard
/account/profile                    # Edit profile
/account/orders                     # Order history + statuses
/account/orders/[id]                # Order detail + tracking
/account/hub-credits                # Credits balance, history, expiry
/account/upgrade                    # Premium upgrade info + how to pay
/register                           # Consumer sign up
/register/producer                  # Producer registration form
/register/trader                    # Trader registration form
/producer/dashboard                 # Producer home
/producer/products                  # My product listings
/producer/products/new              # New product (direct or hub mode toggle)
/producer/products/[id]/edit        # Edit listing
/producer/orders                    # Orders for my products
/producer/earnings                  # Remittance history
```

---

## 10. Rider PWA Pages

```
/                                   # Redirect: /orders if logged in, /login otherwise
/login                              # Phone + PIN login
/orders                             # Available orders live feed (polls every 10s)
/orders/[id]                        # Claimed order detail (address, items, COD amount)
/orders/[id]/scan                   # QR scanner + photo fallback + confirm button
/my-orders                          # My completed and cancelled orders
/earnings                           # Earnings ledger: gross, deductions, net per delivery
/earnings/remit                     # Log cash remittance to hub
/penalties                          # Penalty history (pending, deducted, waived)
/profile                            # Profile info, online/offline toggle, logout
```

**PWA Configuration:**
```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})
```

```json
// public/manifest.json
{
  "name": "MFH Rider",
  "short_name": "MFH Rider",
  "theme_color": "#16a34a",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Push Notification Setup (web-push):**
```ts
// backend: send push to rider
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:admin@mindanaofreshhub.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

await webpush.sendNotification(rider.push_subscription, JSON.stringify({
  title: 'New Order Available',
  body: 'Tap to view and claim the order.',
  url: '/orders'
}))
```

---

## 11. Admin Dashboard Extensions

Custom routes injected into Medusa Admin via `src/admin/routes/`:

```
/app/hubs                           # Hub list + create (super admin only)
/app/hubs/[id]                      # Hub detail + settings
/app/registrations                  # Pending registrations, mark as paid
/app/hub-submissions                # Producer hub-sell review queue
/app/pickup-schedule                # Weekly pickup calendar
/app/pickup-schedule/[date]         # Products in a specific pickup batch
/app/traders                        # Trader approval queue + active traders
/app/riders                         # Rider list, register new rider
/app/riders/[id]                    # Rider detail: penalties, earnings, remittances
/app/remittances                    # Producer payout queue
/app/hub-credits                    # Credits overview + consumer lookup
/app/reports                        # Revenue, orders, registration fees
```

Custom widgets on existing Medusa pages:
- **Order detail page widget:** rider info, delivery proof image/QR, delivery timestamp, COD remittance status
- **Product detail page widget:** producer info, sell mode, hub submission status

---

## 12. Payment & Fee Logic

### Platform Fee (Direct Sell)
```
platform_fee     = order_subtotal × 0.03
producer_payout  = order_subtotal - platform_fee
```
Payout held for 3 days after delivery. Auto-flagged as ready after 3 days with no dispute.
Admin manually releases (GCash/bank transfer for now).

### Hub Credits Earned (Premium only, on delivery)
```
credits_earned = order_subtotal × 0.005
```

### Hub Credits — COD Adjustment
```
cod_amount_due = order_total - hub_credits_redeemed
// Rider collects cod_amount_due in cash
// Hub absorbs the redeemed credit amount
```

### Rider Payout (per delivery)
```
rider_gross     = delivery_fee × 0.75
pending_penalty = SUM of pending penalties for this rider
rider_net       = rider_gross - pending_penalty
// If rider_net < 0: carryover = abs(rider_net); mark current penalty partially deducted
```

### Penalty (on claim cancellation without valid reason)
```
penalty_amount = cancelled_order_delivery_fee × 0.50
```

### Delivery Fees (Tagum City Hub — starting values, admin can edit)
```
Within city:    ₱50
Nearby areas:   ₱80
Premium free delivery slot: ₱0 to consumer (hub absorbs the fee)
```

### Registration Fees (paid at hub, cash)
```
Producer:           ₱500 / year
Consumer Premium:   ₱300 / year
Trader:             ₱1,000 / year
Rider cash bond:    ₱500 one-time (refundable on exit in good standing)
```

---

## 13. Notifications & Events

### Email Notifications (via Resend)

| Trigger | Recipient | Subject |
|---|---|---|
| Registration submitted | User | "Your registration is pending — please visit the hub to pay" |
| Registration activated | User | "Your [role] account is now active!" |
| Registration expiry (30 days) | User | "Your membership expires in 30 days" |
| Registration expiry (7 days) | User | "Urgent: Your membership expires in 7 days" |
| Order placed | Consumer | "Order Confirmed — #[order_id]" |
| Order delivered | Consumer | "Your order has been delivered" |
| Hub submission approved | Producer | "Your hub submission has been approved — pickup on [date]" |
| Hub submission rejected | Producer | "Your hub submission was not approved — [reason]" |
| Remittance released | Producer | "Your payment of ₱[amount] has been released" |
| Trader approved | Trader | "Your trader account is active — [discount]% discount applied" |
| Hub Credits expiry (30 days) | Consumer | "₱[amount] in Hub Credits expiring soon" |
| Penalty applied | Rider | "A ₱[amount] penalty has been applied to your account" |

### Push Notifications (via Web Push)

| Trigger | Recipient | Message |
|---|---|---|
| New order available in hub | All online riders in that hub | "New order available — tap to claim" |
| Order auto-released back to pool | All online riders | "An order is back — claim it now" |
| Delivery confirmed | Consumer (if subscribed) | "Your order has arrived!" |

---

## 14. Environment Variables

```env
# ─── Backend ───────────────────────────────────────
DATABASE_URL=postgresql://mfh_user:password@localhost:5432/mfh_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here

# ─── MinIO (Self-hosted S3) ─────────────────────────
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=mfh_access_key
MINIO_SECRET_KEY=mfh_secret_key
MINIO_BUCKET=mfh-files
MINIO_PUBLIC_URL=https://files.mindanaofreshhub.com

# ─── Email ──────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@mindanaofreshhub.com
EMAIL_FROM_NAME=Mindanao Fresh Hub

# ─── Web Push ───────────────────────────────────────
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_CONTACT=mailto:admin@mindanaofreshhub.com
# Generate with: npx web-push generate-vapid-keys

# ─── App URLs ───────────────────────────────────────
STOREFRONT_URL=https://mindanaofreshhub.com
RIDER_PORTAL_URL=https://rider.mindanaofreshhub.com
ADMIN_URL=https://admin.mindanaofreshhub.com
BACKEND_URL=https://api.mindanaofreshhub.com

# ─── Business Rules (tweak without code changes) ────
PICKUP_DAY=monday
CLAIM_TIMEOUT_MINUTES=15
REMITTANCE_HOLD_DAYS=3
HUB_CREDIT_EXPIRY_MONTHS=12
MIN_HUB_CREDIT_REDEMPTION=20
PRODUCER_FEE_PERCENT=3
RIDER_EARNINGS_PERCENT=75
PENALTY_PERCENT=50
HUB_CREDIT_EARN_RATE=0.5
RENEWAL_REMINDER_DAYS=30,7
```

---

## 15. Claude Code Prompting Guide

Use these prompts when starting each major task in a Claude Code session. Each prompt gives Claude Code the context it needs without requiring the full plan every time.

---

### Infrastructure Setup
```
Set up a docker-compose.yml for the Mindanao Fresh Hub backend with these services:
- PostgreSQL 15 (db)
- Redis 7 (redis)
- MinIO latest (minio) with a bucket called 'mfh-files'

Also create the Nginx config file for reverse proxying:
- api.mindanaofreshhub.com → Medusa backend (port 9000)
- mindanaofreshhub.com → storefront Next.js (port 3000)
- rider.mindanaofreshhub.com → rider PWA Next.js (port 3001)
- files.mindanaofreshhub.com → MinIO (port 9000)
```

### Database Migrations
```
Create Medusa v2 migration files for these custom tables in order:
1. hubs
2. hub_admins
3. producers
4. producer_products
5. traders
6. riders
7. rider_orders
8. rider_penalties
9. hub_credits
10. hub_credit_transactions
11. registrations
12. push_subscriptions

Use this schema: [paste the schema section from the implementation plan]
```

### Hub Module
```
Create a Medusa v2 custom module at src/modules/hub with:
- HubModel (entity matching the hubs table)
- HubService with methods: create, findById, findAll, findActive, update, deactivate
- Register the module in medusa-config.ts
- Add GET /store/hubs and CRUD /admin/hubs API routes
- Hub Admin JWT middleware: extract hub_id from token, attach to request context
- Super Admin bypass: if is_super=true in token, skip hub filter
```

### Producer Module
```
Create a Medusa v2 custom module at src/modules/producer with:

ProducerService:
- register(data): create producer record linked to Medusa customer + hub
- createDirectListing(producerId, productData): create Medusa product + producer_products record with sell_mode='direct', publishes immediately
- createHubSubmission(producerId, productData): create producer_products with sell_mode='hub', validate harvest_date is 3-5 days from today, calculate next Monday as pickup_week, status='pending_review'
- getMyListings(producerId): return all producer_products with Medusa product data
- pauseListing(productId): set direct_status='paused'
- resumeListing(productId): set direct_status='active'

Emit events: producer.product.direct_posted, producer.product.hub_submitted
```

### Rider Module
```
Create a Medusa v2 custom module at src/modules/rider with three services:

RiderService:
- create(data): admin creates rider (no self-registration)
- setStatus(riderId, status): online | offline | on_delivery
- getAvailableOrders(hubId): orders in 'awaiting_pickup' status for this hub
- claimOrder(riderId, orderId): use SELECT FOR UPDATE SKIP LOCKED, create rider_orders record, schedule 15-min auto-release BullMQ job
- markPickedUp(riderOrderId): update status to 'in_transit'
- confirmDelivery(riderOrderId, proofType, proofValue): update status to 'delivered', trigger stock deduction, log earnings, apply pending penalties
- cancelOrder(riderOrderId, reason): release order back to feed, create penalty record

PenaltyService:
- createPenalty(riderOrderId): penalty = delivery_fee * 0.50
- applyPendingPenalties(riderOrderId): deduct from gross earnings, mark penalties as deducted
- waivedBy(penaltyId, adminId, reason): mark as waived

EarningsService:
- calculatePayout(riderOrderId): gross = delivery_fee * 0.75
- getLedger(riderId): all rider_orders with gross, deductions, net per row
```

### Hub Credits Module
```
Create a Medusa v2 custom module at src/modules/hub-credit with:

HubCreditService:
- earnCredits(customerId, orderId, subtotal): 0.5% of subtotal, only if customer is premium, add to balance, create transaction with expires_at = +12 months
- redeemCredits(customerId, amount): validate amount >= 20 and <= balance, deduct from balance, create 'redeemed' transaction
- refundCredits(customerId, orderId): reverse a redemption if order is cancelled
- getBalance(customerId): current balance
- getHistory(customerId): all transactions ordered by created_at desc

CreditExpiryJob (BullMQ repeatable job, runs daily at midnight):
- Find all hub_credit_transactions where type='earned', expires_at < NOW(), and no corresponding 'expired' transaction exists for same created_at date
- For each batch: create 'expired' transaction, deduct from balance, send expiry email via Resend
```

### Rider PWA
```
Create a Next.js 14 PWA project for the Mindanao Fresh Hub rider portal.

Configure:
- next-pwa with service worker
- manifest.json (name: MFH Rider, theme_color: #16a34a, display: standalone)
- Tailwind CSS, mobile-first (max-width: 430px layouts)
- Auth: JWT stored in httpOnly cookie, login via /rider/auth/login API

Pages:
1. /login — phone number input + 6-digit PIN, POST to /rider/auth/login
2. /orders — polls /rider/orders/available every 10 seconds, shows order cards with: order ID, delivery address area, COD amount, delivery fee. "Take This Order" button calls POST /rider/orders/:id/claim
3. /orders/[id] — order detail after claiming: consumer name, full address, items list, COD amount, delivery fee. Buttons: "Mark as Picked Up" and "Confirm Delivery"
4. /orders/[id]/scan — opens camera using getUserMedia + jsQR library for QR scanning. On successful scan: POST /rider/orders/:id/deliver with proofType='qr_scan'. "Can't Scan" button shows file input for photo upload to MinIO, then POST deliver with proofType='photo'
5. /earnings — table of completed deliveries: date, order ID, gross, penalty deducted, net. Total at bottom.
6. /profile — rider name, vehicle, status toggle (Online/Offline), logout button

Web Push: on login, request notification permission, POST subscription to /rider/push-subscription
```

### Admin Hub Submissions Page
```
Add a custom admin route to Medusa Admin at src/admin/routes/hub-submissions/page.tsx

The page shows a table of producer hub-sell submissions filtered by the current admin's hub_id.
Columns: Producer Name, Product Name, Harvest Date, Requested Pickup Monday, Submitted At, Status

For pending_review rows, show two action buttons:
- "Approve" → opens a modal confirming the pickup Monday date → PATCH /admin/hub-submissions/:id/approve
- "Reject" → opens a modal with a text input for rejection reason → PATCH /admin/hub-submissions/:id/reject

After approve/reject, refetch the list.
Use Medusa Admin UI components (Container, Table, Button, Badge).
```

### QR Code Generation
```
In the Medusa backend, after an order is placed and confirmed, auto-generate a QR code for the order.

Use the 'qrcode' npm package to generate a PNG of the order ID.
Upload the PNG to MinIO bucket 'mfh-files' at path: qrcodes/[order_id].png
Save the MinIO URL to a custom metadata field on the order: order.metadata.qr_code_url

Also create a print-ready label HTML template (returned as a route for admin):
GET /admin/orders/:id/label
Returns HTML with: QR code image, order ID, consumer name, delivery address, list of items
This page should be print-friendly (CSS @media print).
```

---

## Quick Reference: Status Flows

### Order Lifecycle
```
[COD Hub Order]
placed → awaiting_pickup → assigned (rider claimed) → in_transit → delivered → completed

[COD Direct Order]
placed → processing (producer arranges delivery) → in_transit → delivered → completed
```

### Producer Hub Submission
```
submitted → pending_review → approved → pending_pickup → picked_up → posted_to_store
                           ↘ rejected (reason given, producer notified)
```

### Rider Order
```
available → assigned → in_transit → delivered ✓
         ↘ auto_released (15min timeout) → back to available
         ↘ cancelled (penalty created) → back to available
```

### Registration
```
submitted (pending) → paid at hub (active) → [12 months later] → expired
                                           → renewed (new expiry set)
```

### Hub Credits
```
order delivered → earned (+0.5%) → [12 months later] → expired
checkout → redeemed (-amount) 
order cancelled → refunded (+amount)
```

---

*Document version: 2.0 | Last updated: June 2026*
*Mindanao Fresh Hub — First Hub: Tagum City, Davao del Norte*
