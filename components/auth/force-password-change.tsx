"use client"

import { useState, useTransition } from "react"
import { markInitialPasswordChangedAction } from "@/app/actions/auth"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ForcePasswordChangeOverlay({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  if (!enabled || isDone) return null

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await markInitialPasswordChangedAction(formData)
      if (result?.error) {
        setMessage(result.error)
        return
      }
      setIsDone(true)
      window.location.reload()
    })
  }

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Changement de mot de passe obligatoire</DialogTitle>
          <DialogDescription>
            Pour des raisons de securite, vous devez remplacer le mot de passe initial.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <Input name="newPassword" type="password" required minLength={8} />
          </div>
          <div>
            <label className="text-sm font-medium">Confirmer le mot de passe</label>
            <Input name="confirmPassword" type="password" required minLength={8} />
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Mise a jour..." : "Mettre a jour"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
