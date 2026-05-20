"use client"

import * as React from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Submit button with a built-in loading state.
 *
 * Two ways to drive the loading state:
 *
 *   1. Inside a `<form action={serverAction}>` — omit the `pending` prop and
 *      the button reads `useFormStatus()` automatically.
 *   2. Inside a client form with its own state (onSubmit handler) — pass
 *      `pending={saving}` explicitly.
 *
 * While loading, the button is disabled (prevents double submits), shows a
 * spinner, and swaps its label for `pendingText` when provided.
 */
export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  pendingText?: string
  pending?: boolean
}) {
  // useFormStatus must be called unconditionally; its value is only used when
  // the caller did not pass an explicit `pending` prop.
  const status = useFormStatus()
  const pending = pendingProp ?? status.pending

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
