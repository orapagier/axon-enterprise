// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here (see src/admin/routes/memberships/page.tsx for the
// long-form note). Vite builds the admin app without tsc, so runtime is fine.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { RocketLaunch } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

type RiderStatus = "pending" | "active" | "inactive" | "suspended"

type Rider = {
  id: string
  full_name: string
  phone: string
  email: string | null
  hub_id: string
  status: RiderStatus
  notes: string | null
  created_at: string
}

type Hub = { id: string; name: string }

const STATUS_COLOR: Record<RiderStatus, "orange" | "green" | "grey" | "red"> = {
  pending: "orange",
  active: "green",
  inactive: "grey",
  suspended: "red",
}

// Pending signups float to the top — they're the queue this page exists for.
const STATUS_ORDER: Record<RiderStatus, number> = {
  pending: 0,
  active: 1,
  suspended: 2,
  inactive: 3,
}

const fetchRiders = async (): Promise<Rider[]> => {
  const res = await fetch("/admin/riders", { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load riders (${res.status})`)
  const body = (await res.json()) as { riders: Rider[] }
  return body.riders ?? []
}

const fetchHubs = async (): Promise<Hub[]> => {
  const res = await fetch("/admin/hubs", { credentials: "include" })
  if (!res.ok) return []
  const body = (await res.json()) as { hubs?: Hub[] }
  return body.hubs ?? []
}

const formatDate = (v: string): string => {
  const ms = Date.parse(v)
  if (!Number.isFinite(ms)) return "—"
  return new Date(ms).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const RidersPage = () => {
  const queryClient = useQueryClient()

  const ridersQuery = useQuery({ queryKey: ["riders"], queryFn: fetchRiders })
  const hubsQuery = useQuery({ queryKey: ["riders-hubs"], queryFn: fetchHubs })

  const hubName = (id: string): string =>
    hubsQuery.data?.find((h) => h.id === id)?.name ?? id

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: RiderStatus }) => {
      const res = await fetch(`/admin/riders/${input.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `Update failed (${res.status})`)
      return body
    },
    onSuccess: (_body, input) => {
      toast.success(
        input.status === "active" ? "Rider activated" : `Rider ${input.status}`
      )
      queryClient.invalidateQueries({ queryKey: ["riders"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const riders = [...(ridersQuery.data ?? [])].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Date.parse(b.created_at) - Date.parse(a.created_at)
  )
  const pendingCount = riders.filter((r) => r.status === "pending").length

  const actionsFor = (r: Rider) => {
    if (r.status === "pending") {
      return (
        <div className="flex gap-2">
          <Button
            size="small"
            onClick={() => setStatus.mutate({ id: r.id, status: "active" })}
            disabled={setStatus.isPending}
          >
            Approve — bond paid
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setStatus.mutate({ id: r.id, status: "inactive" })}
            disabled={setStatus.isPending}
          >
            Reject
          </Button>
        </div>
      )
    }
    if (r.status === "active") {
      return (
        <Button
          size="small"
          variant="secondary"
          onClick={() => setStatus.mutate({ id: r.id, status: "suspended" })}
          disabled={setStatus.isPending}
        >
          Suspend
        </Button>
      )
    }
    return (
      <Button
        size="small"
        variant="secondary"
        onClick={() => setStatus.mutate({ id: r.id, status: "active" })}
        disabled={setStatus.isPending}
      >
        Activate
      </Button>
    )
  }

  return (
    <Container className="p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Riders</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Riders self-register in the rider app and wait here as Pending.
            Approve after collecting the cash bond at the counter.
          </Text>
        </div>
        {pendingCount > 0 && (
          <Badge color="orange">{pendingCount} pending approval</Badge>
        )}
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Rider</Table.HeaderCell>
            <Table.HeaderCell>Mobile</Table.HeaderCell>
            <Table.HeaderCell>Email (Google sign-in)</Table.HeaderCell>
            <Table.HeaderCell>Hub</Table.HeaderCell>
            <Table.HeaderCell>Registered</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {riders.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>{r.full_name}</Table.Cell>
              <Table.Cell>{r.phone}</Table.Cell>
              <Table.Cell>{r.email ?? "—"}</Table.Cell>
              <Table.Cell>{hubName(r.hub_id)}</Table.Cell>
              <Table.Cell>{formatDate(r.created_at)}</Table.Cell>
              <Table.Cell>
                <Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge>
              </Table.Cell>
              <Table.Cell>{actionsFor(r)}</Table.Cell>
            </Table.Row>
          ))}
          {!ridersQuery.isLoading && riders.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={7}>
                <Text size="small" className="text-ui-fg-subtle">
                  No riders yet — they appear here after registering in the
                  rider app.
                </Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Riders",
  icon: RocketLaunch,
})

export default RidersPage
