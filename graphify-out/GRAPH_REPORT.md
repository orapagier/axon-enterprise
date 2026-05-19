# Graph Report - .  (2026-05-18)

## Corpus Check
- Large corpus: 253 files · ~62,734 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1076 nodes · 1251 edges · 130 communities (92 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.82)
- Token cost: 32,499 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Type System|Backend Type System]]
- [[_COMMUNITY_Account & Checkout Pages|Account & Checkout Pages]]
- [[_COMMUNITY_Price & Order Utils|Price & Order Utils]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Address Management|Address Management]]
- [[_COMMUNITY_Shared UI Components|Shared UI Components]]
- [[_COMMUNITY_Data Fetching Layer|Data Fetching Layer]]
- [[_COMMUNITY_Payment Integration|Payment Integration]]
- [[_COMMUNITY_Product Display|Product Display]]
- [[_COMMUNITY_Cart & Order Items|Cart & Order Items]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_Backend TypeScript Config|Backend TypeScript Config]]
- [[_COMMUNITY_Storefront TypeScript Config|Storefront TypeScript Config]]
- [[_COMMUNITY_Admin TypeScript Config|Admin TypeScript Config]]
- [[_COMMUNITY_Storefront Dependencies|Storefront Dependencies]]
- [[_COMMUNITY_Storefront Dev Dependencies|Storefront Dev Dependencies]]
- [[_COMMUNITY_Account Profile Forms|Account Profile Forms]]
- [[_COMMUNITY_Turbo Pipeline Config|Turbo Pipeline Config]]
- [[_COMMUNITY_Backend Architecture Docs|Backend Architecture Docs]]
- [[_COMMUNITY_Modal Context System|Modal Context System]]
- [[_COMMUNITY_Product Tabs Accordion|Product Tabs Accordion]]
- [[_COMMUNITY_Order Confirmation Flow|Order Confirmation Flow]]
- [[_COMMUNITY_Order Transfer Flow|Order Transfer Flow]]
- [[_COMMUNITY_Auth LoginRegister|Auth Login/Register]]
- [[_COMMUNITY_Store Refinement Filters|Store Refinement Filters]]
- [[_COMMUNITY_Storefront Package Meta|Storefront Package Meta]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Account Navigation|Account Navigation]]
- [[_COMMUNITY_Project Overview Docs|Project Overview Docs]]
- [[_COMMUNITY_Env Variable Checks|Env Variable Checks]]
- [[_COMMUNITY_Storefront Scripts|Storefront Scripts]]
- [[_COMMUNITY_Route Middleware|Route Middleware]]
- [[_COMMUNITY_Link Components|Link Components]]
- [[_COMMUNITY_Product Template|Product Template]]
- [[_COMMUNITY_Store Page|Store Page]]
- [[_COMMUNITY_Onboarding Flow|Onboarding Flow]]
- [[_COMMUNITY_Product Quick Add|Product Quick Add]]
- [[_COMMUNITY_CartOrder Line Items|Cart/Order Line Items]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Micro Community 40|Micro Community 40]]
- [[_COMMUNITY_Micro Community 41|Micro Community 41]]
- [[_COMMUNITY_Micro Community 42|Micro Community 42]]
- [[_COMMUNITY_Micro Community 43|Micro Community 43]]
- [[_COMMUNITY_Micro Community 44|Micro Community 44]]
- [[_COMMUNITY_Micro Community 45|Micro Community 45]]
- [[_COMMUNITY_Micro Community 46|Micro Community 46]]
- [[_COMMUNITY_Micro Community 47|Micro Community 47]]
- [[_COMMUNITY_Micro Community 48|Micro Community 48]]
- [[_COMMUNITY_Micro Community 49|Micro Community 49]]
- [[_COMMUNITY_Micro Community 50|Micro Community 50]]
- [[_COMMUNITY_Micro Community 51|Micro Community 51]]
- [[_COMMUNITY_Micro Community 52|Micro Community 52]]
- [[_COMMUNITY_Micro Community 53|Micro Community 53]]
- [[_COMMUNITY_Micro Community 54|Micro Community 54]]
- [[_COMMUNITY_Micro Community 55|Micro Community 55]]
- [[_COMMUNITY_Micro Community 56|Micro Community 56]]
- [[_COMMUNITY_Micro Community 57|Micro Community 57]]
- [[_COMMUNITY_Micro Community 58|Micro Community 58]]
- [[_COMMUNITY_Micro Community 59|Micro Community 59]]
- [[_COMMUNITY_Micro Community 60|Micro Community 60]]
- [[_COMMUNITY_Micro Community 61|Micro Community 61]]
- [[_COMMUNITY_Micro Community 62|Micro Community 62]]
- [[_COMMUNITY_Micro Community 63|Micro Community 63]]
- [[_COMMUNITY_Micro Community 65|Micro Community 65]]
- [[_COMMUNITY_Micro Community 66|Micro Community 66]]
- [[_COMMUNITY_Micro Community 93|Micro Community 93]]
- [[_COMMUNITY_Micro Community 118|Micro Community 118]]
- [[_COMMUNITY_Micro Community 119|Micro Community 119]]
- [[_COMMUNITY_Micro Community 120|Micro Community 120]]
- [[_COMMUNITY_Micro Community 129|Micro Community 129]]

## God Nodes (most connected - your core abstractions)
1. `getAuthHeaders()` - 38 edges
2. `getCacheOptions()` - 31 edges
3. `convertToLocale()` - 26 edges
4. `compilerOptions` - 19 edges
5. `compilerOptions` - 18 edges
6. `getRegion()` - 18 edges
7. `retrieveCustomer()` - 17 edges
8. `compilerOptions` - 16 edges
9. `listProducts()` - 15 edges
10. `getCartId()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Storefront OpenGraph Social Preview Image` --conceptually_related_to--> `Next.js Storefront Application`  [INFERRED]
  apps/storefront/src/app/opengraph-image.jpg → README.md
- `Storefront Twitter Social Preview Image` --conceptually_related_to--> `Next.js Storefront Application`  [INFERRED]
  apps/storefront/src/app/twitter-image.jpg → README.md
- `AccountInfo()` --calls--> `useToggleState()`  [INFERRED]
  apps/storefront/src/modules/account/components/account-info/index.tsx → apps/storefront/src/lib/hooks/use-toggle-state.tsx
- `getProductPrice()` --calls--> `VariantPrice`  [INFERRED]
  apps/storefront/src/lib/util/get-product-price.ts → apps/storefront/src/types/global.ts
- `SkeletonProductGrid()` --calls--> `repeat()`  [INFERRED]
  apps/storefront/src/modules/skeletons/templates/skeleton-product-grid/index.tsx → apps/storefront/src/lib/util/repeat.ts

## Hyperedges (group relationships)
- **Medusa Backend Extension Points** — modules_readme, links_readme, api_readme, subscribers_readme, workflows_readme, jobs_readme, admin_readme [EXTRACTED 1.00]
- **MedusaContainer Dependency Injection Consumers** — api_readme, subscribers_readme, jobs_readme, freshhub_dependency_injection [EXTRACTED 1.00]
- **Workflow Execution Contexts** — workflows_readme, api_readme, subscribers_readme, jobs_readme [EXTRACTED 1.00]

## Communities (130 total, 38 thin omitted)

### Community 0 - "Backend Type System"
Cohesion: 0.01
Nodes (155): AccountHolder, Address, ApiKey, ApiKeyTypeEnum, ApplicationMethod, ApplicationMethodAllocationEnum, ApplicationMethodTargetTypeEnum, ApplicationMethodTypeEnum (+147 more)

### Community 1 - "Account & Checkout Pages"
Cohesion: 0.05
Nodes (68): AccountPageLayout(), EditAddressProps, Addresses(), metadata, CartButton(), Cart(), metadata, CheckoutForm() (+60 more)

### Community 2 - "Price & Order Utils"
Cohesion: 0.06
Nodes (27): CartDropdown(), CartTotals(), CartTotalsProps, FreeShippingInline(), FreeShippingPopup(), LineItemPrice(), LineItemPriceProps, LineItemUnitPrice() (+19 more)

### Community 3 - "Backend Dependencies"
Cohesion: 0.04
Nodes (46): author, dependencies, @medusajs/admin-sdk, @medusajs/admin-shared, @medusajs/caching, @medusajs/cli, @medusajs/dashboard, @medusajs/draft-order (+38 more)

### Community 4 - "Address Management"
Cohesion: 0.05
Nodes (20): AddressBookProps, AddAddress(), EditAddress(), AddressSelectProps, Addresses(), CountryOption, CountrySelect(), CountrySelectProps (+12 more)

### Community 5 - "Shared UI Components"
Cohesion: 0.05
Nodes (38): Badge, BadgeProps, Button, ButtonProps, Checkbox, CheckboxProps, Container, ContainerProps (+30 more)

### Community 6 - "Data Fetching Layer"
Cohesion: 0.09
Nodes (26): CategoryPage(), generateMetadata(), generateStaticParams(), Props, getCategoryByHandle(), listCategories(), getCollectionByHandle(), listCollections() (+18 more)

### Community 7 - "Payment Integration"
Cohesion: 0.09
Nodes (15): isManual(), isStripeLike(), noDivisionCurrencies, paymentInfoMap, PaymentButton(), PaymentButtonProps, PaymentContainer(), PaymentContainerProps (+7 more)

### Community 8 - "Product Display"
Cohesion: 0.08
Nodes (14): useIntersection(), ProductActions(), ProductActionsProps, MobileActions(), MobileActionsProps, OptionSelectProps, ProductPreview(), ProductPrice() (+6 more)

### Community 9 - "Cart & Order Items"
Cohesion: 0.08
Nodes (13): Items(), ItemsProps, SkeletonCartPage(), SkeletonProductGrid(), SkeletonRelatedProducts(), ItemsTemplate(), ItemsTemplateProps, ItemsPreviewTemplate() (+5 more)

### Community 10 - "Root Package Config"
Cohesion: 0.08
Nodes (24): devDependencies, prettier, turbo, engines, node, name, overrides, ajv (+16 more)

### Community 11 - "Backend TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, checkJs, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, inlineSourceMap (+15 more)

### Community 12 - "Storefront TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx (+15 more)

### Community 13 - "Admin TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 14 - "Storefront Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, clsx, @headlessui/react, lodash, @medusajs/icons, @medusajs/js-sdk, @medusajs/ui-preset, next (+10 more)

### Community 15 - "Storefront Dev Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, ansi-colors, autoprefixer, @babel/core, babel-loader, eslint, eslint-config-next, @medusajs/types (+10 more)

### Community 16 - "Account Profile Forms"
Cohesion: 0.11
Nodes (7): AccountInfo(), AccountInfoProps, MyInformationProps, MyInformationProps, MyInformationProps, MyInformationProps, MyInformationProps

### Community 17 - "Turbo Pipeline Config"
Cohesion: 0.12
Nodes (16): dependsOn, outputs, cache, persistent, outputs, $schema, outputs, dependsOn (+8 more)

### Community 18 - "Backend Architecture Docs"
Cohesion: 0.21
Nodes (13): Admin Dashboard Customizations, Custom API Routes, Medusa Admin Client Entry HTML, Dependency Injection via MedusaContainer, Event-Driven Architecture Pattern, File-Based API Routing Pattern, Module Isolation Principle, Admin i18n Translations (+5 more)

### Community 19 - "Modal Context System"
Cohesion: 0.2
Nodes (6): ModalContext, ModalProvider(), ModalProviderProps, useModal(), ModalProps, Title()

### Community 20 - "Product Tabs Accordion"
Cohesion: 0.17
Nodes (3): AccordionItemProps, AccordionProps, ProductTabsProps

### Community 21 - "Order Confirmation Flow"
Cohesion: 0.31
Nodes (7): metadata, OrderConfirmedPage(), Props, retrieveOrder(), generateMetadata(), OrderDetailPage(), Props

### Community 22 - "Order Transfer Flow"
Cohesion: 0.28
Nodes (5): TransferPage(), acceptTransferRequest(), declineTransferRequest(), TransferPage(), TransferStatus

### Community 23 - "Auth Login/Register"
Cohesion: 0.22
Nodes (3): Props, Props, LOGIN_VIEW

### Community 24 - "Store Refinement Filters"
Cohesion: 0.25
Nodes (5): categories, origins, RefinementListProps, SortOptions, SortProductsProps

### Community 25 - "Storefront Package Meta"
Cohesion: 0.25
Nodes (7): author, description, keywords, name, packageManager, private, version

### Community 26 - "Root Layout & Fonts"
Cohesion: 0.25
Nodes (5): dmSerif, inter, metadata, playfair, getBaseURL()

### Community 28 - "Project Overview Docs"
Cohesion: 0.33
Nodes (7): Storefront OpenGraph Social Preview Image, Storefront Twitter Social Preview Image, Medusa Backend Application, Medusa Commerce Framework, Monorepo Architecture Pattern, Next.js Storefront Application, Medusa DTC Starter Monorepo

### Community 29 - "Env Variable Checks"
Cohesion: 0.29
Nodes (4): c, requiredEnvs, checkEnvVariables, nextConfig

### Community 30 - "Storefront Scripts"
Cohesion: 0.33
Nodes (6): scripts, analyze, build, dev, lint, start

### Community 31 - "Route Middleware"
Cohesion: 0.47
Nodes (5): config, getCountryCode(), getRegionMap(), middleware(), regionMapCache

### Community 39 - "ESLint Config"
Cohesion: 0.5
Nodes (3): extends, rules, @typescript-eslint/no-unused-vars

## Knowledge Gaps
- **496 isolated node(s):** `name`, `private`, `packageManager`, `node`, `dev` (+491 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAuthHeaders()` connect `Account & Checkout Pages` to `Order Confirmation Flow`, `Order Transfer Flow`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `convertToLocale()` connect `Price & Order Utils` to `Address Management`, `Payment Integration`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `getCacheOptions()` connect `Account & Checkout Pages` to `Order Confirmation Flow`, `Data Fetching Layer`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `private`, `packageManager` to the rest of the system?**
  _500 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Type System` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Account & Checkout Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Price & Order Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._