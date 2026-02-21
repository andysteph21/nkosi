'use client'

import { useState, useEffect, useMemo } from 'react'
import { getRestaurants, restrictRestaurant, unrestrictRestaurant } from '@/services/restaurant.service'
import type { Restaurant } from '@/services/restaurant.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Lock, Unlock, Search } from 'lucide-react'
import { getVisibilityRequests, approveVisibilityRequest, refuseVisibilityRequest } from '@/services/visibility-request.service'

export function RestaurantsManagementTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityRequests, setVisibilityRequests] = useState<any[]>([])

  // Filter restaurants based on search query
  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) {
      return restaurants
    }
    const query = searchQuery.toLowerCase()
    return restaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(query)
    )
  }, [restaurants, searchQuery])

  useEffect(() => {
    fetchRestaurants()
  }, [])

  async function fetchRestaurants() {
    try {
      setLoading(true)
      const data = await getRestaurants()
      setRestaurants(data)
      const requests = await getVisibilityRequests()
      setVisibilityRequests(requests)
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestrict(id: number, currentlyRestricted: boolean) {
    try {
      if (currentlyRestricted) {
        await unrestrictRestaurant(id)
      } else {
        await restrictRestaurant(id)
      }
      setRestaurants(restaurants.map(r =>
        r.id === id ? { ...r, restricted: !r.restricted } : r
      ))
    } catch (error) {
      console.error('Error toggling restaurant restriction:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Gestion des Restaurants</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Total: {restaurants.length} restaurant(s) | Restreints: {restaurants.filter(r => r.restricted).length}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Restaurants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom de restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus:ring-0 focus:outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {filteredRestaurants.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun restaurant trouvé pour "{searchQuery}"</p>
            </div>
          )}

          {filteredRestaurants.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Nom</th>
                  <th className="text-left py-3 px-4 font-medium">Ville</th>
                  <th className="text-left py-3 px-4 font-medium">Statut</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map(restaurant => (
                  <tr key={restaurant.id} className="border-b hover:bg-accent transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">{restaurant.name}</p>
                        <p className="text-xs text-muted-foreground">{restaurant.position}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{restaurant.city}</td>
                    <td className="py-3 px-4">
                      <Badge variant={restaurant.restricted ? 'destructive' : 'default'}>
                        {restaurant.restricted ? 'Restreint' : 'Actif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant={restaurant.restricted ? 'outline' : 'destructive'}
                        onClick={() => handleRestrict(restaurant.id, restaurant.restricted)}
                        className="gap-2"
                      >
                        {restaurant.restricted ? (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            Autoriser
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Restreindre
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demandes de visibilite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibilityRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
          ) : (
            visibilityRequests.map((request) => (
              <div key={request.id} className="rounded-md border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium">{request.restaurant?.name ?? "Restaurant"}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.restaurant?.neighborhood}, {request.restaurant?.city}
                  </p>
                  {request.restaurant?.id ? (
                    <a
                      className="text-xs underline mt-1 inline-block"
                      href={`/restaurant/${request.restaurant.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir la page (lecture seule)
                    </a>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await approveVisibilityRequest(request.id)
                      await fetchRestaurants()
                    }}
                  >
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const reason = prompt("Motif du refus (500 caracteres max):") ?? ""
                      if (!reason.trim()) return
                      await refuseVisibilityRequest(request.id, reason.slice(0, 500))
                      await fetchRestaurants()
                    }}
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
