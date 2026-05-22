// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx for
// the explanation. Runtime is fine — Vite bundles the admin app without tsc.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Truck } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

type BatchStatus = "collecting" | "locked" | "in_transit" | "completed"

type Batch = {
  id: string
  hub_id: string
  dispatch_date: string
  cutoff_at: string
  dispatched_at: string | null
  status: BatchStatus
  order_count: number
  hub: { id: string; name: string; slug: string } | null
}

type DispatchOrder = {
  id: string
  order_id: string
  rider_id: string | null
  manifest_position: number
  delivered_at: string | null
  delivery_status: "pending" | "delivered" | "refused" | "missed" | "disputed"
}

const STATUS_TONE: Record<BatchStatus, "grey" | "blue" | "orange" | "green"> = {
  collecting: "grey",
  locked: "orange",
  in_transit: "blue",
  completed: "green",
}

const NEXT_STATUS: Record<BatchStatus, BatchStatus | null> = {
  collecting: "locked",
  locked: "in_transit",
  in_transit: "completed",
  completed: null,
}

function todayManilaISO(): string {
  // YYYY-MM-DD for "today" in Asia/Manila, no DST.
  const now = new Date()
  const local = new Date(now.getTime() + 8 * 60 * 60_000)
  return local.toISOString().slice(0, 10)
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const fetchBatches = async (date: string): Promise<Batch[]> => {
  const res = await fetch(`/admin/dispatch/batches?date=${date}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  const body = (await res.json()) as { batches: Batch[] }
  return body.batches ?? []
}

const fetchBatchDetail = async (
  id: string
): Promise<{ batch: Batch; orders: DispatchOrder[] }> => {
  const res = await fetch(`/admin/dispatch/batches/${id}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  return (await res.json()) as { batch: Batch; orders: DispatchOrder[] }
}

const DispatchPage = () => {
  const [date, setDate] = useState<string>(todayManilaISO())
  const [openBatchId, setOpenBatchId] = useState<string | null>(null)
  const qc = useQueryClient()

  const batchesQuery = useQuery({
    queryKey: ["dispatch-batches", date],
    queryFn: () => fetchBatches(date),
  })

  const detailQuery = useQuery({
    queryKey: ["dispatch-batch", openBatchId],
    queryFn: () => (openBatchId ? fetchBatchDetail(openBatchId) : null),
    enabled: !!openBatchId,
  })

  const transition = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BatchStatus }) => {
      const res = await fetch(`/admin/dispatch/batches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
    },
    onSuccess: () => {
      toast.success("Batch updated")
      qc.invalidateQueries({ queryKey: ["dispatch-batches"] })
      qc.invalidateQueries({ queryKey: ["dispatch-batch"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const assignRider = useMutation({
    mutationFn: async ({
      orderId,
      riderId,
    }: {
      orderId: string
      riderId: string
    }) => {
      const res = await fetch(`/admin/dispatch/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rider_id: riderId || null }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
    },
    onSuccess: () => {
      toast.success("Rider updated")
      qc.invalidateQueries({ queryKey: ["dispatch-batch"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const printManifest = (batch: Batch, orders: DispatchOrder[]) => {
    const html = `<!doctype html><html><head><title>Manifest ${batch.id}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{margin:0 0 4px}
        .meta{color:#555;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:14px}
        th{background:#f3f4f6}
      </style></head><body>
      <h1>${batch.hub?.name ?? batch.hub_id} — Dispatch Manifest</h1>
      <div class="meta">Date ${new Date(batch.dispatch_date).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })} · Status ${batch.status}</div>
      <table>
        <thead><tr><th>#</th><th>Order</th><th>Rider</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.map((o) => `<tr>
            <td>${o.manifest_position + 1}</td>
            <td>${o.order_id}</td>
            <td>${o.rider_id ?? "—"}</td>
            <td>${o.delivery_status}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`
    const w = window.open("", "_blank", "width=900,height=700")
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  const batches = batchesQuery.data ?? []

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">Dispatch</Heading>
            <Text className="text-ui-fg-subtle">
              Daily batches per hub. Cutoff 12:00, dispatch 16:00.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-ui-fg-subtle">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {batchesQuery.isLoading ? (
          <Text>Loading…</Text>
        ) : batches.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No dispatch batches for {date}.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Hub</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Cutoff</Table.HeaderCell>
                <Table.HeaderCell>Orders</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {batches.map((b) => {
                const next = NEXT_STATUS[b.status]
                return (
                  <Table.Row key={b.id}>
                    <Table.Cell>{b.hub?.name ?? b.hub_id}</Table.Cell>
                    <Table.Cell>
                      <Badge color={STATUS_TONE[b.status]}>{b.status}</Badge>
                    </Table.Cell>
                    <Table.Cell>{fmtTime(b.cutoff_at)}</Table.Cell>
                    <Table.Cell>{b.order_count}</Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => setOpenBatchId(b.id)}
                        >
                          Open
                        </Button>
                        {next && (
                          <Button
                            size="small"
                            onClick={() =>
                              transition.mutate({ id: b.id, status: next })
                            }
                          >
                            → {next}
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
      </div>

      {openBatchId && detailQuery.data && (
        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <Heading level="h2">
              Manifest — {detailQuery.data.batch.hub?.name ?? detailQuery.data.batch.hub_id}
            </Heading>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  printManifest(detailQuery.data!.batch, detailQuery.data!.orders)
                }
              >
                Print manifest
              </Button>
              <Button variant="secondary" onClick={() => setOpenBatchId(null)}>
                Close
              </Button>
            </div>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>#</Table.HeaderCell>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell>Rider</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {detailQuery.data.orders.map((o) => (
                <Table.Row key={o.id}>
                  <Table.Cell>{o.manifest_position + 1}</Table.Cell>
                  <Table.Cell>{o.order_id}</Table.Cell>
                  <Table.Cell>
                    <Input
                      placeholder="Rider id"
                      defaultValue={o.rider_id ?? ""}
                      onBlur={(e) =>
                        e.target.value !== (o.rider_id ?? "") &&
                        assignRider.mutate({
                          orderId: o.id,
                          riderId: e.target.value,
                        })
                      }
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge>{o.delivery_status}</Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Dispatch",
  icon: Truck,
})

export default DispatchPage
