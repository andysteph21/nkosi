'use client'

import { useState, useEffect } from 'react'
import type { Dish } from '@/services/restaurant.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditDishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dish: Dish
  onSaved: (updates: Partial<Omit<Dish, 'id'>>) => void
}

export function EditDishModal({ open, onOpenChange, dish, onSaved }: EditDishModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: dish.name,
    price: dish.price,
    available: dish.available,
  })

  useEffect(() => {
    setFormData({
      name: dish.name,
      price: dish.price,
      available: dish.available,
    })
  }, [dish])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || formData.price <= 0) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)
      onSaved({
        name: formData.name,
        price: formData.price,
        available: formData.available,
      })
    } catch (error) {
      console.error('Error updating dish:', error)
      alert('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le Plat</DialogTitle>
          <DialogDescription>Mettez à jour les informations du plat</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-foreground mb-2">Nom du plat *</label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-price" className="block text-sm font-medium text-foreground mb-2">Prix (FCFA) *</label>
            <Input
              id="edit-price"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              required
              min="1"
              step="1"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-available"
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="w-4 h-4 rounded border border-input"
            />
            <label htmlFor="edit-available" className="text-sm font-medium text-foreground cursor-pointer">Disponible</label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
