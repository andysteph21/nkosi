import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { firstSetupAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default async function FirstSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/sign-in")

  const { data: profile } = await supabase
    .from("profile")
    .select("first_name,last_name,email,must_change_password")
    .eq("user_id", user.id)
    .single()

  if (!profile?.must_change_password) redirect("/")

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bienvenue — Configuration initiale</CardTitle>
          <CardDescription>
            Avant de continuer, veuillez personnaliser vos informations et définir un mot de passe sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <p className="text-sm text-destructive mb-4">{params.error}</p>
          ) : null}
          <form action={firstSetupAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <Input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  defaultValue={profile?.first_name ?? ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nom</label>
                <Input
                  name="lastName"
                  required
                  autoComplete="family-name"
                  defaultValue={profile?.last_name ?? ""}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Adresse email</label>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={profile?.email ?? user.email ?? ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si vous modifiez l&apos;email, un lien de vérification sera envoyé à la nouvelle adresse.
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
            <Button type="submit" className="w-full">
              Enregistrer et continuer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
