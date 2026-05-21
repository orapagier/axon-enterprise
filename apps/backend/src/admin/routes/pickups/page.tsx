// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here (Button, Table.Cell, etc.). Runtime is fine — the
// admin app is built by Vite, which doesn't run tsc.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CalendarSolid } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
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
import WindowDrawer from "./components/window-drawer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PickupSlot = {
  id: string
  pickup_window_id: string
  listing_id: string
  estimated_kg: number
  status: "reserved" | "picked_up" | "no_show" | "rejected"
  picked_up_at: string | null
  notes: string | null
  created_at: string
}

type PickupWindow = {
  id: string
  hub_id: string
  hub_area_id: string
  date: string
  start_time: string
  end_time: string
  capacity_kg: number | null
  reserved_kg: number
  status: "open" | "full" | "closed" | "completed"
  slots_count: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const fetchWindows = async (): Promise<PickupWindow[]> => {
  const res = await fetch("/admin/pickup-windows", { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { windows: PickupWindow[] }
  return body.windows ?? []
}

const fetchSlots = async (windowId: string): Promise<PickupSlot[]> => {
  const res = await fetch(`/admin/pickup-windows/${windowId}/slots`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed to load slots (${res.status})`)
  const body = (await res.json()) as { slots: PickupSlot[] }
  return body.slots ?? []
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const statusBadge = (status: string) => {
  const map: Record<string, { color: "green" | "orange" | "red" | "grey"; label: string }> = {
    open: { color: "green", label: "Open" },
    full: { color: "orange", label: "Full" },
    closed: { color: "red", label: "Closed" },
    completed: { color: "grey", label: "Completed" },
  }
  const s = map[status] ?? { color: "grey" as const, label: status }
  return <Badge color={s.color}>{s.label}</Badge>
}

const slotStatusBadge = (status: string) => {
  const map: Record<string, { color: "green" | "orange" | "red" | "grey"; label: string }> = {
    reserved: { color: "green", label: "Reserved" },
    picked_up: { color: "green", label: "Picked up" },
    no_show: { color: "red", label: "No show" },
    rejected: { color: "grey", label: "Rejected" },
  }
  const s = map[status] ?? { color: "grey" as const, label: status }
  return <Badge color={s.color}>{s.label}</Badge>
}

// ---------------------------------------------------------------------------
// Generate-form state
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ---------------------------------------------------------------------------
// PickupsPage
// ---------------------------------------------------------------------------

const PickupsPage = () => {
  const queryClient = useQueryClient()

  const { data: windows, isLoading, isError, error } = useQuery({
    queryKey: ["pickup-windows"],
    queryFn: fetchWindows,
    refetchOnWindowFocus: false,
  })

  // Window drawer
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  // Generate modal
  const [genOpen, setGenOpen] = useState(false)
  const [genForm, setGenForm] = useState({
    hub_area_id: "",
    from: new Date().toISOString().slice(0, 10),
    to: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
    days_of_week: [2, 5] as number[],
    start_time: "06:00",
    end_time: "10:00",
    capacity_kg: 500,
  })

  const generateWindows = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/pickup-windows/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Request failed")
      }
      return res.json()
    },
    onSuccess: (data: { created: PickupWindow[]; skipped: { date: string; reason: string }[] }) => {
      toast.success(
        `${data.created.length} windows created, ${data.skipped.length} skipped.`
      )
      setGenOpen(false)
      queryClient.invalidateQueries({ queryKey: ["pickup-windows"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleDay = (day: number) => {
    setGenForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }))
  }

  // Group windows by date for calendar-style display
  const grouped = (windows ?? []).reduce<Record<string, PickupWindow[]>>((acc, w) => {
    const date = typeof w.date === "string" ? w.date.slice(0, 10) : w.date
    if (!acc[date]) acc[date] = []
    acc[date].push(w)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  if (isLoading) return <div className="p-8 text-ui-fg-muted">Loading pickup windows…</div>
  if (isError) return <div className="p-8 text-ui-fg-error">Error: {(error as Error)?.message}</div>

  return (
    <div>
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <Heading>Pickup Windows</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Schedule and manage producer pickup windows.
          </Text>
        </div>
        <div className="flex gap-x-3">
          <Button variant="secondary" onClick={() => setGenOpen(true)}>
            Generate windows
          </Button>
        </div>
      </div>

      {/* Calendar-style week view */}
      <Container className="mx-8 mb-8">
        {sortedDates.length === 0 ? (
          <div className="py-12 text-center text-ui-fg-muted">
            No pickup windows found. Use &ldquo;Generate windows&rdquo; to create a schedule.
          </div>
        ) : (
          <div className="divide-y">
            {sortedDates.map((date) => (
              <div key={date} className="py-4 px-6">
                <div className="flex items-center gap-x-3 mb-3">
                  <span className="font-semibold text-ui-fg-base">
                    {new Date(date).toLocaleDateString("en-PH", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-ui-fg-muted text-sm">
                    {grouped[date].length} window{grouped[date].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-3">
                  {grouped[date].map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-ui-bg-base-hover transition-colors"
                      onClick={() => setSelectedWindowId(w.id)}
                    >
                      <div className="flex items-center gap-x-4">
                        <div>
                          <Text className="font-semibold">
                            {w.start_time} – {w.end_time}
                          </Text>
                          <div className="flex items-center gap-x-2 mt-1">
                            {statusBadge(w.status)}
                            <Text className="text-ui-fg-muted text-sm">
                              {w.reserved_kg} / {w.capacity_kg ?? "∞"} kg
                            </Text>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Text className="font-semibold text-ui-fg-base">
                          {w.slots_count} slot{w.slots_count !== 1 ? "s" : ""}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Window drawer */}
      {selectedWindowId && (
        <WindowDrawer
          windowId={selectedWindowId}
          onClose={() => {
            setSelectedWindowId(null)
            queryClient.invalidateQueries({ queryKey: ["pickup-windows"] })
          }}
        />
      )}

      {/* Generate windows modal */}
      {genOpen && (
        <Drawer open={genOpen} onOpenChange={setGenOpen}>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Generate Pickup Windows</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-y-4 px-6 py-4">
              <Label>Hub Area ID</Label>
              <Input
                value={genForm.hub_area_id}
                onChange={(e) =>
                  setGenForm((f) => ({ ...f, hub_area_id: e.target.value }))
                }
                placeholder="Enter hub area ID"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={genForm.from}
                    onChange={(e) =>
                      setGenForm((f) => ({ ...f, from: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={genForm.to}
                    onChange={(e) =>
                      setGenForm((f) => ({ ...f, to: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={genForm.start_time}
                    onChange={(e) =>
                      setGenForm((f) => ({ ...f, start_time: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={genForm.end_time}
                    onChange={(e) =>
                      setGenForm((f) => ({ ...f, end_time: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Days of week</Label>
                <div className="flex gap-x-2 mt-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        genForm.days_of_week.includes(day)
                          ? "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"
                          : "bg-ui-bg-base border-ui-border-base text-ui-fg-muted"
                      }`}
                    >
                      {DAY_NAMES[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Capacity (kg, leave empty for unlimited)</Label>
                <Input
                  type="number"
                  value={genForm.capacity_kg ?? ""}
                  onChange={(e) =>
                    setGenForm((f) => ({
                      ...f,
                      capacity_kg: e.target.value ? parseInt(e.target.value, 10) : null,
                    }))
                  }
                  placeholder="Unlimited"
                />
              </div>
            </Drawer.Body>
            <Drawer.Footer>
              <Button
                variant="secondary"
                onClick={() => setGenOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => generateWindows.mutate()}
                disabled={generateWindows.isPending || !genForm.hub_area_id.trim()}
              >
                {generateWindows.isPending ? "Generating…" : "Generate"}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      )}

      <Toaster />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Pickups",
  icon: CalendarSolid,
})

export default PickupsPage