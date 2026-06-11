# Graph Report - backend  (2026-06-11)

## Corpus Check
- 215 files · ~103,347 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1068 nodes · 1359 edges · 95 communities (68 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2cfc1a8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `PATCH()` - 16 edges
3. `compilerOptions` - 16 edges
4. `sendEmail()` - 15 edges
5. `CodPaymentProviderService` - 13 edges
6. `OtcPaymentProviderService` - 12 edges
7. `getRiderId()` - 11 edges
8. `isDuplicateCodTransaction()` - 10 edges
9. `GET()` - 10 edges
10. `POST()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `hashPin()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/modules/rider/pin.ts
- `GET()` --calls--> `isTraderAccount()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/lib/trader.ts
- `PATCH()` --calls--> `confirmDelivery()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/lib/delivery-actions.ts
- `PATCH()` --calls--> `recordRefusal()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/lib/delivery-actions.ts
- `POST()` --calls--> `validateWindowCreate()`  [EXTRACTED]
  src/api/admin/pickup-windows/route.ts → src/modules/pickup/validators.ts

## Communities (95 total, 27 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (192): AccountHolder, Address, ApiKey, ApiKeyTypeEnum, ApplicationMethod, ApplicationMethodAllocationEnum, ApplicationMethodTargetTypeEnum, ApplicationMethodTypeEnum (+184 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (8): POST(), config, PickupSlot, PickupWindow, PickupModuleService, validateWindowCreate(), GET(), POST()

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (22): GET(), POST(), UpsertRow, validateRow(), DeliveryFeesModuleService, beforeCutoff(), GET(), nowInHubTimezone() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (16): devDependencies, jest, @medusajs/test-utils, prop-types, react, react-dom, @swc/core, @swc/jest (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (8): CodLedgerModuleService, GET(), getCustomerId(), getCustomerId(), POST(), BuyerWallet, CodTransaction, POST()

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (18): assertSeller(), DELETE(), GET(), loadOwnedProduct(), PATCH(), ProductVariantWithPrices, StoreCustomer, VALID_TRANSITIONS (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (7): DispatchModuleService, config, recordRefusal(), DispatchBatch, DispatchOrder, POST(), POST()

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (29): PREPAY_LOCKED_STATES, AccountabilityModuleService, GET(), getCustomerId(), accountability, config, BuyerAccountStatus, RefusalDispute (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): compilerOptions, checkJs, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, inlineSourceMap (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (8): config, LISTING_TYPE_LABEL, ListingSummary, ListingTypeFilter, Seller, SellerMeta, Tab, TAB_LABEL

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (7): PickupSlot, PickupWindow, Props, config, DAY_NAMES, PickupSlot, PickupWindow

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (7): config, Listing, PickupWindow, Producer, Product, Tab, TAB_LABEL

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (14): 1. Create a Data Model, 2. Create a Service, 3. Export Module Definition, 4. Add Module to Medusa's Configurations, 5. Generate and Run Migrations, code:ts (import { model } from "@medusajs/framework/utils"), code:ts (import { MedusaService } from "@medusajs/framework/utils"), code:ts (import BlogModuleService from "./service") (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (6): ACTION_VERB, config, Membership, MembershipEvent, Status, STATUS_LABEL

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (8): Batch, BatchStatus, config, DispatchOrder, DispatchPage(), NEXT_STATUS, STATUS_TONE, todayManilaISO()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (7): AreaFormState, config, EMPTY_AREA_FORM, EMPTY_HUB_FORM, Hub, HubArea, HubFormState

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): code:ts (import type { MedusaRequest, MedusaResponse } from "@medusaj), code:ts (import type { MedusaRequest, MedusaResponse } from "@medusaj), code:ts (import type {), code:ts (import type {), code:ts (import { defineMiddlewares } from "@medusajs/framework/http"), Custom API Routes, Middleware, Parameters (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (4): config, Dispute, Resolution, TONE

### Community 20 - "Community 20"
Cohesion: 0.32
Nodes (6): CodReconcilePage(), config, peso(), ReconcileResponse, todayManilaISO(), Tx

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (3): config, Fee, Hub

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (4): config, STATUS_TONE, Wallet, WalletStatus

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (5): CATEGORIES, CATEGORY_FALLBACK_PHOTO, CategoryDef, ProductDef, PRODUCTS

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): Community & Contributions, Compatibility, Getting Started, Other channels, What is Medusa

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (4): Admin Customizations Translations, code:json ({), code:ts (import en from "./json/en.json" with { type: "json" }), code:tsx (import { defineWidgetConfig } from "@medusajs/admin-sdk")

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (4): name, namespaces, nativeEnums, tables

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (4): name, namespaces, nativeEnums, tables

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (4): name, namespaces, nativeEnums, tables

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (4): code:ts (import {), code:ts (import type {), Custom subscribers, Subscriber Parameters

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (4): code:ts (import {), code:ts (import type {), Custom Workflows, Execute Workflow

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (3): Admin Customizations, code:tsx (import { defineWidgetConfig } from "@medusajs/admin-sdk"), Example: Create a Widget

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (3): code:ts (import BlogModule from "../modules/blog"), code:bash (npx medusa db:migrate), Module Links

### Community 50 - "Community 50"
Cohesion: 0.08
Nodes (28): upload, GET(), VALID_DELIVERY_STATUSES, VALID_STATUSES, AGING_DAYS, config, LIMIT_CENTAVOS, exchangeCodeForClaims() (+20 more)

### Community 60 - "Community 60"
Cohesion: 0.09
Nodes (25): Action, appendEvent(), MEMBERSHIP_META, MembershipEvent, POST(), config, dispatchBatchesInTransit(), notifyBatchInTransit() (+17 more)

### Community 62 - "Community 62"
Cohesion: 0.1
Nodes (21): dependencies, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/cache-redis, @medusajs/caching, @medusajs/cli, @medusajs/dashboard, @medusajs/draft-order (+13 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (9): buildEmail(), BuiltEmail, Data, EMAIL_TEMPLATE_NAMES, TEMPLATES, InjectedDeps, ResendNotificationProviderService, ResendOptions (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (14): validateHarvestDate(), validateProducerEligibility(), validateSlotCapacity(), validateSlotReserve(), assertSeller(), GET(), POST(), StoreCustomer (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (3): ListingModuleService, ProductListing, ModuleImplementations

### Community 67 - "Community 67"
Cohesion: 0.17
Nodes (10): PICKUP_SLOT_STATUSES, PICKUP_WINDOW_STATUSES, PickupSlotStatus, PickupWindowStatus, SLOT_TRANSITIONS, validateSlotStatusTransition(), ValidationError, ValidationResult (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (12): config, orderPlacedHandler(), assignMock, makeContainer(), run(), run0, AssignedState, AssignOrderToDispatchInput (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.27
Nodes (7): CodTx, recordOtcCollected(), RecordOtcResult, POST(), actorId(), CounterItem, POST()

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (6): config, Hub, Rider, RiderStatus, STATUS_COLOR, STATUS_ORDER

### Community 71 - "Community 71"
Cohesion: 0.2
Nodes (9): author, description, engines, node, keywords, license, name, packageManager (+1 more)

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (7): POST(), CodTx, confirmDelivery(), ConfirmDeliveryResult, RecordRefusalResult, RefusalDispute, touchLastCleanOrder()

### Community 73 - "Community 73"
Cohesion: 0.31
Nodes (5): getRiderId(), GET(), GET(), GET(), LIMIT_CENTAVOS

### Community 74 - "Community 74"
Cohesion: 0.36
Nodes (7): CartLine, config, CustomerHit, OtcCounterPage(), peso(), pesoMajor(), useRegionId()

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (7): scripts, build, dev, start, test:integration:http, test:integration:modules, test:unit

### Community 76 - "Community 76"
Cohesion: 0.52
Nodes (3): POST(), isDuplicateCodTransaction(), POST()

### Community 77 - "Community 77"
Cohesion: 0.6
Nodes (3): GET(), getOrderCashState(), OrderCashState

### Community 78 - "Community 78"
Cohesion: 0.7
Nodes (4): DELETE(), GET(), getCustomerId(), POST()

### Community 79 - "Community 79"
Cohesion: 0.4
Nodes (4): name, namespaces, nativeEnums, tables

### Community 80 - "Community 80"
Cohesion: 0.4
Nodes (4): name, namespaces, nativeEnums, tables

## Knowledge Gaps
- **514 isolated node(s):** `name`, `version`, `description`, `author`, `license` (+509 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendEmail()` connect `Community 60` to `Community 72`, `Community 6`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CodPaymentProviderService` connect `Community 15` to `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Community 5` to `Community 1`, `Community 6`, `Community 72`, `Community 50`, `Community 60`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `PATCH()` (e.g. with `validateListingTypeLock()` and `validateStatusTransition()`) actually correct?**
  _`PATCH()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _514 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._