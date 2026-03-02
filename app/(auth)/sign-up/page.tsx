import Link from "next/link"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, UtensilsCrossed } from "lucide-react"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; role?: "client" | "restaurateur"; redirect?: string; auto_like?: string }>
}) {
  const params = await searchParams
  const role = params.role

  if (!role) {
    const buildQuery = (selectedRole: string) => {
      const q = new URLSearchParams()
      q.set("role", selectedRole)
      if (params.redirect) q.set("redirect", params.redirect)
      if (params.auto_like) q.set("auto_like", params.auto_like)
      return q.toString()
    }

    return (
      <div className="min-h-screen grid place-items-center p-4 bg-background">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Créer un compte</h1>
            <p className="text-muted-foreground">Choisissez le type de compte qui vous correspond.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href={`/sign-up?${buildQuery("client")}`} className="group">
              <Card className="h-full transition-all border-2 hover:border-primary hover:shadow-lg cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <UtensilsCrossed className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Je suis un client</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Découvrez et sauvegardez vos restaurants préférés.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/sign-up?${buildQuery("restaurateur")}`} className="group">
              <Card className="h-full transition-all border-2 hover:border-primary hover:shadow-lg cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ChefHat className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Je suis restaurateur</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gérez votre restaurant et attirez de nouveaux clients.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Déjà inscrit ?{" "}
            <Link href="/sign-in" className="underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link href="/sign-up" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Retour
            </Link>
          </div>
          <CardTitle>
            {role === "restaurateur" ? "Inscription restaurateur" : "Inscription client"}
          </CardTitle>
          <CardDescription>
            {role === "restaurateur"
              ? "Créez votre compte pour gérer votre restaurant."
              : "Créez votre compte pour découvrir des restaurants."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
          <SignUpForm defaultRole={role} redirect={params.redirect} autoLike={params.auto_like} />
          <p className="text-sm text-muted-foreground text-center">
            Déjà inscrit ?{" "}
            <Link href="/sign-in" className="underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
