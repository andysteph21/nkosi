'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  getRestaurantById,
  addDish,
  removeDish,
  updateDish,
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  reorderCategories,
  reorderDishes,
} from '@/services/restaurant.service'
import type { Dish, Category } from '@/services/restaurant.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Edit, Play, X, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { AddDishModal } from './add-dish-modal'
import { EditDishModal } from './edit-dish-modal'

// ---------------------------------------------------------------------------
// DishCard
// ---------------------------------------------------------------------------

interface DishCardProps {
  dish: Dish
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function DishCard({ dish, isFirst, isLast, onEdit, onDelete, onMoveUp, onMoveDown }: DishCardProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {playing && dish.video ? (
          <>
            <video
              src={dish.video}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="absolute top-2 left-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
              title="Arrêter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
            {dish.video && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute top-2 left-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
                title="Lire la vidéo"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
              </button>
            )}
            <Badge
              variant={dish.available ? 'default' : 'secondary'}
              className="absolute top-2 right-2 text-xs"
            >
              {dish.available ? 'Disponible' : 'Indisponible'}
            </Badge>
          </>
        )}
      </div>

      <CardContent className="pt-3 pb-3">
        <h3 className="font-semibold text-foreground text-sm mb-0.5 truncate">{dish.name}</h3>
        <p className="text-base font-bold text-primary mb-2">
          {dish.price.toLocaleString('fr-FR')} {dish.currency}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Monter"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Descendre"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={onEdit} className="h-7 px-2 gap-1 text-xs">
            <Edit className="h-3 w-3" />
            Modifier
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} className="h-7 w-7 p-0">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DishManagementList
// ---------------------------------------------------------------------------

interface DishManagementListProps {
  restaurantId: number
}

export function DishManagementList({ restaurantId }: DishManagementListProps) {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addToCategoryId, setAddToCategoryId] = useState<number | null>(null)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)

  // Category inline management
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)
  const [catFormError, setCatFormError] = useState<string | null>(null)
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  useEffect(() => { fetchData() }, [restaurantId])

  async function fetchData() {
    try {
      setLoading(true)
      const [restaurant, cats] = await Promise.all([
        getRestaurantById(restaurantId),
        getCategories(restaurantId),
      ])
      if (restaurant) setDishes(restaurant.dishes)
      setCategories(cats)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group and sort dishes by category
  const grouped = useMemo(() => {
    const map = new Map<number | null, Dish[]>()
    for (const cat of categories) map.set(cat.id, [])
    map.set(null, [])
    for (const dish of dishes) {
      const key = dish.categoryId !== null && map.has(dish.categoryId) ? dish.categoryId : null
      map.get(key)!.push(dish)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [categories, dishes])

  // --- Dish handlers ---

  async function handleAddDish(dishData: Omit<Dish, 'id'>): Promise<void> {
    const catDishes = grouped.get(dishData.categoryId) ?? []
    const nextOrder = catDishes.length > 0 ? Math.max(...catDishes.map(d => d.sortOrder)) + 1 : 0
    const newDish = await addDish(restaurantId, { ...dishData, sortOrder: nextOrder })
    if (newDish) setDishes(prev => [...prev, newDish])
    setShowAddModal(false)
  }

  async function handleUpdateDish(dishId: number, updates: Partial<Omit<Dish, 'id'>>): Promise<void> {
    const updated = await updateDish(restaurantId, dishId, updates)
    if (updated) setDishes(prev => prev.map(d => d.id === dishId ? updated : d))
    setEditingDish(null)
  }

  async function handleDeleteDish(dishId: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return
    try {
      await removeDish(restaurantId, dishId)
      setDishes(prev => prev.filter(d => d.id !== dishId))
    } catch (err) {
      console.error('Error deleting dish:', err)
    }
  }

  function handleMoveDish(categoryId: number | null, dishId: number, direction: 'up' | 'down') {
    const arr = [...(grouped.get(categoryId) ?? [])]
    const idx = arr.findIndex(d => d.id === dishId)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= arr.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    // Assign sequential sortOrders to avoid ties
    const updates = arr.map((d, i) => ({ id: d.id, sortOrder: i }))
    const orderMap = new Map(updates.map(u => [u.id, u.sortOrder]))
    setDishes(prev => prev.map(d => orderMap.has(d.id) ? { ...d, sortOrder: orderMap.get(d.id)! } : d))
    reorderDishes(updates)
  }

  // --- Category handlers ---

  async function handleCreateCategoryFromForm() {
    if (!newCatName.trim()) return
    try {
      setCreatingCat(true)
      setCatFormError(null)
      const cat = await handleCreateCategory(newCatName.trim())
      setNewCatName('')
      return cat
    } catch (err: any) {
      setCatFormError(err.message)
    } finally {
      setCreatingCat(false)
    }
  }

  async function handleCreateCategory(name: string): Promise<Category> {
    const cat = await createCategory(restaurantId, name)
    setCategories(prev => [...prev, cat])
    return cat
  }

  async function handleRenameCategory(catId: number) {
    const trimmed = editingCatName.trim()
    if (!trimmed) return
    try {
      await renameCategory(catId, trimmed)
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: trimmed } : c))
      setEditingCatId(null)
    } catch (err: any) {
      setCatFormError(err.message)
    }
  }

  async function handleDeleteCategory(catId: number) {
    const count = (grouped.get(catId) ?? []).length
    const msg = count > 0
      ? `Cette catégorie contient ${count} plat(s) qui seront déplacés vers "Sans catégorie". Continuer ?`
      : 'Supprimer cette catégorie ?'
    if (!confirm(msg)) return
    try {
      await deleteCategory(catId)
      setCategories(prev => prev.filter(c => c.id !== catId))
      setDishes(prev => prev.map(d => d.categoryId === catId ? { ...d, categoryId: null } : d))
    } catch (err) {
      console.error('Error deleting category:', err)
    }
  }

  function handleMoveCategory(idx: number, direction: 'up' | 'down') {
    const arr = [...categories]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= arr.length) return
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    const updates = arr.map((c, i) => ({ id: c.id, sortOrder: i }))
    const orderMap = new Map(updates.map(u => [u.id, u.sortOrder]))
    const newArr = arr.map(c => ({ ...c, sortOrder: orderMap.get(c.id)! }))
    setCategories(newArr)
    reorderCategories(updates)
  }

  // ---------------------------------------------------------------------------

  if (loading) return <div className="text-center py-12 text-muted-foreground">Chargement...</div>

  const uncategorized = grouped.get(null) ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestion du Menu</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {dishes.length} plat(s) · {categories.length} catégorie(s)
          </p>
        </div>
        <Button
          onClick={() => { setAddToCategoryId(null); setShowAddModal(true) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter un plat
        </Button>
      </div>

      {/* New category form */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <Input
            value={newCatName}
            onChange={e => { setNewCatName(e.target.value); setCatFormError(null) }}
            placeholder="Nom de la nouvelle catégorie..."
            onKeyDown={e => e.key === 'Enter' && handleCreateCategoryFromForm()}
          />
          {catFormError && <p className="text-xs text-destructive mt-1">{catFormError}</p>}
        </div>
        <Button
          variant="outline"
          onClick={handleCreateCategoryFromForm}
          disabled={!newCatName.trim() || creatingCat}
          className="gap-1 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Créer une catégorie
        </Button>
      </div>

      {/* Category sections */}
      {categories.map((cat, idx) => {
        const catDishes = grouped.get(cat.id) ?? []
        const isEditingName = editingCatId === cat.id

        return (
          <section key={cat.id} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-2 border-b pb-2">
              {/* Reorder buttons */}
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveCategory(idx, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 hover:bg-accent rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  title="Monter la catégorie"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveCategory(idx, 'down')}
                  disabled={idx === categories.length - 1}
                  className="p-0.5 hover:bg-accent rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  title="Descendre la catégorie"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {isEditingName ? (
                <div className="flex gap-2 items-center flex-1 min-w-0">
                  <Input
                    value={editingCatName}
                    onChange={e => setEditingCatName(e.target.value)}
                    className="h-8 font-semibold"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameCategory(cat.id)
                      if (e.key === 'Escape') setEditingCatId(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(cat.id)}
                    className="p-1 rounded hover:bg-accent text-green-600 shrink-0"
                    title="Confirmer"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCatId(null)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground shrink-0"
                    title="Annuler"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-foreground flex-1">
                    {cat.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({catDishes.length} plat{catDishes.length !== 1 ? 's' : ''})
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); setCatFormError(null) }}
                    className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                    title="Renommer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 rounded hover:bg-accent text-destructive transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Dishes in this category */}
            {catDishes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6">
                {catDishes.map((dish, dIdx) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    isFirst={dIdx === 0}
                    isLast={dIdx === catDishes.length - 1}
                    onEdit={() => setEditingDish(dish)}
                    onDelete={() => handleDeleteDish(dish.id)}
                    onMoveUp={() => handleMoveDish(cat.id, dish.id, 'up')}
                    onMoveDown={() => handleMoveDish(cat.id, dish.id, 'down')}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pl-6">Aucun plat dans cette catégorie</p>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAddToCategoryId(cat.id); setShowAddModal(true) }}
              className="ml-6 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un plat dans cette catégorie
            </Button>
          </section>
        )
      })}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <section className="space-y-3">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold text-muted-foreground">
              Sans catégorie
              <span className="ml-2 text-sm font-normal">
                ({uncategorized.length} plat{uncategorized.length !== 1 ? 's' : ''})
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorized.map((dish, dIdx) => (
              <DishCard
                key={dish.id}
                dish={dish}
                isFirst={dIdx === 0}
                isLast={dIdx === uncategorized.length - 1}
                onEdit={() => setEditingDish(dish)}
                onDelete={() => handleDeleteDish(dish.id)}
                onMoveUp={() => handleMoveDish(null, dish.id, 'up')}
                onMoveDown={() => handleMoveDish(null, dish.id, 'down')}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {dishes.length === 0 && categories.length === 0 && (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Commencez par créer une catégorie, puis ajoutez vos plats.
            </p>
            <Button onClick={() => { setAddToCategoryId(null); setShowAddModal(true) }}>
              Ajouter le premier plat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddDishModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdded={handleAddDish}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        defaultCategoryId={addToCategoryId}
      />

      {editingDish && (
        <EditDishModal
          open={true}
          onOpenChange={(open) => !open && setEditingDish(null)}
          dish={editingDish}
          onSaved={(updates) => handleUpdateDish(editingDish.id, updates)}
          categories={categories}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  )
}
