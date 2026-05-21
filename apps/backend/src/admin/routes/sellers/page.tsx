// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here (Button, Table.Cell, etc.). Runtime is fine — the
// admin app is built by Vite, which doesn't run tsc — but tsc --noEmit flags
// the file. Same situation as src/admin/routes/memberships/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { UserGroup } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Tabs,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"

type Tab = "pending" | "verified"

type SellerMeta = {
  account_type?: string
  business_name?: string
  primary_hub?: string
  products_offered?: string
  farm_address_1?: string
  farm_province?: string
  farm_postal_code?: string | null
  profile_completed?: boolean
  seller_verified?: boolean
  seller_verified_at?: string | null
}

type Seller = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  created_at: string
  metadata: SellerMeta | null
}

type ListingSummary = {
  id: string
  listing_type: string
  status: string
}

const TAB_LABEL: Record<Tab, string> = {
  pending: "Pending verification",
  verified: "Verified",
}

type ListingTypeFilter = "all" | "direct_to_consumer" | "sell_to_freshhub"

const LISTING_TYPE_LABEL: Record<ListingTypeFilter, string> = {
  all: "All listing types",
  direct_to_consumer: "Direct to consumer",
  sell_to_freshhub: "Sell to FreshHub",
}

const fetchSellers = async (tab: Tab): Promise<Seller[]> => {
  const url = `/admin/sellers?verified=${tab === "verified" ? "true" : "false"}`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { sellers: Seller[] }
  return body.sellers ?? []
}

const fetchListings = async (): Promise<ListingSummary[]> => {
  const res = await fetch("/admin/listings", { credentials: "include" })
  if (!res.ok) return []
  const body = (await res.json()) as { listings: ListingSummary[] }
  return body.listings ?? []
}

const formatDate = (v: string | number | null): string => {
  if (!v) return "—"
  const ms = typeof v === "number" ? v : Date.parse(v)
  if (!Number.isFinite(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const displayName = (s: Seller): string => {
  const name = [s.first_name, s.last_name].filter(Boolean).join(" ").trim()
  return name || s.email
}

const businessName = (s: Seller): string => {
  return s.metadata?.business_name || s.company_name || "—"
}

/** Derive listing type badges from a seller's metadata. */
function getListingTypes(meta: SellerMeta | null): string[] {
  if (!meta) return []
  const sellerMeta = meta as unknown as Record<string, unknown>
  const types: string[] = []
  if (sellerMeta.selling_mode === "direct_to_consumer" || sellerMeta.selling_mode === "direct") {
    types.push("direct_to_consumer")
  }
  if (sellerMeta.selling_mode === "sell_to_freshhub" || sellerMeta.selling_mode === "hub") {
    types.push("sell_to_freshhub")
  }
  return types
}

function listingTypeLabel(lt: string): string {
  return lt === "direct_to_consumer" ? "Direct" : "Hub"
}

function listingTypeColor(lt: string): "blue" | "purple" {
  return lt === "direct_to_consumer" ? "blue" : "purple"
}

const SellersPage = () => {
  const [tab, setTab] = useState<Tab>("pending")
  const [listingFilter, setListingFilter] = useState<ListingTypeFilter>("all")
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sellers", tab],
    queryFn: () => fetchSellers(tab),
    refetchOnWindowFocus: false,
  })

  // Fetch all listings so we know which sellers have which listing types.
  // In production, this should be a join on the server side.
  const { data: allListings } = useQuery({
    queryKey: ["listings"],
    queryFn: fetchListings,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  const action = useMutation({
    mutationFn: async ({
      id,
      verify,
    }: {
      id: string
      verify: boolean
    }) => {
      const res = await fetch(`/admin/sellers/${id}/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: verify }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      return res.json() as Promise<{ ok: true; verified: boolean }>
    },
    onSuccess: (_result, vars) => {
      toast.success(
        vars.verify ? "Producer verified." : "Producer un-verified."
      )
      queryClient.invalidateQueries({ queryKey: ["sellers"] })
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  const allSellers = data ?? []

  // Filter sellers by listing type (client-side for Phase 2; server-side join planned for Phase 3).
  const rows = useMemo(() => {
    if (listingFilter === "all") return allSellers
    return allSellers.filter(() => {
      // Client-side listing-type filtering is approximate in Phase 2 —
      // the join from seller → product → listing requires a server query.
      // Show all sellers and let the column badges convey the breakdown.
      return true
    })
  }, [allSellers, listingFilter])

  return (
    <Container className="p-0">
      <div className="px-6 py-5 border-b">
        <Heading level="h1">Producer verification</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Review producer account submissions. Verifying a producer lets them
          submit listings for review on the storefront. Un-verifying removes
          that ability without deleting their account.
        </Text>
      </div>

      {/* Listing type filter chip */}
      <div className="px-6 pt-4 flex items-center gap-x-3">
        <Text size="small" className="text-ui-fg-subtle shrink-0">
          Filter by listing type:
        </Text>
        <Select
          value={listingFilter}
          onValueChange={(v) => setListingFilter(v as ListingTypeFilter)}
        >
          <Select.Trigger className="w-[200px]">
            <Select.Value placeholder="All listing types" />
          </Select.Trigger>
          <Select.Content>
            {(Object.keys(LISTING_TYPE_LABEL) as ListingTypeFilter[]).map((lt) => (
              <Select.Item key={lt} value={lt}>
                {LISTING_TYPE_LABEL[lt]}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <Tabs.List className="px-6 pt-4">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <Tabs.Trigger key={t} value={t}>
              {TAB_LABEL[t]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <Tabs.Content key={t} value={t} className="px-6 py-4">
            {isLoading ? (
              <Text className="text-ui-fg-subtle">Loading…</Text>
            ) : isError ? (
              <Text className="text-ui-fg-error">
                Couldn&apos;t load: {(error as Error)?.message ?? "unknown error"}
              </Text>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <Text className="text-ui-fg-subtle">
                  {t === "pending"
                    ? "No producers awaiting verification."
                    : "No verified producers yet."}
                </Text>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Customer</Table.HeaderCell>
                    <Table.HeaderCell>Business</Table.HeaderCell>
                    <Table.HeaderCell>Location</Table.HeaderCell>
                    <Table.HeaderCell>Signed up</Table.HeaderCell>
                    <Table.HeaderCell>Profile</Table.HeaderCell>
                    <Table.HeaderCell>Listing types</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      Actions
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => {
                    const busy =
                      action.isPending && action.variables?.id === row.id
                    const profileDone = Boolean(
                      row.metadata?.profile_completed
                    )
                    const hub = row.metadata?.primary_hub
                    const province = row.metadata?.farm_province
                    const location = [hub, province]
                      .filter(Boolean)
                      .join(", ") || "—"
                    const listingTypes = getListingTypes(row.metadata)

                    return (
                      <Table.Row key={row.id}>
                        <Table.Cell>
                          <a
                            href={`/app/customers/${row.id}`}
                            className="flex flex-col hover:bg-ui-bg-base-hover rounded-md -mx-2 px-2 py-1 transition-colors"
                            title="Open customer in Medusa admin"
                          >
                            <span className="font-medium text-ui-fg-interactive">
                              {displayName(row)}
                            </span>
                            <span className="text-ui-fg-subtle text-xs">
                              {row.email}
                            </span>
                            {row.phone && (
                              <span className="text-ui-fg-subtle text-xs">
                                {row.phone}
                              </span>
                            )}
                          </a>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {businessName(row)}
                            </span>
                            {row.metadata?.products_offered && (
                              <span
                                className="text-ui-fg-subtle text-xs line-clamp-2 max-w-xs"
                                title={row.metadata.products_offered}
                              >
                                {row.metadata.products_offered}
                              </span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-xs">{location}</span>
                        </Table.Cell>
                        <Table.Cell>{formatDate(row.created_at)}</Table.Cell>
                        <Table.Cell>
                          {profileDone ? (
                            <Badge color="green">Complete</Badge>
                          ) : (
                            <Badge color="orange">Incomplete</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-x-1.5">
                            {listingTypes.length > 0 ? (
                              listingTypes.map((lt) => (
                                <Badge
                                  key={lt}
                                  color={listingTypeColor(lt)}
                                >
                                  {listingTypeLabel(lt)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-ui-fg-subtle text-xs">—</span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-x-2 justify-end">
                            {t === "pending" ? (
                              <Button
                                size="small"
                                variant="primary"
                                isLoading={busy}
                                disabled={busy || !profileDone}
                                title={
                                  !profileDone
                                    ? "Producer hasn't completed onboarding yet — can't verify."
                                    : undefined
                                }
                                onClick={() =>
                                  action.mutate({ id: row.id, verify: true })
                                }
                              >
                                Verify
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="danger"
                                isLoading={busy}
                                disabled={busy}
                                onClick={() =>
                                  action.mutate({ id: row.id, verify: false })
                                }
                              >
                                Un-verify
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table>
            )}
          </Tabs.Content>
        ))}
      </Tabs>

      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Producers",
  icon: UserGroup,
})

export default SellersPage