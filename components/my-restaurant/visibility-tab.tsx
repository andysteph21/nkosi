"use client"

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { requestVisibilityAction, toggleRestaurantVisibilityAction } from "@/app/actions/restaurant"
import { Button } from "@/components/ui/button"

export function VisibilityTab({ restaurantId }: { restaurantId: number }) {
  const [state, setState] = useState({
    is_restricted: true,
    is_visible: false,
    has_pending_request: false,
  })
  const [pending, startTransition] = useTransition()

  async function load() {
    const supabase = createClient()
    const { data: restaurant } = await supabase
      .from("restaurant")
      .select("is_restricted,is_visible")
      .eq("id", restaurantId)
      .single()
    const { data: request } = await supabase
      .from("visibility_request")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .maybeSingle()

    setState({
      is_restricted: restaurant?.is_restricted ?? true,
      is_visible: restaurant?.is_visible ?? false,
      has_pending_request: Boolean(request),
    })
  }

  useEffect(() => {
    load()
  }, [restaurantId])

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Statut actuel:{" "}
        <span className="font-semibold">{state.is_restricted ? "Restreint" : "Autorise"}</span>
      </p>

      {state.is_restricted ? (
        <Button
          onClick={() =>
            startTransition(async () => {
              await requestVisibilityAction(restaurantId)
              await load()
            })
          }
          disabled={pending || state.has_pending_request}
        >
          {state.has_pending_request ? "Demande en cours" : "Demander la visibilite"}
        </Button>
      ) : (
        <Button
          variant={state.is_visible ? "destructive" : "default"}
          onClick={() =>
            startTransition(async () => {
              await toggleRestaurantVisibilityAction(restaurantId, !state.is_visible)
              await load()
            })
          }
          disabled={pending}
        >
          {state.is_visible ? "Masquer le restaurant" : "Afficher le restaurant"}
        </Button>
      )}
    </div>
  )
}
