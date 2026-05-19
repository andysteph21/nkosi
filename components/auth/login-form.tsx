import Link from "next/link"
import { signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginForm({ defaultEmail }: { defaultEmail?: string } = {}) {
  return (
    <form action={signInAction} className="space-y-4">
      <div>
        <label htmlFor="signin-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="signin-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          defaultValue={defaultEmail}
        />
      </div>
      <div>
        <label htmlFor="signin-password" className="text-sm font-medium">
          Mot de passe
        </label>
        <Input
          id="signin-password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <Button type="submit" className="w-full">
        Se connecter
      </Button>
      <Link className="text-sm text-muted-foreground hover:underline block text-center" href="/forgot-password">
        Mot de passe oublié ?
      </Link>
    </form>
  )
}
