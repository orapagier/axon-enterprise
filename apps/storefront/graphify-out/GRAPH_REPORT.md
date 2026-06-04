# Graph Report - storefront  (2026-06-04)

## Corpus Check
- 258 files · ~90,806 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1020 nodes · 1447 edges · 129 communities (92 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb78df09`
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
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]

## God Nodes (most connected - your core abstractions)
1. `getAuthHeaders()` - 50 edges
2. `retrieveCustomer()` - 48 edges
3. `getCacheOptions()` - 33 edges
4. `convertToLocale()` - 33 edges
5. `getCacheTag()` - 21 edges
6. `sdk` - 19 edges
7. `listProducts()` - 19 edges
8. `compilerOptions` - 18 edges
9. `getRegion()` - 18 edges
10. `getCartId()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `setAddresses()` --calls--> `sanitizeText()`  [INFERRED]
  src/lib/data/cart.ts → src/lib/data/address-validation.ts
- `getProductPrice()` --calls--> `VariantPrice`  [INFERRED]
  src/lib/util/get-product-price.ts → src/types/global.ts
- `SkeletonProductGrid()` --calls--> `repeat()`  [INFERRED]
  src/modules/skeletons/templates/skeleton-product-grid/index.tsx → src/lib/util/repeat.ts
- `SkeletonRelatedProducts()` --calls--> `repeat()`  [INFERRED]
  src/modules/skeletons/templates/skeleton-related-products/index.tsx → src/lib/util/repeat.ts
- `SkeletonCartPage()` --calls--> `repeat()`  [INFERRED]
  src/modules/skeletons/templates/skeleton-cart-page/index.tsx → src/lib/util/repeat.ts

## Communities (129 total, 37 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (47): TransferPage(), AccountStatus, State, CategoryPage(), generateMetadata(), generateStaticParams(), Props, CheckoutForm() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (50): AccountPageLayout(), getHubCookie(), CartButton(), Cart(), metadata, Checkout(), metadata, metadata (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (28): setHubCookie(), syncCustomerHubFromCookie(), ROLE_COPY, Step, removeAuthToken(), setAuthToken(), AccountType, AuthMode (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (24): Addresses(), metadata, getCollectionByHandle(), listCollections(), listProducts(), listProductsWithSort(), getRegion(), SearchHit (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (24): formatDate(), MembershipPage(), MemberView(), metadata, PendingView(), PERKS, FormState, INITIAL (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (33): AddressSelectProps, FieldKey, REQUIRED_FIELDS, canonicalHubCity(), haversineKm(), HUB_CITIES, HUB_CITY_SET, HUB_SLUG_BY_CITY (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (38): Badge, BadgeProps, Button, ButtonProps, Checkbox, CheckboxProps, Container, ContainerProps (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (17): initiatePaymentSession(), isCod(), isManual(), isStripeLike(), noDivisionCurrencies, paymentInfoMap, PaymentButton(), PaymentButtonProps (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (13): Items(), ItemsProps, SkeletonCartPage(), SkeletonProductGrid(), SkeletonRelatedProducts(), ItemsTemplate(), ItemsTemplateProps, ItemsPreviewTemplate() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (19): dependencies, clsx, @headlessui/react, libphonenumber-js, lodash, @medusajs/icons, @medusajs/js-sdk, @medusajs/ui-preset (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (18): devDependencies, ansi-colors, autoprefixer, @babel/core, babel-loader, eslint, eslint-config-next, @medusajs/types (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (12): CartDropdown(), CartTotals(), CartTotalsProps, FreeShippingInline(), FreeShippingPopup(), LineItemUnitPrice(), LineItemUnitPriceProps, OrderSummaryProps (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (28): getCacheTag(), baseHeaders(), listOpenPickupWindows(), PickupWindow, baseHeaders(), createListing(), deleteListing(), getMyListing() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (6): ModalContext, ModalProvider(), ModalProviderProps, useModal(), ModalProps, Title()

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (3): AccordionItemProps, AccordionProps, ProductTabsProps

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (9): AddressBookProps, AddAddress(), EditAddress(), EditAddressProps, hubSlugForCity(), addCustomerAddress(), deleteCustomerAddress(), updateCustomerAddress() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (25): completeOnboarding(), deferOnboarding(), isValidPhone(), OnboardingState, resetOnboardingState(), splitDisplayName(), AccountType, BUYER_FIELDS (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (7): metadata, OrderConfirmedPage(), Props, retrieveOrder(), generateMetadata(), OrderDetailPage(), Props

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (7): Locale, DEFAULT_OPTION, LanguageOption, LanguageSelectProps, BaseMenuItems, SideMenuItems, SideMenuProps

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (6): NAV_ITEMS, NavItem, PRODUCER_NAV_ITEM, RIDER_NAV_ITEM, SELLER_NAV_ITEM, AccountLayoutProps

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (6): CROPS, FAQS, metadata, PILLARS, PROVINCES, STEPS

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (7): author, description, keywords, name, packageManager, private, version

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (5): dmSerif, inter, metadata, playfair, getBaseURL()

### Community 24 - "Community 24"
Cohesion: 0.36
Nodes (5): LineItemPrice(), LineItemPriceProps, getPercentageDiff(), getPricesForVariant(), VariantWithPrice

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (10): MobileActions(), MobileActionsProps, OptionSelectProps, ProductPreview(), Props, FeaturedProduct, StoreFreeShippingPrice, VariantPrice (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (5): LAUNCH_FACTS, metadata, ROADMAP, TEAM, VALUES

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (4): c, requiredEnvs, checkEnvVariables, nextConfig

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (6): scripts, analyze, build, dev, lint, start

### Community 31 - "Community 31"
Cohesion: 0.47
Nodes (5): config, getCountryCode(), getRegionMap(), middleware(), regionMapCache

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (9): useIntersection(), ProductActions(), ProductActionsProps, ProductPrice(), ProductQuickAdd(), QuickAddProps, getProductUnit(), getUnitLabel() (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (4): isArray(), isEmpty(), isObject(), ConvertToLocaleParams

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (5): FIT, metadata, ROLE, WE_PROVIDE, YOU_BRING

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (3): extends, rules, @typescript-eslint/no-unused-vars

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): getProfileCompletion(), Overview(), OverviewProps

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (4): AccountInfoProps, MyInformationProps, MyInformationProps, MyInformationProps

### Community 111 - "Community 111"
Cohesion: 0.22
Nodes (7): setShippingMethod(), DeliveryOptionsResponse, Shipping(), ShippingProps, Tier, TIER_VISUAL, TierOption

### Community 117 - "Community 117"
Cohesion: 0.25
Nodes (5): categories, origins, RefinementListProps, SortOptions, SortProductsProps

### Community 118 - "Community 118"
Cohesion: 0.25
Nodes (5): AccountStatus, Dispute, Reason, REASON_LABEL, Resolution

### Community 119 - "Community 119"
Cohesion: 0.33
Nodes (5): AccountInfo(), Addresses(), useToggleState(), SideMenu(), compareAddresses()

### Community 120 - "Community 120"
Cohesion: 0.47
Nodes (4): MembershipUpsellStrip(), Props, PreviewPrice(), getMemberPrice()

### Community 121 - "Community 121"
Cohesion: 0.4
Nodes (3): CountryOption, CountrySelectProps, StateType

## Knowledge Gaps
- **327 isolated node(s):** `excludedPaths`, `name`, `version`, `private`, `author` (+322 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `retrieveCustomer()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 13`, `Community 17`, `Community 120`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `getAuthHeaders()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 13`, `Community 111`, `Community 16`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `convertToLocale()` connect `Community 12` to `Community 32`, `Community 33`, `Community 35`, `Community 5`, `Community 7`, `Community 40`, `Community 111`, `Community 120`, `Community 24`, `Community 26`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `excludedPaths`, `name`, `version` to the rest of the system?**
  _327 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._