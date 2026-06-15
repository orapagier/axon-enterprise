// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ClockSolid } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

type Escalation = {
  order_id: string
  display_id: number
  seller_id: string
  producer: string
  tier: "free" | "standard" | "special"
  escalated_at: number | null
  admin_deadline_at: number | null
  items: string
  buyer_name: string | null
  buyer_phone: string | null
}

const fetchEscalations = async (): Promise<Escalation[]> => {
  const res = await fetch(`/admin/producer-orders`, { credentials: "include" })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  const body = (await res.json()) as { escalations: Escalation[] }
  return body.escalations ?? []
}

function remaining(target: number | null): string {
  if (!target) return "—"
  const ms = target - Date.now()
  if (ms <= 0) return "overdue"
  const m = Math.floor(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

const ProducerOrdersPage = () => {
  const [busy, setBusy] = useState<string | null>(null)
  const q = useQuery({
    queryKey: ["producer-orders-escalations"],
    queryFn: fetchEscalations,
    refetchInterval: 60_000,
  })

  const act = async (
    e: Escalation,
    action: "take" | "cancel"
  ) => {
    if (
      action === "cancel" &&
      !confirm(`Cancel order #${e.display_id}? The buyer will be notified.`)
    )
      return
    setBusy(`${e.order_id}:${action}`)
    try {
      const res = await fetch(`/admin/producer-orders/${e.order_id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ seller_id: e.seller_id }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error ?? `Failed (${res.status})`)
      }
      toast.success(
        action === "take"
          ? `Order #${e.display_id} taken by the hub.`
          : `Order #${e.display_id} cancelled.`
      )
      await q.refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const rows = q.data ?? []

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Producer order escalations</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Direct orders the producer didn&apos;t confirm in time. Take it
            (fulfil from hub stock) or cancel it before the window lapses — if
            you don&apos;t, it auto-cancels.
          </Text>
        </div>
        <Button variant="secondary" size="small" onClick={() => q.refetch()}>
          Refresh
        </Button>
      </div>

      {q.isLoading ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Loading…</Text>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">
            Nothing waiting. Escalations show up here when a producer misses
            their confirmation window.
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Producer</Table.HeaderCell>
              <Table.HeaderCell>Items</Table.HeaderCell>
              <Table.HeaderCell>Tier</Table.HeaderCell>
              <Table.HeaderCell>Window left</Table.HeaderCell>
              <Table.HeaderCell>Action</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((e) => (
              <Table.Row key={`${e.order_id}-${e.seller_id}`}>
                <Table.Cell>#{e.display_id}</Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col">
                    <span>{e.producer}</span>
                    {e.buyer_name && (
                      <span className="text-ui-fg-subtle text-xs">
                        Buyer: {e.buyer_name}
                        {e.buyer_phone ? ` · ${e.buyer_phone}` : ""}
                      </span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="max-w-xs truncate">{e.items}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{e.tier}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <span
                    className={
                      e.admin_deadline_at && e.admin_deadline_at <= Date.now()
                        ? "text-ui-fg-error"
                        : ""
                    }
                  >
                    {remaining(e.admin_deadline_at)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      variant="primary"
                      isLoading={busy === `${e.order_id}:take`}
                      disabled={!!busy}
                      onClick={() => act(e, "take")}
                    >
                      Take
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      isLoading={busy === `${e.order_id}:cancel`}
                      disabled={!!busy}
                      onClick={() => act(e, "cancel")}
                    >
                      Cancel
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Producer Orders",
  icon: ClockSolid,
})

export default ProducerOrdersPage
