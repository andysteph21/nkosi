import { signUpAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SignUpForm({
  defaultRole = "client",
  redirect,
  autoLike,
}: {
  defaultRole?: "client" | "restaurateur"
  redirect?: string
  autoLike?: string
}) {
  return (
    <form action={signUpAction} className="space-y-4">
      {redirect ? <input type="hidden" name="redirectTo" value={redirect} /> : null}
      {autoLike ? <input type="hidden" name="autoLike" value={autoLike} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Prenom</label>
          <Input name="firstName" required autoComplete="given-name" />
        </div>
        <div>
          <label className="text-sm font-medium">Nom</label>
          <Input name="lastName" required autoComplete="family-name" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input name="email" type="email" required autoComplete="email" />
      </div>
      <input type="hidden" name="role" value={defaultRole} />
      <div>
        <label className="text-sm font-medium">Mot de passe</label>
        <Input name="password" type="password" required autoComplete="new-password" />
      </div>
      <div>
        <label className="text-sm font-medium">Confirmer le mot de passe</label>
        <Input name="confirmPassword" type="password" required autoComplete="new-password" />
      </div>
      <Button className="w-full" type="submit">
        Creer mon compte
      </Button>
    </form>
  )
}
