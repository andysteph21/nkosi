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
          <CardTitle>Mot de passe oublie</CardTitle>
          <CardDescription>Recevez un lien de reinitialisation par email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
          <form action={forgotPasswordAction} className="space-y-4">
            <Input type="email" name="email" placeholder="Email" required autoComplete="email" />
            <Button type="submit" className="w-full">
              Envoyer le lien
            </Button>
          </form>
          <Link href="/sign-in" className="text-sm underline text-center block">
            Retour a la connexion
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
