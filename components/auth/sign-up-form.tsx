import { signUpAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Accessibility / autofill notes
 *
 *   - Every <label> is bound to its input via htmlFor/id so screen readers
 *     announce the label when the input receives focus, and a tap on the
 *     label moves focus to the input.
 *   - The autoComplete tokens follow the WHATWG values: given-name /
 *     family-name / email / new-password, so iOS Keychain, 1Password and
 *     Bitwarden suggest the right fields and propose strong passwords on
 *     "new-password".
 *   - inputMode="email" makes the @ key directly visible on mobile keyboards.
 *   - spellCheck/autoCapitalize off on email & passwords prevents Android
 *     from underlining or auto-capitalising the first letter.
 */
export function SignUpForm({
  defaultRole = "client",
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  redirect,
  autoLike,
}: {
  defaultRole?: "client" | "restaurateur"
  defaultFirstName?: string
  defaultLastName?: string
  defaultEmail?: string
  redirect?: string
  autoLike?: string
}) {
  return (
    <form action={signUpAction} className="space-y-4" noValidate={false}>
      {redirect ? <input type="hidden" name="redirectTo" value={redirect} /> : null}
      {autoLike ? <input type="hidden" name="autoLike" value={autoLike} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="signup-firstName" className="text-sm font-medium">
            Prénom
          </label>
          <Input
            id="signup-firstName"
            name="firstName"
            required
            autoComplete="given-name"
            autoCapitalize="words"
            defaultValue={defaultFirstName}
          />
        </div>
        <div>
          <label htmlFor="signup-lastName" className="text-sm font-medium">
            Nom
          </label>
          <Input
            id="signup-lastName"
            name="lastName"
            required
            autoComplete="family-name"
            autoCapitalize="words"
            defaultValue={defaultLastName}
          />
        </div>
      </div>
      <div>
        <label htmlFor="signup-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          defaultValue={defaultEmail}
        />
      </div>
      <input type="hidden" name="role" value={defaultRole} />
      <div>
        <label htmlFor="signup-password" className="text-sm font-medium">
          Mot de passe
        </label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          minLength={8}
        />
      </div>
      <div>
        <label htmlFor="signup-confirmPassword" className="text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <Input
          id="signup-confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          minLength={8}
        />
      </div>
      <Button className="w-full" type="submit">
        Créer mon compte
      </Button>
    </form>
  )
}
