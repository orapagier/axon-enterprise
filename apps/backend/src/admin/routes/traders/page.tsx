// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here. Runtime is fine — the admin app is built by Vite,
// which doesn't run tsc. Same situation as src/admin/routes/sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Tabs,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

// Keep in sync with DEFAULT_TRADER_DISCOUNT in src/lib/trader.ts.
const DEFAULT_DISCOUNT = 10

type Tab = "pending" | "approved"

type TraderRow = {
  customer: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    phone: string | null
    created_at: string
  }
  trader: {
    approved: boolean
    approved_at: string | null
    discount_percent: number | null
    min_order_note: string | null
  }
}

const TAB_LABEL: Record<Tab, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
}

const fetchTraders = async (tab: Tab): Promise<TraderRow[]> => {
  const url = `/admin/traders?approved=${tab === "approved" ? "true" : "false"}`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { traders: TraderRow[] }
  return body.traders ?? []
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

const displayName = (r: TraderRow): string => {
  const name = [r.customer.first_name, r.customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return name || r.customer.email
}

const businessName = (r: TraderRow): string =>
  r.customer.company_name || "—"

/** One editable trader row — discount % + min-order note + approve/revoke. */
function TraderRowControls({
  row,
  tab,
  onApprove,
  onRevoke,
  busy,
}: {
  row: TraderRow
  tab: Tab
  onApprove: (id: string, pct: number, note: string) => void
  onRevoke: (id: string) => void
  busy: boolean
}) {
  const [pct, setPct] = useState<string>(
    row.trader.discount_percent != null
      ? String(row.trader.discount_percent)
      : String(DEFAULT_DISCOUNT)
  )
  const [note, setNote] = useState<string>(row.trader.min_order_note ?? "")

  // Re-sync local inputs if the underlying row changes (e.g. after a refetch).
  useEffect(() => {
    setPct(
      row.trader.discount_percent != null
        ? String(row.trader.discount_percent)
        : String(DEFAULT_DISCOUNT)
    )
    setNote(row.trader.min_order_note ?? "")
  }, [row.trader.discount_percent, row.trader.min_order_note])

  const pctNum = Number(pct)
  const pctValid = Number.isInteger(pctNum) && pctNum >= 1 && pctNum <= 90

  return (
    <div className="flex items-end gap-x-3 justify-end flex-wrap">
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Discount %
        </Label>
        <Input
          type="number"
          min={1}
          max={90}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="w-20"
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Min-order note (optional)
        </Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. ₱5,000 minimum"
          className="w-48"
        />
      </div>
      <Button
        size="small"
        variant="primary"
        isLoading={busy}
        disabled={busy || !pctValid}
        title={!pctValid ? "Discount must be a whole number 1–90." : undefined}
        onClick={() => onApprove(row.customer.id, pctNum, note.trim())}
      >
        {tab === "approved" ? "Update" : "Approve"}
      </Button>
      {tab === "approved" && (
        <Button
          size="small"
          variant="danger"
          isLoading={busy}
          disabled={busy}
          onClick={() => onRevoke(row.customer.id)}
        >
          Revoke
        </Button>
      )}
    </div>
  )
}

const TradersPage = () => {
  const [tab, setTab] = useState<Tab>("pending")
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["traders", tab],
    queryFn: () => fetchTraders(tab),
    refetchOnWindowFocus: false,
  })

  const action = useMutation({
    mutationFn: async (vars:
      | { id: string; action: "approve"; discount_percent: number; min_order_note: string }
      | { id: string; action: "revoke" }) => {
      const body =
        vars.action === "approve"
          ? {
              action: "approve",
              discount_percent: vars.discount_percent,
              min_order_note: vars.min_order_note || null,
            }
          : { action: "revoke" }
      const res = await fetch(`/admin/traders/${vars.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(b.error ?? `Request failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: (_r, vars) => {
      toast.success(
        vars.action === "approve"
          ? "Trader discount saved."
          : "Trader discount revoked."
      )
      queryClient.invalidateQueries({ queryKey: ["traders"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = data ?? []

  return (
    <Container className="p-0">
      <div className="px-6 py-5 border-b">
        <Heading level="h1">Trader (B2B) pricing</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Approve trader accounts and set each one&apos;s negotiated discount.
          The discount is applied automatically at checkout for that trader (a
          {" "}
          <code>TRADER-&lt;pct&gt;</code> promotion targeting their tier group).
          New approvals default to {DEFAULT_DISCOUNT}%; change the field before
          approving to negotiate a different rate. Re-saving an approved trader
          renegotiates their rate.
        </Text>
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
                    ? "No trader accounts awaiting approval."
                    : "No approved traders yet."}
                </Text>
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Customer</Table.HeaderCell>
                    <Table.HeaderCell>Business</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      Discount
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => {
                    const busy =
                      action.isPending && action.variables?.id === row.customer.id
                    return (
                      <Table.Row key={row.customer.id}>
                        <Table.Cell>
                          <a
                            href={`/app/customers/${row.customer.id}`}
                            className="flex flex-col hover:bg-ui-bg-base-hover rounded-md -mx-2 px-2 py-1 transition-colors"
                            title="Open customer in Medusa admin"
                          >
                            <span className="font-medium text-ui-fg-interactive">
                              {displayName(row)}
                            </span>
                            <span className="text-ui-fg-subtle text-xs">
                              {row.customer.email}
                            </span>
                            {row.customer.phone && (
                              <span className="text-ui-fg-subtle text-xs">
                                {row.customer.phone}
                              </span>
                            )}
                          </a>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-medium">
                            {businessName(row)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          {row.trader.approved ? (
                            <div className="flex flex-col gap-y-1">
                              <Badge color="green">
                                {row.trader.discount_percent}% off
                              </Badge>
                              <span className="text-ui-fg-subtle text-xs">
                                since {formatDate(row.trader.approved_at)}
                              </span>
                            </div>
                          ) : (
                            <Badge color="orange">Not approved</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <TraderRowControls
                            row={row}
                            tab={t}
                            busy={busy}
                            onApprove={(id, pct, n) =>
                              action.mutate({
                                id,
                                action: "approve",
                                discount_percent: pct,
                                min_order_note: n,
                              })
                            }
                            onRevoke={(id) =>
                              action.mutate({ id, action: "revoke" })
                            }
                          />
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
  label: "Traders",
  icon: CurrencyDollar,
})

export default TradersPage
