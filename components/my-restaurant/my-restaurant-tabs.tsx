"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RestaurantInfoForm } from "@/components/my-restaurant/restaurant-info-form"
import { DishManagementList } from "@/components/my-restaurant/dish-management-list"
import { QrCodeTab } from "@/components/my-restaurant/qr-code-tab"
import { StatsTab } from "@/components/my-restaurant/stats-tab"
import { VisibilityTab } from "@/components/my-restaurant/visibility-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Store } from "lucide-react"

interface MyRestaurantTabsProps {
  restaurantId: number | null
  restaurantLogo: string
}

export function MyRestaurantTabs({ restaurantId, restaurantLogo }: MyRestaurantTabsProps) {
  const [activeTab, setActiveTab] = useState("info")

  if (restaurantId === null) {
    return (
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
    )
  }

  return (
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
        <QrCodeTab restaurantId={restaurantId} logoUrl="/images/nkosi-logo.png" />
      </TabsContent>

      <TabsContent value="stats" className="mt-6">
        <StatsTab restaurantId={restaurantId} />
      </TabsContent>
    </Tabs>
  )
}
