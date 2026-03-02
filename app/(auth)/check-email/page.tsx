import Link from "next/link"
import { Mail } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { resendConfirmationAction } from "@/app/actions/auth"

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string }>
}) {
  const params = await searchParams
  const email = params.email ?? ""

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vérifiez votre boîte mail</CardTitle>
          <CardDescription className="text-base">
            Un email de confirmation a été envoyé
            {email ? (
              <>
                {" "}à <span className="font-medium text-foreground">{email}</span>
              </>
            ) : null}
            . Cliquez sur le lien dans l&apos;email pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.resent ? (
            <p className="text-sm text-green-600">Email de confirmation renvoyé.</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas reçu l&apos;email ? Vérifiez votre dossier spam ou renvoyez un email de confirmation.
          </p>
          {email ? (
            <form action={resendConfirmationAction}>
              <input type="hidden" name="email" value={email} />
              <Button variant="outline" type="submit" className="w-full">
                Renvoyer l&apos;email de confirmation
              </Button>
            </form>
          ) : null}
          <p className="text-sm text-muted-foreground">
            <Link href="/sign-in" className="underline">
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
