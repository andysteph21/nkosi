import Link from "next/link"
import { signInAction } from "@/app/actions/auth"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/ui/submit-button"

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
      <SubmitButton className="w-full" pendingText="Connexion…">
        Se connecter
      </SubmitButton>
      <Link className="text-sm text-muted-foreground hover:underline block text-center" href="/forgot-password">
        Mot de passe oublié ?
      </Link>
    </form>
  )
}
