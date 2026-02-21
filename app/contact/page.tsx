import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Contact</h1>
        <p className="text-muted-foreground mb-6">
          Pour toute question, ecrivez-nous a contact@nkosi.app.
        </p>
        <p className="text-sm text-muted-foreground">
          Nous repondons en general sous 24 a 48 heures.
        </p>
      </main>
      <Footer />
    </div>
  )
}
