'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RestaurantInfoForm } from '@/components/my-restaurant/restaurant-info-form'
import { DishManagementList } from '@/components/my-restaurant/dish-management-list'
import { QrCodeTab } from '@/components/my-restaurant/qr-code-tab'
import { StatsTab } from '@/components/my-restaurant/stats-tab'
import { VisibilityTab } from '@/components/my-restaurant/visibility-tab'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'

export default function MyRestaurantPage() {
  const [activeTab, setActiveTab] = useState('info')
  const [restaurantId, setRestaurantId] = useState<number | null>(null)

  useEffect(() => {
    async function loadRestaurantId() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from("profile").select("id").eq("user_id", user.id).single()
      if (!profile) return
      const { data: restaurant } = await supabase.from("restaurant").select("id").eq("profile_id", profile.id).maybeSingle()
      if (restaurant?.id) {
        setRestaurantId(restaurant.id)
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="visibility">Visibilite</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              {restaurantId ? <RestaurantInfoForm restaurantId={restaurantId} /> : <p>Creation de votre restaurant requise.</p>}
            </TabsContent>

            <TabsContent value="menu" className="mt-6">
              {restaurantId ? <DishManagementList restaurantId={restaurantId} /> : <p>Aucun restaurant trouve.</p>}
            </TabsContent>

            <TabsContent value="visibility" className="mt-6">
              {restaurantId ? <VisibilityTab restaurantId={restaurantId} /> : <p>Aucun restaurant trouve.</p>}
            </TabsContent>

            <TabsContent value="qr" className="mt-6">
              {restaurantId ? <QrCodeTab restaurantId={restaurantId} /> : <p>Aucun restaurant trouve.</p>}
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              {restaurantId ? <StatsTab restaurantId={restaurantId} /> : <p>Aucun restaurant trouve.</p>}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
