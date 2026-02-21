"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatsTab({ restaurantId }: { restaurantId: number }) {
  const [stats, setStats] = useState({ view_count: 0, like_count: 0, click_count: 0 })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("restaurant")
        .select("view_count,like_count,click_count")
        .eq("id", restaurantId)
        .single()
      if (data) setStats(data)
    }
    load()
  }, [restaurantId])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle>Vues</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{stats.view_count}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Likes</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{stats.like_count}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Clics</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{stats.click_count}</p></CardContent>
      </Card>
    </div>
  )
}
