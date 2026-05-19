import Link from "next/link"
import { Compass } from "lucide-react"

// Rendered when `notFound()` is called from a server component, or when
// a URL does not match any route. Server component on purpose — keeps
// the page small and lets us add metadata cleanly.

export const metadata = {
  title: "Page introuvable — NKOSI",
}

export default function NotFoundPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground max-w-md">
        Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse
        ou retournez à l&apos;accueil pour découvrir les restaurants.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-input bg-background px-5 py-2 text-sm font-medium"
        >
          Nous contacter
        </Link>
      </div>
    </main>
  )
}
