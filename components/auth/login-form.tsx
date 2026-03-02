import Link from "next/link"
import { signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm({ defaultEmail }: { defaultEmail?: string } = {}) {
  return (
    <form action={signInAction} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input type="email" name="email" required autoComplete="email" defaultValue={defaultEmail} />
      </div>
      <div>
        <label className="text-sm font-medium">Mot de passe</label>
        <Input type="password" name="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full">
        Se connecter
      </Button>
      <Link className="text-sm text-muted-foreground hover:underline block text-center" href="/forgot-password">
        Mot de passe oublie ?
      </Link>
    </form>
  )
}
