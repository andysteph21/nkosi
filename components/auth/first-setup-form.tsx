"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { firstSetupAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
            <p className="text-sm text-destructive mb-4">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-600 mb-4">{success}</p>
          ) : null}
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <Input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  defaultValue={profile.first_name}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nom</label>
                <Input
                  name="lastName"
                  required
                  autoComplete="family-name"
                  defaultValue={profile.last_name}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Nouvelle adresse email</label>
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="votre-email@exemple.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Un lien de vérification sera envoyé à la nouvelle adresse.
                L&apos;adresse actuelle ({profile.email}) ne pourra plus être utilisée.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <Input
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirmer le mot de passe</label>
              <Input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer et continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
