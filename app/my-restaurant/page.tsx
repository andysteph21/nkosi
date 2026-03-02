'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RestaurantInfoForm } from '@/components/my-restaurant/restaurant-info-form'
import { DishManagementList } from '@/components/my-restaurant/dish-management-list'
import { QrCodeTab } from '@/components/my-restaurant/qr-code-tab'
import { StatsTab } from '@/components/my-restaurant/stats-tab'
import { VisibilityTab } from '@/components/my-restaurant/visibility-tab'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MyRestaurantPage() {
  const [activeTab, setActiveTab] = useState('info')
  // undefined = still loading, null = confirmed no restaurant, number = restaurant id
  const [restaurantId, setRestaurantId] = useState<number | null | undefined>(undefined)
  const [restaurantLogo, setRestaurantLogo] = useState<string>("")

  useEffect(() => {
    async function loadRestaurantId() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) { setRestaurantId(null); return }
        const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user.id).single()
        if (!profile) { setRestaurantId(null); return }
        const { data: restaurant } = await supabase.from("restaurant").select("id,logo").eq("profile_id", profile.id).maybeSingle()
        setRestaurantId(restaurant?.id ?? null)
        setRestaurantLogo((restaurant as any)?.logo?.path ?? "")
      } catch (err) {
        console.error('Failed to load restaurant id:', err)
        setRestaurantId(null)
      }
    }
    loadRestaurantId()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Mon Restaurant</h1>
            <p className="text-muted-foreground">Gérez vos informations et votre menu</p>
          </div>

          {restaurantId === undefined ? (
            <div className="text-center py-12 text-muted-foreground">Chargement...</div>
          ) : restaurantId === null ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Vous n&apos;avez pas encore de restaurant</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Créez votre restaurant pour gérer votre menu, votre visibilité et bien plus encore.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/create-restaurant">Créer mon restaurant</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {restaurantId ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-3xl grid-cols-5">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="visibility">Visibilite</TabsTrigger>
                <TabsTrigger value="qr">QR Code</TabsTrigger>
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-6">
                <RestaurantInfoForm restaurantId={restaurantId} />
              </TabsContent>

              <TabsContent value="menu" className="mt-6">
                <DishManagementList restaurantId={restaurantId} />
              </TabsContent>

              <TabsContent value="visibility" className="mt-6">
                <VisibilityTab restaurantId={restaurantId} />
              </TabsContent>

              <TabsContent value="qr" className="mt-6">
                <QrCodeTab restaurantId={restaurantId} logoUrl={restaurantLogo} />
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <StatsTab restaurantId={restaurantId} />
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}
