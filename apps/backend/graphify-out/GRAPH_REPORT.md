# Graph Report - backend  (2026-05-28)

## Corpus Check
- 152 files · ~78,378 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 807 nodes · 924 edges · 60 communities (45 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `034afb56`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `compilerOptions` - 16 edges
3. `CodPaymentProviderService` - 13 edges
4. `PATCH()` - 11 edges
5. `scripts` - 7 edges
6. `validateWindowCreate()` - 7 edges
7. `GET()` - 7 edges
8. `Custom Module` - 7 edges
9. `Custom API Routes` - 6 edges
10. `validateSlotReserve()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `validateWindowCreate()`  [EXTRACTED]
  src/api/admin/pickup-windows/route.ts → src/modules/pickup/validators.ts
- `PATCH()` --calls--> `validateWindowCreate()`  [EXTRACTED]
  src/api/admin/pickup-windows/[id]/route.ts → src/modules/pickup/validators.ts
- `POST()` --calls--> `validateWindowCreate()`  [EXTRACTED]
  src/api/admin/pickup-windows/bulk/route.ts → src/modules/pickup/validators.ts
- `PATCH()` --calls--> `validateStatusTransition()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/modules/listing/validators.ts
- `PATCH()` --calls--> `validateListingTypeLock()`  [INFERRED]
  src/api/admin/pickup-windows/[id]/route.ts → src/modules/listing/validators.ts

## Communities (60 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (190): AccountHolder, Address, ApiKey, ApiKeyTypeEnum, ApplicationMethod, ApplicationMethodAllocationEnum, ApplicationMethodTargetTypeEnum, ApplicationMethodTypeEnum (+182 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (33): POST(), config, ListingModuleService, validateHarvestDate(), validateProducerEligibility(), PickupSlot, PickupWindow, ProductListing (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (24): GET(), POST(), UpsertRow, validateRow(), DeliveryFeesModuleService, beforeCutoff(), GET(), nowInHubTimezone() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (46): author, dependencies, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/caching, @medusajs/cli, @medusajs/dashboard, @medusajs/draft-order (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (16): CodLedgerModuleService, GET(), getCustomerId(), getCustomerId(), POST(), BuyerWallet, CodTransaction, POST() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (23): Action, appendEvent(), assertSeller(), DELETE(), GET(), loadOwnedProduct(), MEMBERSHIP_META, MembershipEvent (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (16): DispatchModuleService, VALID_DELIVERY_STATUSES, config, dispatchBatchesInTransit(), parseHHmm(), config, DispatchBatch, DispatchOrder (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (11): PREPAY_LOCKED_STATES, AccountabilityModuleService, GET(), getCustomerId(), config, BuyerAccountStatus, RefusalDispute, InjectedDeps (+3 more)

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

## Knowledge Gaps
- **440 isolated node(s):** `name`, `version`, `description`, `author`, `license` (+435 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CodPaymentProviderService` connect `Community 15` to `Community 7`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Community 5` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._