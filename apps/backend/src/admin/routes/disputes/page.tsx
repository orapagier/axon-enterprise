// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ExclamationCircle } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Resolution =
  | "pending"
  | "buyer_fault"
  | "producer_fault"
  | "rider_fault"
  | "platform_fault"

type AppealState = "none" | "requested" | "upheld" | "overturned"

// The top filter is the set of resolutions plus a dedicated "appeals to review"
// view (resolution=buyer_fault + appeal_state=requested).
type Filter = Resolution | "appeal_requested"

type Dispute = {
  id: string
  order_id: string
  dispatch_order_id: string
  customer_id: string
  rider_photo_url: string | null
  rider_notes: string | null
  buyer_reason: string | null
  buyer_notes: string | null
  buyer_responded_at: string | null
  producer_response: string | null
  producer_responded_at: string | null
  resolution: Resolution
  resolution_notes: string | null
  escalated_at: string | null
  auto_resolved: boolean
  appeal_state: AppealState
  appeal_notes: string | null
  appeal_requested_at: string | null
  overdue?: boolean
  created_at: string
  customer: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

const TONE: Record<Resolution, "grey" | "red" | "blue" | "orange" | "green"> = {
  pending: "orange",
  buyer_fault: "red",
  producer_fault: "blue",
  rider_fault: "grey",
  platform_fault: "green",
}

const fetchDisputes = async (filter: Filter): Promise<Dispute[]> => {
  const url =
    filter === "appeal_requested"
      ? "/admin/disputes?appeal=requested"
      : `/admin/disputes?resolution=${filter}`
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  const body = (await res.json()) as { disputes: Dispute[] }
  return body.disputes ?? []
}

const ResolveForm = ({
  dispute,
  onResolved,
}: {
  dispute: Dispute
  onResolved: () => void
}) => {
  const [resolution, setResolution] = useState<Resolution>("buyer_fault")
  const [notes, setNotes] = useState("")
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/admin/disputes/${dispute.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resolution,
          resolution_notes: notes,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
    },
    onSuccess: () => {
      toast.success("Resolved")
      onResolved()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="rounded-lg border p-4 bg-grey-5 mt-3">
      <Heading level="h3" className="mb-2">
        Resolve
      </Heading>
      <div className="flex gap-3 items-start">
        <Select
          value={resolution}
          onValueChange={(v) => setResolution(v as Resolution)}
        >
          <Select.Trigger className="w-[200px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="buyer_fault">Buyer fault</Select.Item>
            <Select.Item value="producer_fault">Producer fault</Select.Item>
            <Select.Item value="rider_fault">Rider fault</Select.Item>
            <Select.Item value="platform_fault">Platform fault</Select.Item>
          </Select.Content>
        </Select>
        <div className="flex-1">
          <Textarea
            placeholder="Notes (visible internally)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          Resolve
        </Button>
      </div>
      {resolution === "buyer_fault" && (
        <Text className="text-ui-fg-subtle text-sm mt-2">
          Strike count will increment (warned → 30-day prepay lock → permanent).
        </Text>
      )}
    </div>
  )
}

const AppealForm = ({
  dispute,
  onResolved,
}: {
  dispute: Dispute
  onResolved: () => void
}) => {
  const [decision, setDecision] = useState<"overturn" | "uphold">("overturn")
  const [notes, setNotes] = useState("")
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/admin/disputes/${dispute.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
    },
    onSuccess: () => {
      toast.success(decision === "overturn" ? "Appeal granted" : "Appeal denied")
      onResolved()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="rounded-lg border p-4 bg-grey-5 mt-3">
      <Heading level="h3" className="mb-2">
        Appeal review
      </Heading>
      {dispute.appeal_notes && (
        <Text className="text-ui-fg-subtle text-sm mb-3">
          Buyer&apos;s appeal: {dispute.appeal_notes}
        </Text>
      )}
      <div className="flex gap-3 items-start">
        <Select
          value={decision}
          onValueChange={(v) => setDecision(v as "overturn" | "uphold")}
        >
          <Select.Trigger className="w-[220px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="overturn">Overturn (remove strike)</Select.Item>
            <Select.Item value="uphold">Uphold (strike stands)</Select.Item>
          </Select.Content>
        </Select>
        <div className="flex-1">
          <Textarea
            placeholder="Decision notes (visible internally)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Decide
        </Button>
      </div>
      {decision === "overturn" && (
        <Text className="text-ui-fg-subtle text-sm mt-2">
          The buyer&apos;s most recent strike will be reversed and their account
          state recomputed.
        </Text>
      )}
    </div>
  )
}

const DisputesPage = () => {
  const [resolution, setResolution] = useState<Filter>("pending")
  const [openId, setOpenId] = useState<string | null>(null)
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ["disputes", resolution],
    queryFn: () => fetchDisputes(resolution),
  })

  const disputes = q.data ?? []
  const open = disputes.find((d) => d.id === openId) ?? null

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">Refusal disputes</Heading>
            <Text className="text-ui-fg-subtle">
              Adjudicate buyer / producer disagreements over delivery refusals.
            </Text>
          </div>
          <Select
            value={resolution}
            onValueChange={(v) => setResolution(v as Resolution)}
          >
            <Select.Trigger className="w-[220px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="buyer_fault">Buyer fault</Select.Item>
              <Select.Item value="producer_fault">Producer fault</Select.Item>
              <Select.Item value="rider_fault">Rider fault</Select.Item>
              <Select.Item value="platform_fault">Platform fault</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="px-6 py-4">
        {q.isLoading ? (
          <Text>Loading…</Text>
        ) : disputes.length === 0 ? (
          <Text className="text-ui-fg-subtle">No disputes in this state.</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell>Reason</Table.HeaderCell>
                <Table.HeaderCell>Resolution</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {disputes.map((d) => (
                <Table.Row key={d.id}>
                  <Table.Cell>{d.customer?.email ?? d.customer_id}</Table.Cell>
                  <Table.Cell>
                    <code className="text-xs">{d.order_id}</code>
                  </Table.Cell>
                  <Table.Cell>{d.buyer_reason ?? "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge color={TONE[d.resolution]}>{d.resolution}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        setOpenId(openId === d.id ? null : d.id)
                      }
                    >
                      {openId === d.id ? "Close" : "Open"}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {open && (
          <div className="border-t mt-6 pt-4">
            <Heading level="h2" className="mb-3">
              {open.id}
            </Heading>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Text className="font-medium">Rider notes</Text>
                <Text className="text-ui-fg-subtle">
                  {open.rider_notes ?? "—"}
                </Text>
                {open.rider_photo_url && (
                  <a
                    href={open.rider_photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ui-fg-interactive underline text-sm"
                  >
                    View photo →
                  </a>
                )}
              </div>
              <div>
                <Text className="font-medium">Buyer statement</Text>
                <Text className="text-ui-fg-subtle">
                  {open.buyer_reason
                    ? `[${open.buyer_reason}] ${open.buyer_notes ?? ""}`
                    : "No response yet"}
                </Text>
              </div>
              <div>
                <Text className="font-medium">Producer statement</Text>
                <Text className="text-ui-fg-subtle">
                  {open.producer_response ?? "No response yet"}
                </Text>
              </div>
            </div>

            {open.resolution === "pending" ? (
              <ResolveForm
                dispute={open}
                onResolved={() => {
                  qc.invalidateQueries({ queryKey: ["disputes"] })
                  setOpenId(null)
                }}
              />
            ) : (
              <div className="mt-3 text-sm">
                <Text>
                  Resolved as <Badge color={TONE[open.resolution]}>{open.resolution}</Badge>
                </Text>
                {open.resolution_notes && (
                  <Text className="text-ui-fg-subtle mt-1">
                    {open.resolution_notes}
                  </Text>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Disputes",
  icon: ExclamationCircle,
})

export default DisputesPage
