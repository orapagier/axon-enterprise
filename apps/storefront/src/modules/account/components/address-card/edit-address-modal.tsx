"use client"

import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import { hubSlugForCity } from "@lib/constants/hub-cities"
import useToggleState from "@lib/hooks/use-toggle-state"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import BarangayCombobox from "@modules/common/components/barangay-combobox"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { Button, Heading, clx } from "@modules/common/components/ui"
import Spinner from "@modules/common/icons/spinner"
import React, { useActionState, useEffect, useState } from "react"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const [city, setCity] = useState(address.city || "")
  const [barangay, setBarangay] = useState<string | null>(
    (address.metadata as { barangay?: string } | null)?.barangay ?? null
  )
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  return (
    <>
      <div
        className={clx(
          "group flex h-full min-h-[200px] w-full flex-col justify-between rounded-2xl border bg-white p-6 shadow-soft transition-all hover:shadow-medium",
          isActive ? "border-brand-green-300" : "border-grey-10"
        )}
        data-testid="address-container"
      >
        <div className="flex flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-50 text-brand-green-700 ring-1 ring-brand-green-100">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            {address.is_default_shipping && (
              <span className="inline-flex items-center gap-x-1 rounded-full border border-brand-green-100 bg-brand-green-50 px-2.5 py-1 text-caption font-semibold text-brand-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green-500" />
                Default
              </span>
            )}
          </div>

          <h3
            className="font-heading text-h3 text-grey-90"
            data-testid="address-name"
          >
            {address.first_name} {address.last_name}
          </h3>
          {address.company && (
            <p
              className="text-caption text-grey-50"
              data-testid="address-company"
            >
              {address.company}
            </p>
          )}
          <div className="mt-2 flex flex-col gap-y-0.5 text-body-sm leading-relaxed text-grey-60">
            <span data-testid="address-address">
              {address.address_1}
              {address.address_2 && <span>, {address.address_2}</span>}
            </span>
            {(address.metadata as { barangay?: string } | null)?.barangay && (
              <span data-testid="address-barangay">
                Brgy. {(address.metadata as { barangay: string }).barangay}
              </span>
            )}
            <span data-testid="address-postal-city">
              {[address.postal_code, address.city].filter(Boolean).join(", ")}
            </span>
            <span data-testid="address-province-country">
              {address.province && `${address.province}, `}
              {address.country_code?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-x-3 border-t border-grey-10 pt-4">
          <button
            className="inline-flex items-center gap-x-1.5 text-body-sm font-medium text-grey-60 transition-colors hover:text-brand-green-700"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <span className="h-4 w-px bg-grey-20" />
          <button
            className="inline-flex items-center gap-x-1.5 text-body-sm font-medium text-grey-60 transition-colors hover:text-rose-600"
            onClick={removeAddress}
            data-testid="address-delete-button"
          >
            {removing ? <Spinner /> : <Trash className="h-4 w-4" />}
            Remove
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Edit address</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <div className="flex flex-col gap-y-3">
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="First name"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  defaultValue={address.first_name || undefined}
                  data-testid="first-name-input"
                />
                <Input
                  label="Last name"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  defaultValue={address.last_name || undefined}
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Street address"
                name="address_1"
                required
                autoComplete="address-line1"
                defaultValue={address.address_1 || undefined}
                data-testid="address-1-input"
              />
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="City"
                  name="city"
                  required
                  autoComplete="locality"
                  value={city}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setCity(e.target.value)
                    setBarangay(null)
                  }}
                  data-testid="city-input"
                />
                <Input
                  label="Postal code"
                  name="postal_code"
                  autoComplete="postal-code"
                  defaultValue={address.postal_code || undefined}
                  data-testid="postal-code-input"
                />
              </div>
              <BarangayCombobox
                hubSlug={hubSlugForCity(city)}
                value={barangay}
                onChange={setBarangay}
                required
                data-testid="barangay-input"
              />
              <input type="hidden" name="barangay" value={barangay ?? ""} />
              <input type="hidden" name="country_code" value={address.country_code || "ph"} />
              <Input
                label="Phone"
                name="phone"
                autoComplete="phone"
                defaultValue={address.phone || undefined}
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div className="text-rose-500 text-small-regular py-2">
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <SubmitButton data-testid="save-button">Save</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditAddress
