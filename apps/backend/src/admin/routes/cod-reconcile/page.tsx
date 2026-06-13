// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ReceiptPercent } from "@medusajs/icons"
import {
  Container,
  Heading,
  Input,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

type Tx = {
  id: string
  customer_id: string
  order_id: string | null
  type: "cod_collected" | "rider_remitted" | "otc_collected"
  amount: number
  rider_id: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

type ReconcileResponse = {
  collected: Tx[]
  remitted: Tx[]
  otc_collected: Tx[]
  totals: {
    collected_centavos: number
    remitted_centavos: number
    outstanding_centavos: number
    otc_collected_centavos: number
  }
}

type AgingBuckets = {
  d0_1: number
  d1_3: number
  d3_7: number
  d7_plus: number
}

type RiderAging = {
  rider_id: string
  outstanding_centavos: number
  order_count: number
  oldest_age_days: number
  buckets: AgingBuckets
}

type ShortfallRow = {
  order_id: string | null
  rider_id: string | null
  kind: "collection" | "remittance"
  expected_centavos: number
  actual_centavos: number
  shortfall_centavos: number
  created_at: string
}

type AgingResponse = {
  generated_at: number
  aging: {
    riders: RiderAging[]
    totals: AgingBuckets
    outstanding_centavos: number
  }
  shortfalls: {
    collection: ShortfallRow[]
    remittance: ShortfallRow[]
    total_centavos: number
  }
}

const fetchAging = async (): Promise<AgingResponse> => {
  const res = await fetch(`/admin/cod-remittance-aging`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  return (await res.json()) as AgingResponse
}

function todayManilaISO(): string {
  const now = new Date()
  const local = new Date(now.getTime() + 8 * 60 * 60_000)
  return local.toISOString().slice(0, 10)
}

const fetchReconcile = async (
  from: string,
  to: string
): Promise<ReconcileResponse> => {
  const params = new URLSearchParams()
  if (from) params.set("from", `${from}T00:00:00Z`)
  if (to) params.set("to", `${to}T23:59:59Z`)
  const res = await fetch(`/admin/cod-reconcile?${params.toString()}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  return (await res.json()) as ReconcileResponse
}

const peso = (centavos: number) => `₱${(centavos / 100).toFixed(2)}`

const CodReconcilePage = () => {
  const today = todayManilaISO()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const q = useQuery({
    queryKey: ["cod-reconcile", from, to],
    queryFn: () => fetchReconcile(from, to),
  })
  // All-time aging is independent of the date range — an old unremitted
  // collection is exactly what it must surface — so it has its own query.
  const aging = useQuery({
    queryKey: ["cod-remittance-aging"],
    queryFn: fetchAging,
  })

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Heading level="h1">COD Reconciliation</Heading>
            <Text className="text-ui-fg-subtle">
              Rider cash (collected vs. remitted) and hub counter cash (OTC) per day.
            </Text>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <label className="text-sm">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {q.isLoading ? (
          <Text>Loading…</Text>
        ) : !q.data ? (
          <Text className="text-ui-fg-subtle">No data.</Text>
        ) : (
          <>
            <div className="grid grid-cols-2 large:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border p-4">
                <Text className="text-ui-fg-subtle text-sm">
                  Collected (rider)
                </Text>
                <div className="text-2xl font-semibold">
                  {peso(q.data.totals.collected_centavos)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <Text className="text-ui-fg-subtle text-sm">Remitted</Text>
                <div className="text-2xl font-semibold">
                  {peso(q.data.totals.remitted_centavos)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <Text className="text-ui-fg-subtle text-sm">
                  Outstanding (rider owes)
                </Text>
                <div
                  className={`text-2xl font-semibold ${
                    q.data.totals.outstanding_centavos > 0
                      ? "text-ui-fg-error"
                      : "text-ui-fg-base"
                  }`}
                >
                  {peso(q.data.totals.outstanding_centavos)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <Text className="text-ui-fg-subtle text-sm">
                  Over the Counter (hub-held)
                </Text>
                <div className="text-2xl font-semibold">
                  {peso(q.data.totals.otc_collected_centavos)}
                </div>
              </div>
            </div>

            {aging.data && (
              <div className="mb-8">
                <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                  <Heading level="h2">Remittance aging (all-time)</Heading>
                  <Text className="text-ui-fg-subtle text-sm">
                    Rider cash collected but not yet remitted, by age.
                    {aging.data.shortfalls.total_centavos > 0 && (
                      <span className="text-ui-fg-error">
                        {" "}
                        Shortfalls: {peso(aging.data.shortfalls.total_centavos)}
                      </span>
                    )}
                  </Text>
                </div>
                {aging.data.aging.riders.length === 0 ? (
                  <Text className="text-ui-fg-subtle">
                    No unremitted rider cash. ✓
                  </Text>
                ) : (
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Rider</Table.HeaderCell>
                        <Table.HeaderCell>Orders</Table.HeaderCell>
                        <Table.HeaderCell>0–1d</Table.HeaderCell>
                        <Table.HeaderCell>1–3d</Table.HeaderCell>
                        <Table.HeaderCell>3–7d</Table.HeaderCell>
                        <Table.HeaderCell>7d+</Table.HeaderCell>
                        <Table.HeaderCell>Outstanding</Table.HeaderCell>
                        <Table.HeaderCell>Oldest</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {aging.data.aging.riders.map((r) => (
                        <Table.Row key={r.rider_id}>
                          <Table.Cell>{r.rider_id}</Table.Cell>
                          <Table.Cell>{r.order_count}</Table.Cell>
                          <Table.Cell>{peso(r.buckets.d0_1)}</Table.Cell>
                          <Table.Cell>{peso(r.buckets.d1_3)}</Table.Cell>
                          <Table.Cell>{peso(r.buckets.d3_7)}</Table.Cell>
                          <Table.Cell
                            className={
                              r.buckets.d7_plus > 0 ? "text-ui-fg-error" : ""
                            }
                          >
                            {peso(r.buckets.d7_plus)}
                          </Table.Cell>
                          <Table.Cell className="font-semibold">
                            {peso(r.outstanding_centavos)}
                          </Table.Cell>
                          <Table.Cell
                            className={
                              r.oldest_age_days > 3 ? "text-ui-fg-error" : ""
                            }
                          >
                            {r.oldest_age_days.toFixed(1)}d
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                )}

                {(aging.data.shortfalls.collection.length > 0 ||
                  aging.data.shortfalls.remittance.length > 0) && (
                  <>
                    <Heading level="h3" className="mt-4 mb-2">
                      Shortfalls
                    </Heading>
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell>Kind</Table.HeaderCell>
                          <Table.HeaderCell>Order</Table.HeaderCell>
                          <Table.HeaderCell>Rider</Table.HeaderCell>
                          <Table.HeaderCell>Expected</Table.HeaderCell>
                          <Table.HeaderCell>Actual</Table.HeaderCell>
                          <Table.HeaderCell>Short by</Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {[
                          ...aging.data.shortfalls.collection,
                          ...aging.data.shortfalls.remittance,
                        ].map((s, i) => (
                          <Table.Row key={`${s.kind}-${s.order_id}-${i}`}>
                            <Table.Cell>{s.kind}</Table.Cell>
                            <Table.Cell>{s.order_id ?? "—"}</Table.Cell>
                            <Table.Cell>{s.rider_id ?? "—"}</Table.Cell>
                            <Table.Cell>{peso(s.expected_centavos)}</Table.Cell>
                            <Table.Cell>{peso(s.actual_centavos)}</Table.Cell>
                            <Table.Cell className="text-ui-fg-error font-semibold">
                              {peso(s.shortfall_centavos)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </>
                )}
              </div>
            )}

            <Heading level="h2" className="mb-2">
              Collected ({q.data.collected.length})
            </Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Rider</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>When</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {q.data.collected.map((t) => (
                  <Table.Row key={t.id}>
                    <Table.Cell>{t.order_id ?? "—"}</Table.Cell>
                    <Table.Cell>{t.rider_id ?? "—"}</Table.Cell>
                    <Table.Cell>{peso(t.amount)}</Table.Cell>
                    <Table.Cell>
                      {new Date(t.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            <Heading level="h2" className="my-4">
              Remitted ({q.data.remitted.length})
            </Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Rider</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>When</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {q.data.remitted.map((t) => (
                  <Table.Row key={t.id}>
                    <Table.Cell>{t.order_id ?? "—"}</Table.Cell>
                    <Table.Cell>{t.rider_id ?? "—"}</Table.Cell>
                    <Table.Cell>{peso(t.amount)}</Table.Cell>
                    <Table.Cell>
                      {new Date(t.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            <Heading level="h2" className="my-4">
              Over the Counter ({q.data.otc_collected.length})
            </Heading>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Reference</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>When</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {q.data.otc_collected.map((t) => (
                  <Table.Row key={t.id}>
                    <Table.Cell>{t.order_id ?? "—"}</Table.Cell>
                    <Table.Cell>{t.reference ?? "—"}</Table.Cell>
                    <Table.Cell>{peso(t.amount)}</Table.Cell>
                    <Table.Cell>
                      {new Date(t.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "COD Reconcile",
  icon: ReceiptPercent,
})

export default CodReconcilePage
