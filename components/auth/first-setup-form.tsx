"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { firstSetupAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/ui/submit-button"
import type { Profile } from "@/lib/types"

export function FirstSetupForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await firstSetupAction(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        setSuccess(result.success)
      }
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenue — Configuration initiale</CardTitle>
          <CardDescription>
            Avant de continuer, veuillez personnaliser vos informations,
            définir une nouvelle adresse email et un mot de passe sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div
              id="first-setup-error"
              role="alert"
              aria-live="polite"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          {success ? (
            <p role="status" aria-live="polite" className="text-sm text-green-600 mb-4">
              {success}
            </p>
          ) : null}
          <form action={onSubmit} className="space-y-4" aria-describedby={error ? "first-setup-error" : undefined}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="setup-firstName" className="text-sm font-medium">
                  Prénom
                </label>
                <Input
                  id="setup-firstName"
                  name="firstName"
                  required
                  autoComplete="given-name"
                  autoCapitalize="words"
                  defaultValue={profile.first_name}
                />
              </div>
              <div>
                <label htmlFor="setup-lastName" className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  id="setup-lastName"
                  name="lastName"
                  required
                  autoComplete="family-name"
                  autoCapitalize="words"
                  defaultValue={profile.last_name}
                />
              </div>
            </div>
            <div>
              <label htmlFor="setup-email" className="text-sm font-medium">
                Adresse email
              </label>
              <Input
                id="setup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                defaultValue={profile.email}
                aria-describedby="setup-email-help"
              />
              <p id="setup-email-help" className="text-xs text-muted-foreground mt-1">
                Gardez votre adresse actuelle ou changez-la. Si vous la modifiez,
                un lien de vérification sera envoyé à la nouvelle adresse et
                l&apos;ancienne ne pourra plus être utilisée.
              </p>
            </div>
            <div>
              <label htmlFor="setup-newPassword" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="setup-newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <div>
              <label htmlFor="setup-confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <Input
                id="setup-confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <SubmitButton className="w-full" pending={pending} pendingText="Enregistrement…">
              Enregistrer et continuer
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
