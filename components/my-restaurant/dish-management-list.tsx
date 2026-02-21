'use client'

import { useState, useEffect } from 'react'
import { getRestaurantById, addDish, removeDish, updateDish } from '@/services/restaurant.service'
import type { Restaurant, Dish } from '@/services/restaurant.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import { AddDishModal } from './add-dish-modal'
import { EditDishModal } from './edit-dish-modal'

interface DishManagementListProps {
  restaurantId: number
}

export function DishManagementList({ restaurantId }: DishManagementListProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)

  useEffect(() => {
    fetchRestaurant()
  }, [restaurantId])

  async function fetchRestaurant() {
    try {
      setLoading(true)
      const data = await getRestaurantById(restaurantId)
      if (data) {
        setRestaurant(data)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDish(dishData: Omit<Dish, 'id'>) {
    try {
      const newDish = await addDish(restaurantId, dishData)
      if (newDish && restaurant) {
        setRestaurant({ ...restaurant, dishes: [...restaurant.dishes, newDish] })
      }
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding dish:', error)
    }
  }

  async function handleUpdateDish(dishId: number, updates: Partial<Omit<Dish, 'id'>>) {
    try {
      const updated = await updateDish(restaurantId, dishId, updates)
      if (updated && restaurant) {
        setRestaurant({
          ...restaurant,
          dishes: restaurant.dishes.map(d => d.id === dishId ? { ...d, ...updates } : d)
        })
      }
      setEditingDish(null)
    } catch (error) {
      console.error('Error updating dish:', error)
    }
  }

  async function handleDeleteDish(dishId: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) {
      try {
        await removeDish(restaurantId, dishId)
        if (restaurant) {
          setRestaurant({
            ...restaurant,
            dishes: restaurant.dishes.filter(d => d.id !== dishId)
          })
        }
      } catch (error) {
        console.error('Error deleting dish:', error)
      }
    }
  }

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  if (!restaurant) {
    return (
      <Card>
        <CardContent className="pt-12 text-center">
          <p className="text-muted-foreground">Restaurant non trouvé</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestion du Menu</h2>
          <p className="text-sm text-muted-foreground mt-1">Total: {restaurant.dishes.length} plat(s)</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un Plat
        </Button>
      </div>

      <AddDishModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal}
        onAdded={handleAddDish}
      />

      {editingDish && (
        <EditDishModal
          open={true}
          onOpenChange={(open) => !open && setEditingDish(null)}
          dish={editingDish}
          onSaved={(updates) => handleUpdateDish(editingDish.id, updates)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurant.dishes.map(dish => (
          <Card key={dish.id} className="overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img 
                src={dish.image} 
                alt={dish.name}
                className="w-full h-full object-cover"
              />
              <Badge 
                variant={dish.available ? 'default' : 'secondary'}
                className="absolute top-2 right-2"
              >
                {dish.available ? 'Disponible' : 'Indisponible'}
              </Badge>
            </div>
            
            <CardContent className="pt-4">
              <h3 className="font-semibold text-foreground mb-1">{dish.name}</h3>
              <p className="text-lg font-bold text-primary mb-3">
                {dish.price.toLocaleString('fr-FR')} {dish.currency}
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDish(dish)}
                  className="flex-1 gap-1"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteDish(dish.id)}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {restaurant.dishes.length === 0 && (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">Aucun plat trouvé</p>
            <Button onClick={() => setShowAddModal(true)}>Ajouter le premier plat</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
