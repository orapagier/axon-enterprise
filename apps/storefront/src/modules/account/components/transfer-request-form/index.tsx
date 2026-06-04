"use client"
import { createTransferRequest } from "@lib/data/orders"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { IconButton, Input } from "@modules/common/components/ui"
import { useActionState } from "react"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useEffect, useState } from "react"

export default function TransferRequestForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex w-full flex-col gap-y-4 rounded-2xl border border-grey-10 bg-white p-5 shadow-soft small:p-6">
      <div className="grid items-center gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-y-1">
          <h3 className="font-heading text-h3 text-grey-90">
            Transfer an order
          </h3>
          <p className="text-body-sm text-grey-50">
            Placed an order as a guest? Connect it to your account with its
            order ID.
          </p>
        </div>
        <form action={formAction} className="flex flex-col gap-y-2 sm:items-end">
          <Input className="w-full" name="order_id" placeholder="Order ID" />
          <SubmitButton
            variant="secondary"
            size="small"
            className="w-fit self-end whitespace-nowrap"
          >
            Request transfer
          </SubmitButton>
        </form>
      </div>

      {!state.success && state.error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-body-sm text-rose-600">
          {state.error}
        </p>
      )}

      {showSuccess && (
        <div className="flex items-center justify-between gap-x-3 rounded-xl border border-brand-green-100 bg-brand-green-50 p-4">
          <div className="flex items-center gap-x-3">
            <CheckCircleMiniSolid className="h-5 w-5 shrink-0 text-brand-green-600" />
            <div className="flex flex-col gap-y-0.5">
              <p className="text-body-sm font-semibold text-grey-90">
                Transfer requested for order {state.order?.id}
              </p>
              <p className="text-caption text-grey-50">
                A confirmation email was sent to {state.order?.email}.
              </p>
            </div>
          </div>
          <IconButton
            className="h-fit"
            onClick={() => setShowSuccess(false)}
          >
            <XCircleSolid className="h-4 w-4 text-grey-50" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
