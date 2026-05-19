import { Disclosure } from "@headlessui/react"
import { clx } from "@modules/common/components/ui"
import { useEffect } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import { useFormStatus } from "react-dom"

type AccountInfoProps = {
  label: string
  currentInfo: string | React.ReactNode
  isSuccess?: boolean
  isError?: boolean
  errorMessage?: string
  clearState: () => void
  children?: React.ReactNode
  "data-testid"?: string
}

const AccountInfo = ({
  label,
  currentInfo,
  isSuccess,
  isError,
  clearState,
  errorMessage = "Something went wrong. Please try again.",
  children,
  "data-testid": dataTestid,
}: AccountInfoProps) => {
  const { state, close, toggle } = useToggleState()

  const handleToggle = () => {
    clearState()
    setTimeout(() => toggle(), 100)
  }

  useEffect(() => {
    if (isSuccess) {
      close()
    }
  }, [isSuccess, close])

  return (
    <div data-testid={dataTestid}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <span className="text-caption font-semibold text-grey-50 uppercase tracking-wider">
            {label}
          </span>
          <div
            className="text-body-sm text-grey-90 font-medium mt-1 break-words"
            data-testid="current-info"
          >
            {currentInfo || (
              <span className="text-grey-40 font-normal italic">Not set</span>
            )}
          </div>
        </div>
        <button
          type={state ? "reset" : "button"}
          onClick={handleToggle}
          data-testid="edit-button"
          data-active={state}
          className={clx(
            "shrink-0 px-3.5 py-1.5 rounded-lg border text-caption font-semibold transition-all duration-150",
            {
              "border-grey-20 bg-white text-grey-70 hover:border-brand-green-300 hover:text-brand-green-700 hover:bg-brand-green-50":
                !state,
              "border-grey-20 bg-grey-5 text-grey-60 hover:bg-grey-10": state,
            }
          )}
        >
          {state ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Success */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clx(
            "transition-[max-height,opacity,margin] duration-300 ease-in-out overflow-hidden",
            {
              "max-h-[200px] opacity-100 mt-3": isSuccess,
              "max-h-0 opacity-0 mt-0": !isSuccess,
            }
          )}
          data-testid="success-message"
        >
          <div className="flex items-center gap-x-2 px-3 py-2 rounded-lg bg-brand-green-50 border border-brand-green-100 text-caption text-brand-green-800">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              <span className="font-semibold">{label}</span> updated successfully.
            </span>
          </div>
        </Disclosure.Panel>
      </Disclosure>

      {/* Error */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clx(
            "transition-[max-height,opacity,margin] duration-300 ease-in-out overflow-hidden",
            {
              "max-h-[200px] opacity-100 mt-3": isError,
              "max-h-0 opacity-0 mt-0": !isError,
            }
          )}
          data-testid="error-message"
        >
          <div className="flex items-center gap-x-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-caption text-red-700">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        </Disclosure.Panel>
      </Disclosure>

      {/* Edit panel */}
      <Disclosure>
        <Disclosure.Panel
          static
          className={clx(
            "transition-[max-height,opacity,margin] duration-300 ease-in-out overflow-visible",
            {
              "max-h-[1200px] opacity-100 mt-5": state,
              "max-h-0 opacity-0 mt-0": !state,
            }
          )}
        >
          <div className="p-5 rounded-xl bg-grey-5 border border-grey-10">
            <div className="flex flex-col gap-y-4">
              <div>{children}</div>
              <div className="flex items-center justify-end gap-x-2 pt-2 border-t border-grey-10">
                <SaveButton />
              </div>
            </div>
          </div>
        </Disclosure.Panel>
      </Disclosure>
    </div>
  )
}

const SaveButton = () => {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="save-button"
      className="inline-flex items-center gap-x-1.5 px-4 py-2 rounded-lg bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold shadow-soft hover:shadow-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-ring"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Saving…
        </>
      ) : (
        "Save changes"
      )}
    </button>
  )
}

export default AccountInfo
