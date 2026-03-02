'use client'

import { useState, useEffect } from 'react'
import type { Dish, Category } from '@/services/restaurant.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dropzone } from '@/components/ui/dropzone'
import { Video, X, Plus } from 'lucide-react'

interface EditDishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dish: Dish
  onSaved: (updates: Partial<Omit<Dish, 'id'>>) => Promise<void>
  categories: Category[]
  onCreateCategory: (name: string) => Promise<Category>
}

const VIDEO_MAX_SECONDS = 10
const IMAGE_MAX_PX = 800
const IMAGE_QUALITY = 0.85

function resizeImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY))
    }
    img.src = dataUrl
  })
}

export function EditDishModal({
  open,
  onOpenChange,
  dish,
  onSaved,
  categories,
  onCreateCategory,
}: EditDishModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [newVideoPreview, setNewVideoPreview] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Category state
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const [categoryId, setCategoryId] = useState<number | null>(dish.categoryId)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: dish.name,
    price: dish.price,
    image: '',
    video: '',
    available: dish.available,
  })

  useEffect(() => {
    setFormData({ name: dish.name, price: dish.price, image: '', video: '', available: dish.available })
    setCategoryId(dish.categoryId)
    setNewImagePreview(null)
    setNewVideoPreview(null)
    setVideoError(null)
    setSubmitError(null)
    setShowNewCat(false)
    setNewCatName('')
    setCatError(null)
  }, [dish])

  useEffect(() => { setLocalCategories(categories) }, [categories])

  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    try {
      setCatLoading(true)
      setCatError(null)
      const cat = await onCreateCategory(newCatName.trim())
      setLocalCategories(prev => [...prev, cat])
      setCategoryId(cat.id)
      setShowNewCat(false)
      setNewCatName('')
    } catch (err: any) {
      setCatError(err.message)
    } finally {
      setCatLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || formData.price <= 0) {
      setSubmitError('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      setLoading(true)
      setSubmitError(null)
      await onSaved({
        name: formData.name,
        price: formData.price,
        available: formData.available,
        categoryId,
        ...(newImagePreview ? { image: formData.image } : {}),
        ...(newVideoPreview !== null ? { video: formData.video } : {}),
      })
    } catch (error: any) {
      setSubmitError(error?.message ?? 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  function handleImageFile(file: File) {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const resized = await resizeImage(reader.result as string)
      setNewImagePreview(resized)
      setFormData(prev => ({ ...prev, image: resized }))
    }
    reader.readAsDataURL(file)
  }

  function handleVideoFile(file: File) {
    setVideoError(null)
    const objectUrl = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = objectUrl
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      if (vid.duration > VIDEO_MAX_SECONDS) {
        setVideoError(`La vidéo dépasse ${VIDEO_MAX_SECONDS} secondes. Veuillez en choisir une plus courte.`)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setNewVideoPreview(result)
        setFormData(prev => ({ ...prev, video: result }))
      }
      reader.readAsDataURL(file)
    }
    vid.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setVideoError('Fichier vidéo invalide.')
    }
  }

  const currentImage = newImagePreview ?? dish.image
  const currentVideo = newVideoPreview ?? dish.video

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le Plat</DialogTitle>
          <DialogDescription>Mettez à jour les informations du plat</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Catégorie</label>
            <select
              value={showNewCat ? '__new__' : (categoryId?.toString() ?? '')}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewCat(true)
                } else {
                  setShowNewCat(false)
                  setCategoryId(e.target.value ? Number(e.target.value) : null)
                }
              }}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans catégorie</option>
              {localCategories.map(cat => (
                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
              ))}
              <option value="__new__">+ Créer une nouvelle catégorie...</option>
            </select>
            {showNewCat && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newCatName}
                  onChange={e => { setNewCatName(e.target.value); setCatError(null) }}
                  placeholder="Nom de la catégorie"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCatName.trim() || catLoading}
                  className="gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créer
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNewCat(false); setNewCatName('') }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {catError && <p className="text-xs text-destructive mt-1">{catError}</p>}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Image du plat</label>
            {currentImage && currentImage !== '/placeholder.svg' ? (
              <div className="relative">
                <div className={`relative aspect-video overflow-hidden rounded-lg border-2 ${newImagePreview ? 'border-green-500' : 'border-input'}`}>
                  <img src={currentImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => { setNewImagePreview(null); setFormData(prev => ({ ...prev, image: '' })) }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                  title="Remplacer l'image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Dropzone
                id="edit-dish-image"
                accept="image/*"
                label="Cliquez ou déposez une image"
                hint="JPG, PNG, WEBP"
                onFile={handleImageFile}
              />
            )}
          </div>

          {/* Video */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Vidéo
              <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel · max {VIDEO_MAX_SECONDS}s)</span>
            </label>
            {currentVideo ? (
              <div className="relative">
                <video
                  src={currentVideo}
                  controls
                  className={`w-full rounded-lg border-2 ${newVideoPreview ? 'border-green-500' : 'border-input'}`}
                />
                <button
                  type="button"
                  onClick={() => { setNewVideoPreview(''); setVideoError(null); setFormData(prev => ({ ...prev, video: '' })) }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                  title="Supprimer la vidéo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Dropzone
                id="edit-dish-video"
                accept="video/mp4"
                label="Cliquez ou déposez une vidéo MP4"
                hint={`Max ${VIDEO_MAX_SECONDS} secondes`}
                icon={<Video className="h-8 w-8 text-muted-foreground" />}
                onFile={handleVideoFile}
              />
            )}
            {videoError && <p className="text-sm text-destructive mt-1">{videoError}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="edit-dish-name" className="block text-sm font-medium text-foreground mb-2">
              Nom du plat <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-dish-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="edit-dish-price" className="block text-sm font-medium text-foreground mb-2">
              Prix (FCFA) <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-dish-price"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              required
              min="1"
              step="1"
              inputMode="numeric"
            />
          </div>

          {/* Available */}
          <div className="flex items-center gap-2">
            <input
              id="edit-dish-available"
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="w-4 h-4 rounded border border-input"
            />
            <label htmlFor="edit-dish-available" className="text-sm font-medium text-foreground cursor-pointer">
              Disponible
            </label>
          </div>

          {submitError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{submitError}</p>
          )}

          <div className="flex gap-2 pt-2">
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
