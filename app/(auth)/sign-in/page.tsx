import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
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
              S'inscrire
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
