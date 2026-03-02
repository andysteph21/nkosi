import { changePasswordAction, deleteAccountAction, updateProfileNamesAction } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profile").select("first_name,last_name,email").eq("user_id", user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 space-y-6">
        {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Modifier le profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProfileNamesAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Prenom</label>
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
              {profile?.email ? (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              ) : null}
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={changePasswordAction} className="space-y-3">
              <Input type="password" name="currentPassword" placeholder="Mot de passe actuel" required autoComplete="current-password" />
              <Input type="password" name="newPassword" placeholder="Nouveau mot de passe" required minLength={8} autoComplete="new-password" />
              <Input type="password" name="confirmPassword" placeholder="Confirmer le mot de passe" required minLength={8} autoComplete="new-password" />
              <Button type="submit">Mettre a jour</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supprimer mon compte</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={deleteAccountAction}>
              <Button type="submit" variant="destructive">
                Supprimer mon compte
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
