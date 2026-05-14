import Link from "next/link"
import { WifiOff } from "lucide-react"

// Static fallback served by the service worker when a navigation fails
// without any cached copy. Kept intentionally minimal so it weighs almost
// nothing once cached.

export const dynamic = "force-static"

export const metadata = {
  title: "Hors connexion — NKOSI",
}

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Vous êtes hors connexion</h1>
      <p className="text-muted-foreground max-w-md">
        Cette page n&apos;est pas encore en cache sur votre appareil. Reconnectez-vous
        au réseau pour la consulter.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
