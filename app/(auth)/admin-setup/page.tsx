import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSetupPage() {
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Activation du compte administrateur</CardTitle>
          <CardDescription>
            Ouvrez le lien d&apos;invitation reçu par email puis définissez votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette page est réservée aux administrateurs invités par le super administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
