# Graph Report - storefront  (2026-05-20)

## Corpus Check
- 235 files · ~77,481 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 878 nodes · 1203 edges · 118 communities (88 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `316fb24c`
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

## God Nodes (most connected - your core abstractions)
1. `getAuthHeaders()` - 45 edges
2. `retrieveCustomer()` - 40 edges
3. `getCacheOptions()` - 33 edges
4. `convertToLocale()` - 33 edges
5. `getCacheTag()` - 21 edges
6. `listProducts()` - 19 edges
7. `compilerOptions` - 18 edges
8. `getRegion()` - 18 edges
9. `getCartId()` - 15 edges
10. `sdk` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AddAddress()` --calls--> `useToggleState()`  [INFERRED]
  src/modules/account/components/address-card/add-address.tsx → src/lib/hooks/use-toggle-state.tsx
- `EditAddress()` --calls--> `useToggleState()`  [INFERRED]
  src/modules/account/components/address-card/edit-address-modal.tsx → src/lib/hooks/use-toggle-state.tsx
- `getProductPrice()` --calls--> `VariantPrice`  [INFERRED]
  src/lib/util/get-product-price.ts → src/types/global.ts
- `SkeletonProductGrid()` --calls--> `repeat()`  [INFERRED]
  src/modules/skeletons/templates/skeleton-product-grid/index.tsx → src/lib/util/repeat.ts
- `SkeletonRelatedProducts()` --calls--> `repeat()`  [INFERRED]
  src/modules/skeletons/templates/skeleton-related-products/index.tsx → src/lib/util/repeat.ts

## Communities (118 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (41): TransferPage(), Cart(), metadata, CheckoutForm(), applyPromotions(), deleteLineItem(), getOrSetCart(), listCartOptions() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (36): AccountPageLayout(), CartButton(), Checkout(), metadata, metadata, OverviewTemplate(), retrieveCustomer(), completeOnboarding() (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (46): NAV_ITEMS, NavItem, SELLER_NAV_ITEM, ROLE_COPY, Step, getCacheTag(), removeAuthToken(), setAuthToken() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (33): Addresses(), metadata, CategoryPage(), generateMetadata(), generateStaticParams(), Props, getCategoryByHandle(), listCategories() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (24): formatDate(), MembershipPage(), MemberView(), metadata, PendingView(), PERKS, FormState, INITIAL (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (4): AddressSelectProps, CountrySelect(), DiscountCodeProps, SubmitButton()

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (38): Badge, BadgeProps, Button, ButtonProps, Checkbox, CheckboxProps, Container, ContainerProps (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (16): initiatePaymentSession(), isManual(), isStripeLike(), noDivisionCurrencies, paymentInfoMap, PaymentButton(), PaymentButtonProps, PaymentContainer() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (13): Items(), ItemsProps, SkeletonCartPage(), SkeletonProductGrid(), SkeletonRelatedProducts(), ItemsTemplate(), ItemsTemplateProps, ItemsPreviewTemplate() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): dependencies, clsx, @headlessui/react, lodash, @medusajs/icons, @medusajs/js-sdk, @medusajs/ui-preset, next (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (18): devDependencies, ansi-colors, autoprefixer, @babel/core, babel-loader, eslint, eslint-config-next, @medusajs/types (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (13): CartDropdown(), CartTotals(), CartTotalsProps, setShippingMethod(), FreeShippingInline(), FreeShippingPopup(), LineItemUnitPrice(), LineItemUnitPriceProps (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): getLocale(), listLocales(), newHeaders, originalFetch, Nav(), CategoryTemplate(), CollectionTemplate(), ProductTemplate() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (6): ModalContext, ModalProvider(), ModalProviderProps, useModal(), ModalProps, Title()

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (11): AccordionItemProps, AccordionProps, ProductTabsProps, categories, origins, RefinementListProps, SortOptions, SortProductsProps (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (6): ProductPreview(), ThumbnailProps, FeaturedProduct, StoreFreeShippingPrice, VariantPrice, getProductPrice()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (4): AccountInfoProps, MyInformationProps, MyInformationProps, MyInformationProps

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (7): metadata, OrderConfirmedPage(), Props, retrieveOrder(), generateMetadata(), OrderDetailPage(), Props

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (6): Locale, DEFAULT_OPTION, LanguageOption, LanguageSelectProps, SideMenuItems, SideMenuProps

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (5): EditAddress(), EditAddressProps, deleteCustomerAddress(), updateCustomerAddress(), MyInformationProps

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

### Community 25 - "Community 25"
Cohesion: 0.36
Nodes (5): MembershipUpsellStrip(), Props, PreviewPrice(), ProductPrice(), getMemberPrice()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (4): MobileActions(), MobileActionsProps, OptionSelectProps, isSimpleProduct()

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
Cohesion: 0.2
Nodes (5): addToCart(), useIntersection(), ProductActions(), ProductActionsProps, QuickAddProps

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (4): isArray(), isEmpty(), isObject(), ConvertToLocaleParams

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (5): AccountInfo(), Addresses(), useToggleState(), SideMenu(), compareAddresses()

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (3): extends, rules, @typescript-eslint/no-unused-vars

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): getProfileCompletion(), Overview(), OverviewProps

### Community 110 - "Community 110"
Cohesion: 0.33
Nodes (3): AddressBookProps, AddAddress(), addCustomerAddress()

### Community 111 - "Community 111"
Cohesion: 0.4
Nodes (3): CountryOption, CountrySelectProps, StateType

## Knowledge Gaps
- **274 isolated node(s):** `excludedPaths`, `name`, `version`, `private`, `author` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `retrieveCustomer()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 13`, `Community 15`, `Community 25`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `getAuthHeaders()` connect `Community 0` to `Community 32`, `Community 1`, `Community 2`, `Community 3`, `Community 7`, `Community 12`, `Community 110`, `Community 18`, `Community 20`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `convertToLocale()` connect `Community 12` to `Community 33`, `Community 35`, `Community 5`, `Community 7`, `Community 40`, `Community 24`, `Community 25`, `Community 26`, `Community 60`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `excludedPaths`, `name`, `version` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._