// @ts-nocheck — React 19 / @medusajs/ui type drift; see sellers/page.tsx.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type WalletStatus = "none" | "pending_verification" | "verified"

type Wallet = {
  id: string
  customer_id: string
  status: WalletStatus
  deposit_balance: number
  payment_reference: string | null
  verified_at: string | null
  created_at: string
  customer: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

const STATUS_TONE: Record<WalletStatus, "grey" | "orange" | "green"> = {
  none: "grey",
  pending_verification: "orange",
  verified: "green",
}

const fetchDeposits = async (status: WalletStatus): Promise<Wallet[]> => {
  const res = await fetch(`/admin/deposits?status=${status}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`Failed (${res.status})`)
  const body = (await res.json()) as { deposits: Wallet[] }
  return body.deposits ?? []
}

const DepositsPage = () => {
  const [status, setStatus] = useState<WalletStatus>("pending_verification")
  const qc = useQueryClient()

  const depositsQuery = useQuery({
    queryKey: ["deposits", status],
    queryFn: () => fetchDeposits(status),
  })

  const verify = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/deposits/${id}/verify`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Failed (${res.status})`)
      }
    },
    onSuccess: () => {
      toast.success("Deposit verified")
      qc.invalidateQueries({ queryKey: ["deposits"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deposits = depositsQuery.data ?? []

  return (
    <Container className="p-0">
      <Toaster />
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">Buyer Deposits</Heading>
            <Text className="text-ui-fg-subtle">
              ₱100 refundable COD deposit. Verify after GCash reference checks
              out.
            </Text>
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as WalletStatus)}>
            <Select.Trigger className="w-[220px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="pending_verification">
                Pending verification
              </Select.Item>
              <Select.Item value="verified">Verified</Select.Item>
              <Select.Item value="none">None</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="px-6 py-4">
        {depositsQuery.isLoading ? (
          <Text>Loading…</Text>
        ) : deposits.length === 0 ? (
          <Text className="text-ui-fg-subtle">No deposits in this state.</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>GCash Ref</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Balance</Table.HeaderCell>
                <Table.HeaderCell>Action</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {deposits.map((d) => (
                <Table.Row key={d.id}>
                  <Table.Cell>
                    {d.customer
                      ? `${d.customer.first_name ?? ""} ${d.customer.last_name ?? ""}`.trim() ||
                        d.customer_id
                      : d.customer_id}
                  </Table.Cell>
                  <Table.Cell>{d.customer?.email ?? "—"}</Table.Cell>
                  <Table.Cell>
                    <code className="text-xs">{d.payment_reference ?? "—"}</code>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={STATUS_TONE[d.status]}>{d.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    ₱{(d.deposit_balance / 100).toFixed(2)}
                  </Table.Cell>
                  <Table.Cell>
                    {d.status === "pending_verification" ? (
                      <Button
                        size="small"
                        onClick={() => verify.mutate(d.id)}
                        disabled={verify.isPending}
                      >
                        Verify
                      </Button>
                    ) : (
                      <Text className="text-ui-fg-subtle">—</Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Deposits",
  icon: CurrencyDollar,
})

export default DepositsPage
