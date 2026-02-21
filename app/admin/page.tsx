'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdsManagementTab } from '@/components/admin/ads-management-tab'
import { RestaurantsManagementTab } from '@/components/admin/restaurants-management-tab'
import { CuisinesManagementTab } from '@/components/admin/cuisines-management-tab'
import { AdminsManagementTab } from '@/components/admin/admins-management-tab'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useAuth } from '@/components/providers/auth-provider'

export default function AdminPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('ads')
  const isSuperAdmin = profile?.role === "super_admin"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Tableau de Bord Admin</h1>
            <p className="text-muted-foreground">Gérez les publicités et les restaurants de la plateforme</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isSuperAdmin ? "max-w-2xl grid-cols-4" : "max-w-3xl grid-cols-3"}`}>
              {isSuperAdmin ? <TabsTrigger value="admins">Admins</TabsTrigger> : null}
              <TabsTrigger value="ads">Publicités</TabsTrigger>
              <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
              <TabsTrigger value="cuisines">Cuisines</TabsTrigger>
            </TabsList>

            {isSuperAdmin ? (
              <TabsContent value="admins" className="mt-6">
                <AdminsManagementTab />
              </TabsContent>
            ) : null}

            <TabsContent value="ads" className="mt-6">
              <AdsManagementTab />
            </TabsContent>

            <TabsContent value="restaurants" className="mt-6">
              <RestaurantsManagementTab />
            </TabsContent>

            <TabsContent value="cuisines" className="mt-6">
              <CuisinesManagementTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
