import { resetPasswordAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/ui/submit-button"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Définissez un nouveau mot de passe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {params.error}
            </div>
          ) : null}
          {params.success ? (
            <p role="status" aria-live="polite" className="text-sm text-green-600">
              {params.success}
            </p>
          ) : null}
          <form action={resetPasswordAction} className="space-y-4">
            <div>
              <label htmlFor="rp-password" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="rp-password"
                type="password"
                name="password"
                placeholder="Nouveau mot de passe"
                required
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <div>
              <label htmlFor="rp-confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <Input
                id="rp-confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirmer le mot de passe"
                required
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <SubmitButton className="w-full" pendingText="Enregistrement…">
              Mettre à jour
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
