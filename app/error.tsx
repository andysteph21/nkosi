"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

// Segment-level error boundary. Catches uncaught exceptions thrown by
// React Server Components, Server Actions, and client components in this
// route subtree. Next.js renders this in place of the broken page while
// keeping the root layout intact (header, providers, etc.).

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the browser console so the user can copy/paste it if needed,
    // and to the server logs in dev. Production errors land in Next's own
    // logger via `error.digest`.
    console.error("[app/error]", error)
  }, [error])

  return (
    <main
      role="alert"
      aria-live="polite"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="text-muted-foreground max-w-md">
        Désolé, cette page n&apos;a pas pu s&apos;afficher correctement.
        Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Référence&nbsp;: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-full border border-input bg-background px-5 py-2 text-sm font-medium"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
