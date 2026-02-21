'use client'

import { useState } from 'react'
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
import { Upload } from 'lucide-react'

interface AddDishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (dish: Omit<Dish, 'id'>) => void
}

export function AddDishModal({ open, onOpenChange, onAdded }: AddDishModalProps) {
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    image: '',
    available: true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.image || formData.price <= 0) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)
      onAdded({
        name: formData.name,
        price: formData.price,
        image: formData.image,
        available: formData.available,
        currency: 'FCFA',
      })
      setFormData({ name: '', price: 0, image: '', available: true })
      setImagePreview('')
    } catch (error) {
      console.error('Error adding dish:', error)
      alert('Erreur lors de l\'ajout du plat')
    } finally {
      setLoading(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setFormData(prev => ({ ...prev, image: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un Plat</DialogTitle>
          <DialogDescription>Créez un nouveau plat pour votre menu</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-foreground mb-2">Image du plat</label>
            <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors">
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative aspect-video mb-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Nom du plat *</label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Thieboudienne"
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-foreground mb-2">Prix (FCFA) *</label>
            <Input
              id="price"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              placeholder="Ex: 7000"
              required
              min="1"
              step="1"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="available"
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="w-4 h-4 rounded border border-input"
            />
            <label htmlFor="available" className="text-sm font-medium text-foreground cursor-pointer">Disponible</label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ajout...' : 'Ajouter le plat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
