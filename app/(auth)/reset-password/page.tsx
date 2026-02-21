import { resetPasswordAction } from "@/app/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Definissez un nouveau mot de passe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
          {params.success ? <p className="text-sm text-green-600">{params.success}</p> : null}
          <form action={resetPasswordAction} className="space-y-4">
            <Input type="password" name="password" placeholder="Nouveau mot de passe" required minLength={8} />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirmer le mot de passe"
              required
              minLength={8}
            />
            <Button type="submit" className="w-full">
              Mettre a jour
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
