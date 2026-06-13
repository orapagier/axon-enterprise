// @ts-nocheck — React 19 vs @medusajs/ui's bundled @types/react@18 JSX mismatch.
// Runtime is fine (Vite builds the admin app, no tsc). Same as the other
// custom admin routes (sellers, memberships, traders).
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type OwedRow = {
  order_id: string
  display_id: number | null
  producer_id: string
  producer_name: string | null
  gross_centavos: number
  paid: boolean
}

type PayoutRow = {
  id: string
  producer_id: string
  producer_name: string | null
  order_id: string | null
  kind: "dtc_remit" | "hub_intake"
  gross_centavos: number | null
  amount_centavos: number
  method: "cash" | "gcash"
  reference: string | null
  notes: string | null
  created_at: string
}

type Producer = {
  id: string
  email: string
  name: string
  business_name: string | null
}

type PayoutData = { owed: OwedRow[]; recent: PayoutRow[]; producers: Producer[] }

const peso = (centavos: number | null): string =>
  centavos == null
    ? "—"
    : `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (v: string | null): string => {
  if (!v) return "—"
  const ms = Date.parse(v)
  if (!Number.isFinite(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const fetchPayouts = async (): Promise<PayoutData> => {
  const res = await fetch("/admin/producer-payouts", { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  return res.json()
}

async function postPayout(body: Record<string, unknown>) {
  const res = await fetch("/admin/producer-payouts", {
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
}

/** A single "owed" row with its own commission % → net, and a Mark paid button. */
function OwedRowControls({
  row,
  busy,
  onPay,
}: {
  row: OwedRow
  busy: boolean
  onPay: (net: number, gross: number, method: "cash" | "gcash") => void
}) {
  const grossPhp = row.gross_centavos / 100
  const [commission, setCommission] = useState("0")
  const [method, setMethod] = useState<"cash" | "gcash">("cash")
  const pct = Number(commission)
  const valid = Number.isFinite(pct) && pct >= 0 && pct < 100
  const net = valid ? grossPhp * (1 - pct / 100) : grossPhp

  return (
    <div className="flex items-end gap-x-3 justify-end flex-wrap">
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Commission %
        </Label>
        <Input
          type="number"
          min={0}
          max={99}
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          className="w-20"
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Net to pay
        </Label>
        <div className="h-8 flex items-center font-medium tabular-nums">
          {peso(Math.round(net * 100))}
        </div>
      </div>
      <Select value={method} onValueChange={(v) => setMethod(v as "cash" | "gcash")}>
        <Select.Trigger className="w-28">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="cash">Cash</Select.Item>
          <Select.Item value="gcash">GCash</Select.Item>
        </Select.Content>
      </Select>
      <Button
        size="small"
        variant="primary"
        isLoading={busy}
        disabled={busy || !valid}
        onClick={() => onPay(net, grossPhp, method)}
      >
        Mark paid
      </Button>
    </div>
  )
}

function HubIntakeForm({
  producers,
  onSubmit,
  busy,
}: {
  producers: Producer[]
  onSubmit: (body: Record<string, unknown>) => void
  busy: boolean
}) {
  const [producerId, setProducerId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"cash" | "gcash">("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  const amountNum = Number(amount)
  const valid = producerId && Number.isFinite(amountNum) && amountNum > 0

  const submit = () => {
    const p = producers.find((x) => x.id === producerId)
    onSubmit({
      kind: "hub_intake",
      producer_id: producerId,
      producer_name: p ? p.business_name || p.name : null,
      amount_php: amountNum,
      method,
      reference: reference || null,
      notes: notes || null,
    })
  }

  return (
    <div className="flex items-end gap-x-3 flex-wrap">
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Producer
        </Label>
        <Select value={producerId} onValueChange={setProducerId}>
          <Select.Trigger className="w-56">
            <Select.Value placeholder="Choose producer" />
          </Select.Trigger>
          <Select.Content>
            {producers.map((p) => (
              <Select.Item key={p.id} value={p.id}>
                {p.business_name || p.name} · {p.email}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Amount (₱)
        </Label>
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Method
        </Label>
        <Select value={method} onValueChange={(v) => setMethod(v as "cash" | "gcash")}>
          <Select.Trigger className="w-28">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="cash">Cash</Select.Item>
            <Select.Item value="gcash">GCash</Select.Item>
          </Select.Content>
        </Select>
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="xsmall" className="text-ui-fg-subtle">
          Note (optional)
        </Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 12kg mango intake"
          className="w-56"
        />
      </div>
      <Button
        size="small"
        variant="primary"
        isLoading={busy}
        disabled={busy || !valid}
        onClick={submit}
      >
        Record payout
      </Button>
    </div>
  )
}

const ProducerPayoutsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["producer-payouts"],
    queryFn: fetchPayouts,
    refetchOnWindowFocus: false,
  })

  const mutation = useMutation({
    mutationFn: postPayout,
    onSuccess: () => {
      toast.success("Payout recorded.")
      queryClient.invalidateQueries({ queryKey: ["producer-payouts"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const owed = (data?.owed ?? []).filter((r) => !r.paid)
  const recent = data?.recent ?? []
  const producers = data?.producers ?? []

  return (
    <Container className="p-0">
      <div className="px-6 py-5 border-b">
        <Heading level="h1">Producer payouts</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Pay producers what they&apos;re owed. <b>Direct-to-consumer</b> sales:
          the hub collected the buyer&apos;s cash, so remit the producer&apos;s
          share once the order&apos;s cash has settled. <b>Sell-to-FreshHub</b>:
          record the cash you handed the producer at intake.
        </Text>
      </div>

      {isLoading ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Loading…</Text>
        </div>
      ) : isError ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-error">
            Couldn&apos;t load: {(error as Error)?.message ?? "unknown error"}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-y-8 px-6 py-6">
          {/* Owed (DTC) */}
          <section>
            <Heading level="h2" className="mb-3">
              Owed to producers (direct-to-consumer)
            </Heading>
            {owed.length === 0 ? (
              <Text className="text-ui-fg-subtle">
                Nothing owed right now — settled DTC orders show up here until
                the producer is paid.
              </Text>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Order</Table.HeaderCell>
                    <Table.HeaderCell>Producer</Table.HeaderCell>
                    <Table.HeaderCell>Gross</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      Remit
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {owed.map((row) => {
                    const busy =
                      mutation.isPending &&
                      mutation.variables?.order_id === row.order_id &&
                      mutation.variables?.producer_id === row.producer_id
                    return (
                      <Table.Row key={`${row.order_id}:${row.producer_id}`}>
                        <Table.Cell>
                          <a
                            href={`/app/orders/${row.order_id}`}
                            className="font-medium text-ui-fg-interactive"
                          >
                            #{row.display_id ?? "—"}
                          </a>
                        </Table.Cell>
                        <Table.Cell>
                          {row.producer_name ?? row.producer_id}
                        </Table.Cell>
                        <Table.Cell className="tabular-nums">
                          {peso(row.gross_centavos)}
                        </Table.Cell>
                        <Table.Cell>
                          <OwedRowControls
                            row={row}
                            busy={busy}
                            onPay={(net, gross, method) =>
                              mutation.mutate({
                                kind: "dtc_remit",
                                producer_id: row.producer_id,
                                producer_name: row.producer_name,
                                order_id: row.order_id,
                                amount_php: net,
                                gross_php: gross,
                                method,
                              })
                            }
                          />
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table>
            )}
          </section>

          {/* Hub intake cash payout */}
          <section>
            <Heading level="h2" className="mb-3">
              Record a cash payout (sell-to-FreshHub intake)
            </Heading>
            {producers.length === 0 ? (
              <Text className="text-ui-fg-subtle">
                No producer accounts yet.
              </Text>
            ) : (
              <HubIntakeForm
                producers={producers}
                busy={mutation.isPending && mutation.variables?.kind === "hub_intake"}
                onSubmit={(body) => mutation.mutate(body)}
              />
            )}
          </section>

          {/* History */}
          <section>
            <Heading level="h2" className="mb-3">
              Recent payouts
            </Heading>
            {recent.length === 0 ? (
              <Text className="text-ui-fg-subtle">No payouts recorded yet.</Text>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Producer</Table.HeaderCell>
                    <Table.HeaderCell>Kind</Table.HeaderCell>
                    <Table.HeaderCell>Order</Table.HeaderCell>
                    <Table.HeaderCell>Method</Table.HeaderCell>
                    <Table.HeaderCell className="text-right">
                      Amount
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {recent.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell>{formatDate(p.created_at)}</Table.Cell>
                      <Table.Cell>{p.producer_name ?? p.producer_id}</Table.Cell>
                      <Table.Cell>
                        <Badge color={p.kind === "dtc_remit" ? "blue" : "purple"}>
                          {p.kind === "dtc_remit" ? "DTC remit" : "Hub intake"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {p.order_id ? (
                          <a
                            href={`/app/orders/${p.order_id}`}
                            className="text-ui-fg-interactive"
                          >
                            view
                          </a>
                        ) : (
                          "—"
                        )}
                      </Table.Cell>
                      <Table.Cell className="capitalize">{p.method}</Table.Cell>
                      <Table.Cell className="text-right tabular-nums font-medium">
                        {peso(p.amount_centavos)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </section>
        </div>
      )}

      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Producer payouts",
  icon: CurrencyDollar,
})

export default ProducerPayoutsPage
