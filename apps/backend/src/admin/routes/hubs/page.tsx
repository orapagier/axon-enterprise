// @ts-nocheck — React 19's forwardRef return type vs @medusajs/ui's bundled
// @types/react@18 definitions trigger a JSX-element mismatch on every Medusa
// UI component used here (Button, Table.Cell, etc.). Runtime is fine — the
// admin app is built by Vite, which doesn't run tsc — but tsc --noEmit flags
// the file. Same situation as src/admin/routes/sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MapPin } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

type HubArea = {
  id: string
  name: string
  postal_codes: string[] | null
  barangays: string[] | null
  pickup_day_of_week: number[] | null
}

type Hub = {
  id: string
  name: string
  slug: string
  city: string
  province: string
  country: string
  active: boolean
  timezone: string
  dispatch_cutoff: string
  dispatch_time: string
  delivery_open: string
  delivery_close: string
  areas: HubArea[]
}

type HubFormState = {
  name: string
  slug: string
  city: string
  province: string
  country: string
  timezone: string
  dispatch_cutoff: string
  dispatch_time: string
  delivery_open: string
  delivery_close: string
  active: boolean
}

type AreaFormState = {
  name: string
  postal_codes: string
  barangays: string
  pickup_day_of_week: string
}

const EMPTY_HUB_FORM: HubFormState = {
  name: "",
  slug: "",
  city: "",
  province: "",
  country: "ph",
  timezone: "Asia/Manila",
  dispatch_cutoff: "12:00",
  dispatch_time: "16:00",
  delivery_open: "06:00",
  delivery_close: "18:00",
  active: true,
}

const EMPTY_AREA_FORM: AreaFormState = {
  name: "",
  postal_codes: "",
  barangays: "",
  pickup_day_of_week: "",
}

const fetchHubs = async (): Promise<Hub[]> => {
  const res = await fetch("/admin/hubs", { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load (${res.status})`)
  const body = (await res.json()) as { hubs: Hub[] }
  return body.hubs ?? []
}

const splitList = (raw: string): string[] =>
  raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

const splitInts = (raw: string): number[] =>
  raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)

const HubsPage = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["hubs"],
    queryFn: fetchHubs,
    refetchOnWindowFocus: false,
  })

  const [hubDrawerOpen, setHubDrawerOpen] = useState(false)
  const [editingHub, setEditingHub] = useState<Hub | null>(null)
  const [hubForm, setHubForm] = useState<HubFormState>(EMPTY_HUB_FORM)

  const [areaPanelHubId, setAreaPanelHubId] = useState<string | null>(null)
  const [areaForm, setAreaForm] = useState<AreaFormState>(EMPTY_AREA_FORM)

  useEffect(() => {
    if (editingHub) {
      setHubForm({
        name: editingHub.name,
        slug: editingHub.slug,
        city: editingHub.city,
        province: editingHub.province,
        country: editingHub.country,
        timezone: editingHub.timezone,
        dispatch_cutoff: editingHub.dispatch_cutoff,
        dispatch_time: editingHub.dispatch_time,
        active: editingHub.active,
      })
    } else {
      setHubForm(EMPTY_HUB_FORM)
    }
  }, [editingHub])

  const saveHub = useMutation({
    mutationFn: async (form: HubFormState) => {
      const url = editingHub ? `/admin/hubs/${editingHub.id}` : "/admin/hubs"
      const method = editingHub ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(editingHub ? "Hub updated." : "Hub created.")
      setHubDrawerOpen(false)
      setEditingHub(null)
      queryClient.invalidateQueries({ queryKey: ["hubs"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/admin/hubs/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hubs"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const createArea = useMutation({
    mutationFn: async ({
      hubId,
      form,
    }: {
      hubId: string
      form: AreaFormState
    }) => {
      const res = await fetch(`/admin/hubs/${hubId}/areas`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          postal_codes: splitList(form.postal_codes),
          barangays: splitList(form.barangays),
          pickup_day_of_week: form.pickup_day_of_week
            ? splitInts(form.pickup_day_of_week)
            : null,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Area added.")
      setAreaForm(EMPTY_AREA_FORM)
      queryClient.invalidateQueries({ queryKey: ["hubs"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteArea = useMutation({
    mutationFn: async ({ hubId, areaId }: { hubId: string; areaId: string }) => {
      const res = await fetch(`/admin/hubs/${hubId}/areas/${areaId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    },
    onSuccess: () => {
      toast.success("Area removed.")
      queryClient.invalidateQueries({ queryKey: ["hubs"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const hubs = data ?? []

  return (
    <Container className="p-0">
      <div className="px-6 py-5 border-b flex items-center justify-between">
        <div>
          <Heading level="h1">Hubs</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            FreshHub geography. Every product and consumer belongs to one hub.
          </Text>
        </div>
        <Button
          size="small"
          variant="primary"
          onClick={() => {
            setEditingHub(null)
            setHubDrawerOpen(true)
          }}
        >
          Create hub
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : isError ? (
          <Text className="text-ui-fg-error">
            Couldn&apos;t load: {(error as Error)?.message ?? "unknown error"}
          </Text>
        ) : hubs.length === 0 ? (
          <div className="py-12 text-center">
            <Text className="text-ui-fg-subtle">No hubs yet. Create one to begin.</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>City</Table.HeaderCell>
                <Table.HeaderCell>Areas</Table.HeaderCell>
                <Table.HeaderCell>Cutoff</Table.HeaderCell>
                <Table.HeaderCell>Dispatch</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {hubs.map((hub) => {
                const expanded = areaPanelHubId === hub.id
                return (
                  <>
                    <Table.Row key={hub.id}>
                      <Table.Cell>
                        <code className="text-xs">{hub.slug}</code>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="font-medium">{hub.name}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-xs">
                          {hub.city}, {hub.province}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge>{hub.areas?.length ?? 0}</Badge>
                      </Table.Cell>
                      <Table.Cell>{hub.dispatch_cutoff}</Table.Cell>
                      <Table.Cell>{hub.dispatch_time}</Table.Cell>
                      <Table.Cell>
                        <Switch
                          checked={hub.active}
                          onCheckedChange={(active) =>
                            toggleActive.mutate({ id: hub.id, active })
                          }
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-x-2 justify-end">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() =>
                              setAreaPanelHubId(expanded ? null : hub.id)
                            }
                          >
                            {expanded ? "Hide areas" : "Areas"}
                          </Button>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setEditingHub(hub)
                              setHubDrawerOpen(true)
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                    {expanded && (
                      <Table.Row key={`${hub.id}-areas`}>
                        <Table.Cell colSpan={8}>
                          <div className="bg-ui-bg-subtle p-4 rounded-md">
                            <div className="flex flex-col gap-y-3 mb-4">
                              {(hub.areas ?? []).length === 0 ? (
                                <Text className="text-ui-fg-subtle text-xs">
                                  No areas yet.
                                </Text>
                              ) : (
                                (hub.areas ?? []).map((area) => (
                                  <div
                                    key={area.id}
                                    className="flex items-start justify-between gap-x-4 border-b border-ui-border-base pb-2"
                                  >
                                    <div className="flex flex-col gap-y-1">
                                      <span className="font-medium text-sm">
                                        {area.name}
                                      </span>
                                      <span className="text-xs text-ui-fg-subtle">
                                        Postal:{" "}
                                        {(area.postal_codes ?? []).join(", ") ||
                                          "—"}
                                      </span>
                                      <span className="text-xs text-ui-fg-subtle">
                                        Barangays:{" "}
                                        {(area.barangays ?? []).join(", ") ||
                                          "—"}
                                      </span>
                                      <span className="text-xs text-ui-fg-subtle">
                                        Pickup days:{" "}
                                        {(area.pickup_day_of_week ?? [])
                                          .join(", ") || "—"}
                                      </span>
                                    </div>
                                    <Button
                                      size="small"
                                      variant="danger"
                                      onClick={() =>
                                        deleteArea.mutate({
                                          hubId: hub.id,
                                          areaId: area.id,
                                        })
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                              <div>
                                <Label>Area name</Label>
                                <Input
                                  value={areaForm.name}
                                  onChange={(e) =>
                                    setAreaForm({
                                      ...areaForm,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Pickup days (0=Sun..6=Sat)</Label>
                                <Input
                                  placeholder="e.g. 1,4"
                                  value={areaForm.pickup_day_of_week}
                                  onChange={(e) =>
                                    setAreaForm({
                                      ...areaForm,
                                      pickup_day_of_week: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Postal codes (comma)</Label>
                                <Input
                                  placeholder="8100, 8101"
                                  value={areaForm.postal_codes}
                                  onChange={(e) =>
                                    setAreaForm({
                                      ...areaForm,
                                      postal_codes: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Barangays (comma)</Label>
                                <Textarea
                                  placeholder="Apokon, Magugpo East"
                                  value={areaForm.barangays}
                                  onChange={(e) =>
                                    setAreaForm({
                                      ...areaForm,
                                      barangays: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex justify-end mt-3">
                              <Button
                                size="small"
                                variant="primary"
                                isLoading={createArea.isPending}
                                disabled={!areaForm.name.trim()}
                                onClick={() =>
                                  createArea.mutate({
                                    hubId: hub.id,
                                    form: areaForm,
                                  })
                                }
                              >
                                Add area
                              </Button>
                            </div>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </div>

      <Drawer open={hubDrawerOpen} onOpenChange={setHubDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingHub ? `Edit ${editingHub.name}` : "Create hub"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={hubForm.name}
                onChange={(e) =>
                  setHubForm({ ...hubForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Slug (lowercase, no spaces)</Label>
              <Input
                value={hubForm.slug}
                onChange={(e) =>
                  setHubForm({ ...hubForm, slug: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={hubForm.city}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, city: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Province</Label>
                <Input
                  value={hubForm.province}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, province: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Country</Label>
                <Input
                  value={hubForm.country}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, country: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  value={hubForm.timezone}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, timezone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Order cutoff (HH:mm)</Label>
                <Input
                  value={hubForm.dispatch_cutoff}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, dispatch_cutoff: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Dispatch time (HH:mm)</Label>
                <Input
                  value={hubForm.dispatch_time}
                  onChange={(e) =>
                    setHubForm({ ...hubForm, dispatch_time: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <Switch
                checked={hubForm.active}
                onCheckedChange={(active) =>
                  setHubForm({ ...hubForm, active })
                }
              />
              <Label>Active</Label>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setHubDrawerOpen(false)
                setEditingHub(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={saveHub.isPending}
              disabled={
                !hubForm.name.trim() ||
                !hubForm.slug.trim() ||
                !hubForm.city.trim() ||
                !hubForm.province.trim()
              }
              onClick={() => saveHub.mutate(hubForm)}
            >
              {editingHub ? "Save" : "Create"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Hubs",
  icon: MapPin,
})

export default HubsPage
