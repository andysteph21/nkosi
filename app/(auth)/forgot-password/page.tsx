import Link from "next/link"
import { forgotPasswordAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>Recevez un lien de réinitialisation par email.</CardDescription>
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
          <form action={forgotPasswordAction} className="space-y-4">
            <div>
              <label htmlFor="fp-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="fp-email"
                type="email"
                name="email"
                placeholder="votre-email@exemple.com"
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <Button type="submit" className="w-full">
              Envoyer le lien
            </Button>
          </form>
          <Link href="/sign-in" className="text-sm underline text-center block">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
