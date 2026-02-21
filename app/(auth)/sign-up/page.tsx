import Link from "next/link"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; role?: "client" | "restaurateur"; redirect?: string; auto_like?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inscription</CardTitle>
          <CardDescription>Creez votre compte client ou restaurateur.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
          <SignUpForm defaultRole={params.role ?? "client"} redirect={params.redirect} autoLike={params.auto_like} />
          <p className="text-sm text-muted-foreground text-center">
            Deja inscrit ?{" "}
            <Link href="/sign-in" className="underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
