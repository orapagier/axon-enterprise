// @ts-nocheck — same React 19/18 type mismatch as the parent page.
import { Button, Drawer, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

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

const slotStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    reserved: "green",
    picked_up: "green",
    no_show: "red",
    rejected: "grey",
  }
  const labels: Record<string, string> = {
    reserved: "Reserved",
    picked_up: "Picked up",
    no_show: "No show",
    rejected: "Rejected",
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] === "green"
          ? "bg-green-100 text-green-800"
          : colors[status] === "red"
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  windowId: string
  onClose: () => void
}

// ---------------------------------------------------------------------------
// WindowDrawer
// ---------------------------------------------------------------------------

export default function WindowDrawer({ windowId, onClose }: Props) {
  const queryClient = useQueryClient()

  const {
    data: slots,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["pickup-window-slots", windowId],
    queryFn: async () => {
      const res = await fetch(`/admin/pickup-windows/${windowId}/slots`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Failed to load slots (${res.status})`)
      const body = (await res.json()) as { slots: PickupSlot[] }
      return body.slots ?? []
    },
    refetchOnWindowFocus: false,
  })

  const {
    data: windowData,
  } = useQuery({
    queryKey: ["pickup-window", windowId],
    queryFn: async () => {
      const res = await fetch(`/admin/pickup-windows/${windowId}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Failed to load window (${res.status})`)
      const body = (await res.json()) as { window: PickupWindow }
      return body.window
    },
    refetchOnWindowFocus: false,
  })

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  const markPickedUp = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(
        `/admin/pickup-windows/${windowId}/slots/${slotId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "picked_up" }),
        }
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Request failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Slot marked as picked up.")
      queryClient.invalidateQueries({ queryKey: ["pickup-window-slots", windowId] })
      queryClient.invalidateQueries({ queryKey: ["pickup-window", windowId] })
      queryClient.invalidateQueries({ queryKey: ["pickup-windows"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateSlot = useMutation({
    mutationFn: async (payload: {
      slotId: string
      status?: string
      notes?: string
    }) => {
      const res = await fetch(
        `/admin/pickup-windows/${windowId}/slots/${payload.slotId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: payload.status,
            notes: payload.notes,
          }),
        }
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? "Request failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Slot updated.")
      setEditingSlotId(null)
      queryClient.invalidateQueries({ queryKey: ["pickup-window-slots", windowId] })
      queryClient.invalidateQueries({ queryKey: ["pickup-windows"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Drawer open onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            Pickup Window —{" "}
            {windowData
              ? `${new Date(windowData.date).toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })} ${windowData.start_time}–${windowData.end_time}`
              : "Loading…"}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="px-6 py-4">
          {isLoading ? (
            <Text className="text-ui-fg-muted">Loading slots…</Text>
          ) : isError ? (
            <Text className="text-ui-fg-error">
              Error: {(error as Error)?.message}
            </Text>
          ) : (slots ?? []).length === 0 ? (
            <div className="py-8 text-center text-ui-fg-muted">
              No slots reserved for this window yet.
            </div>
          ) : (
            <div className="divide-y">
              {(slots ?? []).map((slot) => (
                <div key={slot.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-x-3">
                        {slotStatusBadge(slot.status)}
                        <Text className="font-semibold">
                          {slot.estimated_kg} kg
                        </Text>
                        <Text className="text-ui-fg-muted text-sm">
                          Listing: {slot.listing_id}
                        </Text>
                      </div>
                      {slot.picked_up_at && (
                        <Text className="text-ui-fg-muted text-xs mt-1">
                          Picked up: {new Date(slot.picked_up_at).toLocaleString()}
                        </Text>
                      )}
                      {slot.notes && (
                        <Text className="text-ui-fg-muted text-xs mt-1">
                          Notes: {slot.notes}
                        </Text>
                      )}
                    </div>

                    {slot.status === "reserved" && (
                      <div className="flex gap-x-2">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => markPickedUp.mutate(slot.id)}
                          disabled={markPickedUp.isPending}
                        >
                          {markPickedUp.isPending ? "…" : "Mark picked up"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setEditingSlotId(slot.id)
                            setNotes(slot.notes ?? "")
                          }}
                        >
                          Notes
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingSlotId === slot.id && (
                    <div className="mt-3 p-3 border rounded-lg bg-ui-bg-subtle">
                      <div className="flex gap-x-2">
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Admin notes…"
                          className="flex-1 px-3 py-1.5 text-sm border rounded-md"
                        />
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() =>
                            updateSlot.mutate({
                              slotId: slot.id,
                              notes,
                            })
                          }
                          disabled={updateSlot.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setEditingSlotId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}