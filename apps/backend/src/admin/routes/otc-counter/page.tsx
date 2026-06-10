// @ts-nocheck — React 19 / @medusajs/ui type drift; see cod-reconcile/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingCart } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Table,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

/**
 * OTC Counter — the hub's walk-in sales register.
 *
 * OTC is in-person only: a cashier rings up a customer here, takes cash, and
 * records the sale. Submitting creates a real, paid, dispatch-skipped order
 * (POST /admin/otc-counter) so the sale gets a receipt + automatic stock
 * decrement, plus an `otc_collected` ledger row separate from rider COD.
 */

type CartLine = {
  variant_id: string
  title: string
  unit_amount: number // major units (PHP), informational; server is authoritative
  quantity: number
}

type CustomerHit = { id: string; label: string }

const peso = (centavos: number) => `₱${(centavos / 100).toFixed(2)}`
const pesoMajor = (amount: number) => `₱${(amount ?? 0).toFixed(2)}`

const useRegionId = () =>
  useQuery({
    queryKey: ["otc-counter", "ph-region"],
    queryFn: async () => {
      const res = await fetch(
        "/admin/regions?fields=id,currency_code&limit=100",
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(`Regions failed (${res.status})`)
      const { regions } = await res.json()
      const ph = regions?.find(
        (r: { currency_code?: string }) =>
          r.currency_code?.toLowerCase() === "php"
      )
      return ph?.id as string | undefined
    },
  })

const OtcCounterPage = () => {
  const queryClient = useQueryClient()
  const { data: regionId } = useRegionId()

  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerHit | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Product search (debounced via query key; enabled at 2+ chars).
  const products = useQuery({
    queryKey: ["otc-counter", "products", search, regionId],
    enabled: !!regionId && search.trim().length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: search.trim(),
        limit: "8",
        region_id: regionId!,
        fields: "id,title,variants.id,variants.title,variants.calculated_price.*",
      })
      const res = await fetch(`/admin/products?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Product search failed (${res.status})`)
      const { products } = await res.json()
      return products as {
        id: string
        title: string
        variants: {
          id: string
          title: string
          calculated_price?: { calculated_amount?: number }
        }[]
      }[]
    },
  })

  // Customer search (optional — attach a known/locked buyer, else anonymous).
  const customers = useQuery({
    queryKey: ["otc-counter", "customers", customerSearch],
    enabled: customerSearch.trim().length >= 2 && !customer,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: customerSearch.trim(),
        limit: "6",
        fields: "id,email,first_name,last_name",
      })
      const res = await fetch(`/admin/customers?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Customer search failed (${res.status})`)
      const { customers } = await res.json()
      return (customers ?? []).map(
        (c: {
          id: string
          email?: string
          first_name?: string
          last_name?: string
        }) => ({
          id: c.id,
          label:
            [c.first_name, c.last_name].filter(Boolean).join(" ") ||
            c.email ||
            c.id,
        })
      ) as CustomerHit[]
    },
  })

  const today = useQuery({
    queryKey: ["otc-counter", "today"],
    queryFn: async () => {
      const res = await fetch("/admin/otc-counter", { credentials: "include" })
      if (!res.ok) throw new Error(`Today failed (${res.status})`)
      return (await res.json()) as {
        count: number
        total_centavos: number
        transactions: {
          id: string
          order_id: string | null
          amount: number
          reference: string | null
          created_at: string
        }[]
      }
    },
  })

  const addVariant = (
    variant: { id: string; title: string; calculated_price?: { calculated_amount?: number } },
    productTitle: string
  ) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.variant_id === variant.id)
      if (existing) {
        return prev.map((l) =>
          l.variant_id === variant.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [
        ...prev,
        {
          variant_id: variant.id,
          title: `${productTitle} — ${variant.title}`,
          unit_amount: variant.calculated_price?.calculated_amount ?? 0,
          quantity: 1,
        },
      ]
    })
  }

  const setQty = (variantId: string, qty: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.variant_id === variantId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0)
    )

  const removeLine = (variantId: string) =>
    setCart((prev) => prev.filter((l) => l.variant_id !== variantId))

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.unit_amount * l.quantity, 0),
    [cart]
  )

  const recordSale = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/admin/otc-counter", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer?.id,
          items: cart.map((l) => ({
            variant_id: l.variant_id,
            quantity: l.quantity,
          })),
          payment_reference: reference || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? `Sale failed (${res.status})`)
        return
      }
      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success(`Sale recorded — ${peso(data.order.amount_centavos)}`)
      }
      setCart([])
      setCustomer(null)
      setCustomerSearch("")
      setReference("")
      setNotes("")
      queryClient.invalidateQueries({ queryKey: ["otc-counter", "today"] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <Heading level="h1">OTC Counter</Heading>
        <Text className="text-ui-fg-subtle">
          Walk-in (Over the Counter) sales. Creates a paid, in-person order — no
          rider, no delivery. Cash is recorded separately from rider COD.
        </Text>
      </div>

      <div className="grid grid-cols-1 large:grid-cols-2 gap-6 p-6">
        {/* LEFT: build the sale */}
        <div className="flex flex-col gap-4">
          <div>
            <Text className="font-medium mb-1">Add products</Text>
            <Input
              placeholder="Search products (2+ characters)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {products.isLoading && (
              <Text className="text-ui-fg-subtle text-sm mt-2">Searching…</Text>
            )}
            {products.data && products.data.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y max-h-64 overflow-auto">
                {products.data.map((p) => (
                  <div key={p.id} className="p-2">
                    <Text className="text-sm font-medium">{p.title}</Text>
                    <div className="flex flex-col gap-1 mt-1">
                      {(p.variants ?? []).map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <Text className="text-sm text-ui-fg-subtle">
                            {v.title} ·{" "}
                            {pesoMajor(v.calculated_price?.calculated_amount)}
                          </Text>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => addVariant(v, p.title)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Text className="font-medium mb-1">Cart</Text>
            {cart.length === 0 ? (
              <Text className="text-ui-fg-subtle text-sm">No items yet.</Text>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Item</Table.HeaderCell>
                    <Table.HeaderCell>Qty</Table.HeaderCell>
                    <Table.HeaderCell>Line</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {cart.map((l) => (
                    <Table.Row key={l.variant_id}>
                      <Table.Cell>{l.title}</Table.Cell>
                      <Table.Cell>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          className="w-16"
                          onChange={(e) =>
                            setQty(l.variant_id, parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </Table.Cell>
                      <Table.Cell>
                        {pesoMajor(l.unit_amount * l.quantity)}
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() => removeLine(l.variant_id)}
                        >
                          Remove
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
            <div className="flex justify-between items-center mt-3">
              <Text className="font-medium">Total</Text>
              <Text className="text-xl font-semibold">{pesoMajor(total)}</Text>
            </div>
          </div>

          <div>
            <Text className="font-medium mb-1">Customer (optional)</Text>
            {customer ? (
              <div className="flex items-center justify-between border rounded-lg p-2">
                <Text className="text-sm">{customer.label}</Text>
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => setCustomer(null)}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search customer by name or email…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customers.data && customers.data.length > 0 && (
                  <div className="mt-2 border rounded-lg divide-y max-h-40 overflow-auto">
                    {customers.data.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left p-2 hover:bg-ui-bg-subtle"
                        onClick={() => setCustomer(c)}
                      >
                        <Text className="text-sm">{c.label}</Text>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Text className="font-medium mb-1">Payment reference</Text>
              <Input
                placeholder="OR # / note"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div>
              <Text className="font-medium mb-1">Notes</Text>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button
            size="large"
            onClick={recordSale}
            isLoading={submitting}
            disabled={cart.length === 0}
          >
            Record sale — {pesoMajor(total)}
          </Button>
        </div>

        {/* RIGHT: today's drawer */}
        <div>
          <div className="rounded-lg border p-4 mb-4">
            <Text className="text-ui-fg-subtle text-sm">
              Today's counter cash ({today.data?.count ?? 0} sales)
            </Text>
            <div className="text-2xl font-semibold">
              {peso(today.data?.total_centavos ?? 0)}
            </div>
          </div>
          <Heading level="h2" className="mb-2">
            Today's sales
          </Heading>
          {today.isLoading ? (
            <Text>Loading…</Text>
          ) : !today.data || today.data.transactions.length === 0 ? (
            <Text className="text-ui-fg-subtle text-sm">
              No counter sales yet today.
            </Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Reference</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>When</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {today.data.transactions.map((t) => (
                  <Table.Row key={t.id}>
                    <Table.Cell>{t.order_id ?? "—"}</Table.Cell>
                    <Table.Cell>{t.reference ?? "—"}</Table.Cell>
                    <Table.Cell>{peso(t.amount)}</Table.Cell>
                    <Table.Cell>
                      {new Date(t.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "OTC Counter",
  icon: ShoppingCart,
})

export default OtcCounterPage
