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
