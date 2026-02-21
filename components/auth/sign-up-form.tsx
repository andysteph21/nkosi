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
          <Input name="firstName" required />
        </div>
        <div>
          <label className="text-sm font-medium">Nom</label>
          <Input name="lastName" required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <label className="text-sm font-medium">Type de compte</label>
        <select
          name="role"
          defaultValue={defaultRole}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="client">Client</option>
          <option value="restaurateur">Restaurateur</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Mot de passe</label>
        <Input name="password" type="password" required />
      </div>
      <div>
        <label className="text-sm font-medium">Confirmer le mot de passe</label>
        <Input name="confirmPassword" type="password" required />
      </div>
      <Button className="w-full" type="submit">
        Creer mon compte
      </Button>
    </form>
  )
}
