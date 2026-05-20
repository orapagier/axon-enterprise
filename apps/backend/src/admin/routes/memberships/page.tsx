// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here (Button, Table.Cell, etc.). The runtime is fine —
// the admin app is built by Vite, which doesn't run tsc — but tsc --noEmit
// flags the file. The right long-term fix is for @medusajs/ui to ship types
// compatible with React 19; until then, opt this single UI file out rather
// than scatter `@ts-expect-error` over every component usage.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
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
import { useState } from "react"

type Status = "pending" | "active" | "cancelled"

type Membership = {
  customer: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    phone: string | null
    created_at: string
  }
  membership: {
    status: Status | null
    tier: string | null
    joinedAt: number | null
    expiresAt: number | null
    requestedAt: number | null
    paymentMethod: "gcash" | "bank" | null
    paymentReference: string | null
  }
}

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  active: "Active",
  cancelled: "Cancelled",
}

const TIER_DEFAULT = "harvest-01"

const fetchMemberships = async (status: Status): Promise<Membership[]> => {
  const res = await fetch(`/admin/memberships?status=${status}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { memberships: Membership[] }
  return body.memberships ?? []
}

const formatDate = (v: number | string | null): string => {
  if (!v) return "—"
  const ms = typeof v === "number" ? v : Date.parse(v)
  if (!Number.isFinite(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatPaymentMethod = (
  method: Membership["membership"]["paymentMethod"]
): string => {
  if (method === "gcash") return "GCash"
  if (method === "bank") return "Bank transfer"
  return "—"
}

const displayName = (c: Membership["customer"]): string => {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim()
  return name || c.email
}

const MembershipsPage = () => {
  const [tab, setTab] = useState<Status>("pending")
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["memberships", tab],
    queryFn: () => fetchMemberships(tab),
    refetchOnWindowFocus: false,
  })

  const action = useMutation({
    mutationFn: async ({
      id,
      verb,
    }: {
      id: string
      verb: "approve" | "reject" | "cancel"
    }) => {
      const res = await fetch(`/admin/memberships/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: verb, tier: TIER_DEFAULT }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      return res.json() as Promise<{ ok: true; action: string }>
    },
    onSuccess: (_result, vars) => {
      const verbCopy =
        vars.verb === "approve"
          ? "approved"
          : vars.verb === "reject"
            ? "rejected"
            : "cancelled"
      toast.success(`Membership ${verbCopy}.`)
      // After any state change, both the source tab and the destination tab
      // are stale; invalidating the prefix refetches all of them.
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  const rows = data ?? []

  return (
    <Container className="p-0">
      <div className="px-6 py-5 border-b">
        <Heading level="h1">Hub memberships</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Review and act on membership payment submissions. Approving flips the
          customer to active immediately and adds them to the{" "}
          <code className="font-mono text-ui-fg-base">hub-members</code> group.
        </Text>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <Tabs.List className="px-6 pt-4">
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <Tabs.Trigger key={s} value={s}>
              {STATUS_LABEL[s]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <Tabs.Content key={s} value={s} className="px-6 py-4">
            {isLoading ? (
              <Text className="text-ui-fg-subtle">Loading…</Text>
            ) : isError ? (
              <Text className="text-ui-fg-error">
                Couldn&apos;t load: {(error as Error)?.message ?? "unknown error"}
              </Text>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center">
                <Text className="text-ui-fg-subtle">
                  No {STATUS_LABEL[s].toLowerCase()} memberships right now.
                </Text>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Customer</Table.HeaderCell>
                    <Table.HeaderCell>
                      {s === "pending" ? "Requested" : s === "active" ? "Joined" : "Status"}
                    </Table.HeaderCell>
                    <Table.HeaderCell>Payment</Table.HeaderCell>
                    <Table.HeaderCell>Reference</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      Actions
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => {
                    const id = row.customer.id
                    const busy = action.isPending && action.variables?.id === id
                    return (
                      <Table.Row key={id}>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {displayName(row.customer)}
                            </span>
                            <span className="text-ui-fg-subtle text-xs">
                              {row.customer.email}
                            </span>
                            {row.customer.company_name && (
                              <span className="text-ui-fg-subtle text-xs">
                                {row.customer.company_name}
                              </span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {s === "pending" && (
                            <span>{formatDate(row.membership.requestedAt)}</span>
                          )}
                          {s === "active" && (
                            <div className="flex flex-col">
                              <span>{formatDate(row.membership.joinedAt)}</span>
                              <span className="text-ui-fg-subtle text-xs">
                                Renews {formatDate(row.membership.expiresAt)}
                              </span>
                            </div>
                          )}
                          {s === "cancelled" && (
                            <Badge color="red">Cancelled</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {formatPaymentMethod(row.membership.paymentMethod)}
                        </Table.Cell>
                        <Table.Cell>
                          <code className="font-mono text-xs">
                            {row.membership.paymentReference ?? "—"}
                          </code>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-x-2 justify-end">
                            {s === "pending" && (
                              <>
                                <Button
                                  size="small"
                                  variant="secondary"
                                  isLoading={busy && action.variables?.verb === "reject"}
                                  disabled={busy}
                                  onClick={() =>
                                    action.mutate({ id, verb: "reject" })
                                  }
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="small"
                                  variant="primary"
                                  isLoading={busy && action.variables?.verb === "approve"}
                                  disabled={busy}
                                  onClick={() =>
                                    action.mutate({ id, verb: "approve" })
                                  }
                                >
                                  Approve
                                </Button>
                              </>
                            )}
                            {s === "active" && (
                              <Button
                                size="small"
                                variant="danger"
                                isLoading={busy}
                                disabled={busy}
                                onClick={() =>
                                  action.mutate({ id, verb: "cancel" })
                                }
                              >
                                Cancel
                              </Button>
                            )}
                            {s === "cancelled" && (
                              <Button
                                size="small"
                                variant="secondary"
                                isLoading={busy}
                                disabled={busy}
                                onClick={() =>
                                  action.mutate({ id, verb: "approve" })
                                }
                              >
                                Reinstate
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
  label: "Memberships",
  icon: ShieldCheck,
})

export default MembershipsPage
