import Link from "next/link"
import { createRestaurantAction } from "@/app/actions/restaurant"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CuisineSelector } from "@/components/cuisine-selector"
import { getAvailableCuisines } from "@/services/restaurant.service"

export default async function CreateRestaurantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params = await searchParams
  const cuisines = await getAvailableCuisines()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Créer mon restaurant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {params.error ? (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {params.error}
                </div>
              ) : null}
              {params.success ? (
                <p role="status" aria-live="polite" className="text-sm text-green-600">
                  {params.success}
                </p>
              ) : null}
              <form action={createRestaurantAction} className="space-y-4">
                <Input name="name" placeholder="Nom du restaurant" required />
                <Textarea name="description" placeholder="Description (200 caractères max)" maxLength={200} />
                <div className="grid md:grid-cols-2 gap-3">
                  <Input name="city" placeholder="Ville" required />
                  <Input name="neighborhood" placeholder="Quartier" required />
                </div>
                <Textarea name="address" placeholder="Adresse détaillée" required />
                <CuisineSelector cuisines={cuisines} />
                <Button type="submit">Créer</Button>
              </form>
              <Link href="/my-restaurant" className="text-sm underline">
                Retour à mon restaurant
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
