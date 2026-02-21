import { changePasswordAction, deleteAccountAction } from "@/app/actions/auth"
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
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
            {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
            <form action={changePasswordAction} className="space-y-3">
              <Input type="password" name="currentPassword" placeholder="Mot de passe actuel" required />
              <Input type="password" name="newPassword" placeholder="Nouveau mot de passe" required minLength={8} />
              <Input type="password" name="confirmPassword" placeholder="Confirmer le mot de passe" required minLength={8} />
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
