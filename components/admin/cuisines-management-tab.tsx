"use client"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { createCuisineAction, deleteCuisineAction, renameCuisineAction } from "@/app/actions/admin-cuisines"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface CuisineRow {
  id: number
  name: string
  mainCount?: number
  subCount?: number
}

export function CuisinesManagementTab() {
  const [cuisines, setCuisines] = useState<CuisineRow[]>([])
  const [pending, startTransition] = useTransition()
  const [newCuisine, setNewCuisine] = useState("")

  async function fetchCuisines() {
    const supabase = createClient()
    const { data } = await supabase.from("cuisine").select("id,name").order("name")
    const { data: links } = await supabase.from("restaurant_cuisine").select("cuisine_id,is_main")
    const counts = new Map<number, { main: number; sub: number }>()
    for (const row of links ?? []) {
      const current = counts.get(row.cuisine_id) ?? { main: 0, sub: 0 }
      if (row.is_main) current.main += 1
      else current.sub += 1
      counts.set(row.cuisine_id, current)
    }
    setCuisines(
      ((data ?? []) as CuisineRow[]).map((c) => ({
        ...c,
        mainCount: counts.get(c.id)?.main ?? 0,
        subCount: counts.get(c.id)?.sub ?? 0,
      }))
    )
  }

  useEffect(() => {
    fetchCuisines()
  }, [])

  function onAdd() {
    if (!newCuisine.trim()) return
    startTransition(async () => {
      await createCuisineAction(newCuisine.trim())
      setNewCuisine("")
      await fetchCuisines()
    })
  }

  function onRename(id: number, name: string) {
    startTransition(async () => {
      await renameCuisineAction(id, name)
      await fetchCuisines()
    })
  }

  function onDelete(id: number) {
    startTransition(async () => {
      await deleteCuisineAction(id)
      await fetchCuisines()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des cuisines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={newCuisine} onChange={(e) => setNewCuisine(e.target.value)} placeholder="Nouvelle cuisine" />
          <Button onClick={onAdd} disabled={pending}>Ajouter</Button>
        </div>
        <div className="space-y-2">
          {cuisines.map((cuisine) => (
            <div key={cuisine.id} className="flex gap-2 items-center">
              <Input
                defaultValue={cuisine.name}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== cuisine.name) onRename(cuisine.id, value)
                }}
              />
              <Button variant="destructive" onClick={() => onDelete(cuisine.id)} disabled={pending}>
                Supprimer
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Principal: {cuisine.mainCount} | Secondaire: {cuisine.subCount}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
