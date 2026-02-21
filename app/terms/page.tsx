import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold">Termes et Conditions</h1>
        <p className="text-muted-foreground">
          En utilisant NKOSI, vous acceptez ces conditions d'utilisation.
        </p>
        <h2 className="text-xl font-semibold">Comptes</h2>
        <p className="text-sm text-muted-foreground">
          Vous etes responsable de la confidentialite de votre compte et de votre mot de passe.
        </p>
        <h2 className="text-xl font-semibold">Contenus</h2>
        <p className="text-sm text-muted-foreground">
          Les restaurateurs sont responsables des informations publiees sur leur restaurant et leurs plats.
        </p>
      </main>
      <Footer />
    </div>
  )
}
