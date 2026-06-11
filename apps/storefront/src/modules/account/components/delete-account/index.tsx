"use client"

import { deleteAccount, type DeleteAccountState } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { useParams, useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

type Props = {
  customer: HttpTypes.StoreCustomer
}

/**
 * Danger-zone account deletion. Two-step confirmation: open the panel, then
 * re-type the account email before the destructive action is enabled. Once
 * the backend confirms, the session is already gone — send the user home.
 */
const DeleteAccount = ({ customer }: Props) => {
  const params = useParams()
  const router = useRouter()
  const countryCode = (params?.countryCode as string) || "ph"

  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState("")

  const [state, formAction, pending] = useActionState<
    DeleteAccountState | null,
    FormData
  >(deleteAccount, null)

  useEffect(() => {
    if (state?.ok) {
      router.push(`/${countryCode}`)
      router.refresh()
    }
  }, [state, router, countryCode])

  const email = customer.email ?? ""
  const confirmed =
    confirm.trim().toLowerCase() === email.toLowerCase() && email.length > 0

  if (state?.ok) {
    return (
      <p className="text-body-sm text-grey-60">
        Your account has been deleted. Redirecting…
      </p>
    )
  }

  return (
    <div className="w-full">
      <p className="text-body-sm text-grey-60 leading-relaxed">
        Deleting your account removes your profile, sign-in access, rider
        registration, and any product listings. Past orders are kept for
        accounting but are no longer linked to you.{" "}
        <span className="font-semibold text-grey-90">
          This cannot be undone — there is no way to restore a deleted
          account.
        </span>
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-body-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
          data-testid="delete-account-open"
        >
          Delete my account
        </button>
      ) : (
        <form action={formAction} className="mt-4 flex flex-col gap-y-4">
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-caption text-red-700 leading-relaxed">
              To confirm permanent deletion, type your account email{" "}
              <span className="font-bold">{email}</span> below.
            </p>
          </div>

          <input
            type="text"
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            placeholder={email}
            className="w-full px-3.5 py-3 bg-grey-5 border border-grey-10 rounded-xl text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 focus:bg-white transition-all"
            data-testid="delete-account-confirm-input"
          />

          {state?.error && (
            <p className="text-caption text-red-700">{state.error}</p>
          )}

          <div className="flex items-center gap-x-3">
            <button
              type="submit"
              disabled={!confirmed || pending}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-body-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="delete-account-submit"
            >
              {pending ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setConfirm("")
              }}
              className="px-4 py-2.5 rounded-xl text-body-sm font-semibold text-grey-60 hover:text-grey-90 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default DeleteAccount
