"use client"

import { Plus } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
import { useActionState, useEffect, useState } from "react"

import { hubSlugForCity } from "@lib/constants/hub-cities"
import { addCustomerAddress } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import BarangayCombobox from "@modules/common/components/barangay-combobox"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"

const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const [successState, setSuccessState] = useState(false)
  const [city, setCity] = useState("")
  const [barangay, setBarangay] = useState<string | null>(null)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
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

  return (
    <>
      <button
        className="group flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-y-3 rounded-2xl border-2 border-dashed border-grey-20 bg-white p-6 text-center transition-all hover:border-brand-green-300 hover:bg-brand-green-50/40"
        onClick={open}
        data-testid="add-address-button"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-50 text-brand-green-600 ring-1 ring-brand-green-100 transition-transform group-hover:scale-105">
          <Plus />
        </span>
        <span className="flex flex-col gap-y-0.5">
          <span className="font-heading text-h3 text-grey-90">New address</span>
          <span className="text-caption text-grey-50">
            Add a delivery location
          </span>
        </span>
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2 font-heading text-h3 text-grey-90">
            Add address
          </Heading>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <div className="flex flex-col gap-y-3">
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="First name"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  data-testid="first-name-input"
                />
                <Input
                  label="Last name"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Street address"
                name="address_1"
                required
                autoComplete="address-line1"
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
              <input type="hidden" name="country_code" value="ph" />
              <Input
                label="Phone"
                name="phone"
                autoComplete="phone"
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
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

export default AddAddress
