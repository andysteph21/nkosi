import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSetupPage() {
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Activation du compte admin</CardTitle>
          <CardDescription>
            Ouvrez le lien d'invitation recu par email puis definissez votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette page est reservee aux admins invites par le super administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
