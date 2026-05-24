// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx for
// the explanation. Runtime is fine — Vite bundles the admin app without tsc.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Funnel } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Tabs,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

type Tab = "pending" | "approved" | "rejected"

type Producer = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  business_name?: string | null
  primary_hub?: string | null
}

type Product = {
  id: string
  title: string
  handle: string | null
  status: "draft" | "published" | "proposed" | "rejected"
  thumbnail: string | null
  unit?: string | null
  category?: string | null
}

type PickupWindow = {
  id: string
  date: string | number | null
  start_time?: string | null
  end_time?: string | null
  status?: string
  capacity_kg?: number | null
  reserved_kg?: number | null
}

type Listing = {
  id: string
  listing_type: "direct_to_consumer" | "sell_to_freshhub"
  status: string
  harvest_date: string | null
  pickup_window_id: string | null
  created_at: string | null
  product: Product | null
  producer: Producer | null
  pickup_window: PickupWindow | null
}

const TAB_LABEL: Record<Tab, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
}

const fetchListings = async (tab: Tab): Promise<Listing[]> => {
  let url = "/admin/listings"
  if (tab === "pending") {
    url += "?review=pending"
  } else if (tab === "approved") {
    url += "?listing_type=sell_to_freshhub&status=active"
  } else if (tab === "rejected") {
    url += "?listing_type=sell_to_freshhub&status=cancelled"
  }
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { listings: Listing[] }
  return body.listings ?? []
}

const approveListing = async (id: string): Promise<void> => {
  const res = await fetch(`/admin/listings/${id}/approve`, {
    method: "POST",
    credentials: "include",
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Approve failed (${res.status})`)
  }
}

const rejectListing = async (id: string): Promise<void> => {
  const res = await fetch(`/admin/listings/${id}/reject`, {
    method: "POST",
    credentials: "include",
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Reject failed (${res.status})`)
  }
}

const formatDate = (v: string | number | null | undefined): string => {
  if (!v) return "—"
  const ms = typeof v === "number" ? v : Date.parse(String(v))
  if (!Number.isFinite(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatTimeRange = (
  start: string | null | undefined,
  end: string | null | undefined
): string => {
  if (!start && !end) return ""
  return `${start ?? "??"}–${end ?? "??"}`
}

const producerLabel = (p: Producer | null): string => {
  if (!p) return "—"
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
  return p.business_name || p.company_name || name || p.email || p.id
}

const ListingsPage = () => {
  const [tab, setTab] = useState<Tab>("pending")
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-listings", tab],
    queryFn: () => fetchListings(tab),
  })

  const approveMut = useMutation({
    mutationFn: approveListing,
    onSuccess: () => {
      toast.success("Listing approved — product is now published.")
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMut = useMutation({
    mutationFn: rejectListing,
    onSuccess: () => {
      toast.success("Listing rejected — pickup slot released.")
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const listings = data ?? []
  const pendingDisabled =
    approveMut.isPending || rejectMut.isPending

  const headline = useMemo(() => {
    if (tab === "pending") {
      return "Sell-to-FreshHub listings awaiting hub approval. Approving publishes the product to the shop; rejecting releases the pickup slot."
    }
    if (tab === "approved") {
      return "Sell-to-FreshHub listings that have been approved and are live on the shop."
    }
    return "Sell-to-FreshHub listings that were rejected. The pickup slot was released back to the window."
  }, [tab])

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading level="h2">Listings review</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {headline}
        </Text>
      </div>

      <div className="px-6 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <Tabs.List>
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <Tabs.Trigger key={t} value={t}>
                {TAB_LABEL[t]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <Text>Loading listings…</Text>
        ) : isError ? (
          <Text className="text-ui-fg-error">
            {(error as Error)?.message ?? "Failed to load listings."}
          </Text>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-y-2 py-12 text-center">
            <Text className="text-ui-fg-subtle">
              {tab === "pending"
                ? "No listings are waiting for review right now."
                : tab === "approved"
                  ? "No approved sell-to-FreshHub listings yet."
                  : "No rejected listings to show."}
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Listing</Table.HeaderCell>
                <Table.HeaderCell>Producer</Table.HeaderCell>
                <Table.HeaderCell>Harvest</Table.HeaderCell>
                <Table.HeaderCell>Pickup window</Table.HeaderCell>
                <Table.HeaderCell>Submitted</Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {listings.map((l) => (
                <Table.Row key={l.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-x-3">
                      {l.product?.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.product.thumbnail}
                          alt={l.product.title}
                          className="w-10 h-10 rounded-md object-cover bg-ui-bg-subtle"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-ui-bg-subtle" />
                      )}
                      <div className="flex flex-col">
                        <Text weight="plus">
                          {l.product?.title ?? "(missing product)"}
                        </Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {l.product?.category ?? "Uncategorized"} ·{" "}
                          {l.product?.unit ?? "kg"} ·{" "}
                          <Badge size="2xsmall">
                            {l.product?.status ?? "—"}
                          </Badge>
                        </Text>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <Text>{producerLabel(l.producer)}</Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {l.producer?.primary_hub ?? "—"}
                      </Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{formatDate(l.harvest_date)}</Table.Cell>
                  <Table.Cell>
                    {l.pickup_window ? (
                      <div className="flex flex-col">
                        <Text>{formatDate(l.pickup_window.date)}</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {formatTimeRange(
                            l.pickup_window.start_time,
                            l.pickup_window.end_time
                          )}{" "}
                          · {l.pickup_window.reserved_kg ?? 0}/
                          {l.pickup_window.capacity_kg ?? "∞"} kg
                        </Text>
                      </div>
                    ) : (
                      "—"
                    )}
                  </Table.Cell>
                  <Table.Cell>{formatDate(l.created_at)}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-x-2">
                      {tab === "pending" ? (
                        <>
                          <Button
                            size="small"
                            variant="secondary"
                            disabled={pendingDisabled}
                            onClick={() => rejectMut.mutate(l.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="small"
                            variant="primary"
                            disabled={pendingDisabled}
                            onClick={() => approveMut.mutate(l.id)}
                          >
                            Approve
                          </Button>
                        </>
                      ) : (
                        <Badge>
                          {l.product?.status === "published"
                            ? "Published"
                            : l.product?.status === "rejected"
                              ? "Rejected"
                              : (l.status ?? "—")}
                        </Badge>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Listings",
  icon: Funnel,
})

export default ListingsPage
