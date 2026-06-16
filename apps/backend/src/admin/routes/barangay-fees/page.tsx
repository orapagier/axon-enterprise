// @ts-nocheck — React 19 / @medusajs/ui type drift; see hubs/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Map } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { SPECIAL_FEE_MULTIPLIER } from "../../../lib/delivery-tiers"

type Hub = {
  id: string
  name: string
  slug: string
  city: string
}

type Fee = {
  id: string
  hub_id: string
  barangay: string
  standard_fee_php: number
  special_fee_php: number
  active: boolean
}

const fetchHubs = async (): Promise<Hub[]> => {
  const res = await fetch("/admin/hubs", { credentials: "include" })
  if (!res.ok) throw new Error(`Failed to load hubs (${res.status})`)
  const body = (await res.json()) as { hubs: Hub[] }
  return body.hubs ?? []
}

const fetchFees = async (hubId: string): Promise<Fee[]> => {
  const res = await fetch(`/admin/hubs/${hubId}/barangay-fees`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed to load fees (${res.status})`)
  const body = (await res.json()) as { barangay_fees: Fee[] }
  return body.barangay_fees ?? []
}

const BarangayFeesPage = () => {
  const qc = useQueryClient()
  const [selectedHubId, setSelectedHubId] = useState<string>("")
  const [newRow, setNewRow] = useState({
    barangay: "",
    standard_fee_php: "",
  })
  const [bulkCsv, setBulkCsv] = useState("")
  const [showBulk, setShowBulk] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    standard_fee_php: "",
  })

  const hubsQuery = useQuery({ queryKey: ["admin-hubs"], queryFn: fetchHubs })
  const hubs = hubsQuery.data ?? []

  // auto-select first hub when loaded
  const effectiveHubId =
    selectedHubId || (hubs[0]?.id ?? "")

  const feesQuery = useQuery({
    queryKey: ["barangay-fees", effectiveHubId],
    queryFn: () => fetchFees(effectiveHubId),
    enabled: !!effectiveHubId,
  })
  const fees = feesQuery.data ?? []

  const upsert = useMutation({
    mutationFn: async (rows: Array<{
      barangay: string
      standard_fee_php: number
      special_fee_php: number
    }>) => {
      const res = await fetch(`/admin/hubs/${effectiveHubId}/barangay-fees`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows.length === 1 ? rows[0] : { rows }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["barangay-fees", effectiveHubId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateOne = useMutation({
    mutationFn: async (input: {
      id: string
      standard_fee_php?: number
      special_fee_php?: number
      active?: boolean
    }) => {
      const { id, ...patch } = input
      const res = await fetch(
        `/admin/hubs/${effectiveHubId}/barangay-fees/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["barangay-fees", effectiveHubId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `/admin/hubs/${effectiveHubId}/barangay-fees/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["barangay-fees", effectiveHubId] })
      toast.success("Barangay fee removed")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleAddRow = async () => {
    const barangay = newRow.barangay.trim()
    const std = parseInt(newRow.standard_fee_php, 10)
    const spc = parseInt(newRow.special_fee_php, 10)
    if (!barangay) {
      toast.error("Barangay name required")
      return
    }
    if (!Number.isFinite(std) || std < 0) {
      toast.error("Standard fee must be ≥ 0")
      return
    }
    if (!Number.isFinite(spc) || spc < 0) {
      toast.error("Special fee must be ≥ 0")
      return
    }
    try {
      await upsert.mutateAsync([
        { barangay, standard_fee_php: std, special_fee_php: spc },
      ])
      setNewRow({ barangay: "", standard_fee_php: "", special_fee_php: "" })
      toast.success(`Saved fees for ${barangay}`)
    } catch (e) {
      // toast already shown by onError
    }
  }

  const handleBulkImport = async () => {
    const lines = bulkCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"))
    const rows: Array<{
      barangay: string
      standard_fee_php: number
      special_fee_php: number
    }> = []
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim())
      if (parts.length !== 3) {
        toast.error(
          `Bad row "${line}" — expected: barangay,standard_fee,special_fee`
        )
        return
      }
      const std = parseInt(parts[1], 10)
      const spc = parseInt(parts[2], 10)
      if (!parts[0] || !Number.isFinite(std) || !Number.isFinite(spc)) {
        toast.error(`Bad row "${line}"`)
        return
      }
      rows.push({
        barangay: parts[0],
        standard_fee_php: std,
        special_fee_php: spc,
      })
    }
    if (rows.length === 0) {
      toast.error("No rows to import")
      return
    }
    try {
      const result = await upsert.mutateAsync(rows)
      toast.success(
        `Imported ${result.created} new, updated ${result.updated} existing`
      )
      setBulkCsv("")
      setShowBulk(false)
    } catch (e) {
      // toast shown by onError
    }
  }

  const startEdit = (fee: Fee) => {
    setEditingId(fee.id)
    setEditForm({
      standard_fee_php: String(fee.standard_fee_php),
      special_fee_php: String(fee.special_fee_php),
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const std = parseInt(editForm.standard_fee_php, 10)
    const spc = parseInt(editForm.special_fee_php, 10)
    if (!Number.isFinite(std) || std < 0 || !Number.isFinite(spc) || spc < 0) {
      toast.error("Fees must be ≥ 0")
      return
    }
    try {
      await updateOne.mutateAsync({
        id: editingId,
        standard_fee_php: std,
        special_fee_php: spc,
      })
      setEditingId(null)
      toast.success("Updated")
    } catch (e) {
      // toast shown by onError
    }
  }

  const selectedHub = hubs.find((h) => h.id === effectiveHubId)

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <Heading level="h1">Barangay delivery fees</Heading>
        <Text className="text-ui-fg-subtle">
          Per-barangay Standard and Special delivery fees for each hub. Free
          delivery is always ₱0 (before noon cutoff) and is not stored here.
          Buyer's checkout uses these to compute their three options.
        </Text>
      </div>

      <div className="px-6 py-4 flex items-center gap-x-3 border-b">
        <Label className="text-ui-fg-subtle">Hub:</Label>
        <Select
          value={effectiveHubId}
          onValueChange={(v) => setSelectedHubId(v)}
        >
          <Select.Trigger className="w-[280px]">
            <Select.Value placeholder="Select a hub" />
          </Select.Trigger>
          <Select.Content>
            {hubs.map((h) => (
              <Select.Item key={h.id} value={h.id}>
                {h.name} ({h.city})
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <div className="ml-auto flex gap-x-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowBulk((s) => !s)}
          >
            {showBulk ? "Cancel bulk import" : "Bulk paste (CSV)"}
          </Button>
        </div>
      </div>

      {showBulk && (
        <div className="px-6 py-4 border-b bg-ui-bg-subtle">
          <Label className="text-ui-fg-base">
            Paste CSV (one row per line): <code>barangay,standard,special</code>
          </Label>
          <Textarea
            className="mt-2"
            rows={8}
            placeholder={
              "Apokon,60,160\nMagugpo East,40,120\nSan Isidro,90,220"
            }
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
          />
          <div className="flex gap-x-2 mt-3">
            <Button
              size="small"
              onClick={handleBulkImport}
              isLoading={upsert.isPending}
            >
              Import
            </Button>
            <Text size="small" className="text-ui-fg-subtle self-center">
              Existing barangays will be updated; new ones will be added.
            </Text>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        {!effectiveHubId && (
          <Text className="text-ui-fg-subtle">Pick a hub to manage fees.</Text>
        )}
        {effectiveHubId && feesQuery.isLoading && <Text>Loading…</Text>}
        {effectiveHubId && feesQuery.error && (
          <Text className="text-rose-500">
            {(feesQuery.error as Error).message}
          </Text>
        )}
        {effectiveHubId && !feesQuery.isLoading && fees.length === 0 && (
          <Text className="text-ui-fg-subtle">
            No barangay fees set for {selectedHub?.name}. Add one below or use
            Bulk paste.
          </Text>
        )}

        {effectiveHubId && fees.length > 0 && (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Barangay</Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  Standard
                </Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  Special
                </Table.HeaderCell>
                <Table.HeaderCell className="text-center">
                  Active
                </Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {fees.map((fee) => {
                const isEditing = editingId === fee.id
                return (
                  <Table.Row key={fee.id}>
                    <Table.Cell>{fee.barangay}</Table.Cell>
                    <Table.Cell className="text-right tabular-nums">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-24 text-right"
                          value={editForm.standard_fee_php}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              standard_fee_php: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        `₱${fee.standard_fee_php}`
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-right tabular-nums">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-24 text-right"
                          value={editForm.special_fee_php}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              special_fee_php: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        `₱${fee.special_fee_php}`
                      )}
                    </Table.Cell>
                    <Table.Cell className="text-center">
                      <Switch
                        checked={fee.active}
                        onCheckedChange={(v) =>
                          updateOne.mutate({ id: fee.id, active: v })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      {isEditing ? (
                        <div className="flex gap-x-2 justify-end">
                          <Button
                            size="small"
                            onClick={saveEdit}
                            isLoading={updateOne.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-x-2 justify-end">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => startEdit(fee)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => {
                              if (confirm(`Remove ${fee.barangay}?`)) {
                                deleteOne.mutate(fee.id)
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}

        {/* Add new row */}
        {effectiveHubId && (
          <div className="mt-6 pt-4 border-t">
            <Heading level="h3" className="mb-3">
              Add barangay
            </Heading>
            <div className="grid grid-cols-[1fr_120px_120px_auto] gap-3 items-end">
              <div>
                <Label className="text-ui-fg-subtle text-xs">Barangay</Label>
                <Input
                  placeholder="e.g. Magugpo East"
                  value={newRow.barangay}
                  onChange={(e) =>
                    setNewRow((r) => ({ ...r, barangay: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-ui-fg-subtle text-xs">Standard ₱</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="60"
                  value={newRow.standard_fee_php}
                  onChange={(e) =>
                    setNewRow((r) => ({
                      ...r,
                      standard_fee_php: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-ui-fg-subtle text-xs">Special ₱</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="160"
                  value={newRow.special_fee_php}
                  onChange={(e) =>
                    setNewRow((r) => ({
                      ...r,
                      special_fee_php: e.target.value,
                    }))
                  }
                />
              </div>
              <Button onClick={handleAddRow} isLoading={upsert.isPending}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Barangay fees",
  icon: Map,
})

export default BarangayFeesPage
