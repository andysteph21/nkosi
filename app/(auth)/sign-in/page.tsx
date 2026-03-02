import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { resendConfirmationAction } from "@/app/actions/auth"
import { MailCheck } from "lucide-react"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; unconfirmed?: string }>
}) {
  const params = await searchParams

  if (params.unconfirmed) {
    const email = decodeURIComponent(params.unconfirmed)
    return (
      <div className="min-h-screen grid place-items-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <MailCheck className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Email non confirme</CardTitle>
            <CardDescription>
              Confirmez votre adresse <strong>{email}</strong> avant de vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error ? <p className="text-sm text-destructive text-center">{params.error}</p> : null}
            {params.success ? <p className="text-sm text-green-600 text-center">{params.success}</p> : null}
            <p className="text-sm text-muted-foreground text-center">
              Un email de confirmation vous a ete envoye lors de votre inscription. Verifiez votre boite de reception (et les spams).
            </p>
            <form action={resendConfirmationAction}>
              <input type="hidden" name="email" value={email} />
              <Button type="submit" className="w-full">
                Renvoyer l&apos;email de confirmation
              </Button>
            </form>
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:underline block text-center"
            >
              Retour a la connexion
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Connectez-vous a votre compte NKOSI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
          <LoginForm />
          <p className="text-sm text-muted-foreground text-center">
            Pas encore de compte ?{" "}
            <Link href="/sign-up" className="underline">
              S&apos;inscrire
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
