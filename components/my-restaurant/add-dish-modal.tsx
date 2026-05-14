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
import { uploadPlateImage, uploadPlateVideo } from '@/lib/upload'
import { useAuth } from '@/components/providers/auth-provider'

interface AddDishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (dish: Omit<Dish, 'id'>) => Promise<void>
  categories: Category[]
  onCreateCategory: (name: string) => Promise<Category>
  defaultCategoryId?: number | null
  restaurantId: number
}

const VIDEO_MAX_SECONDS = 10

export function AddDishModal({
  open,
  onOpenChange,
  onAdded,
  categories,
  onCreateCategory,
  defaultCategoryId,
  restaurantId,
}: AddDishModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Object URLs for live previews. We only upload the underlying File at submit.
  const [imagePreview, setImagePreview] = useState('')
  const [videoPreview, setVideoPreview] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Category state
  const [localCategories, setLocalCategories] = useState<Category[]>(categories)
  const [categoryId, setCategoryId] = useState<number | null>(defaultCategoryId ?? null)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    available: true,
  })

  // Sync when parent categories or defaultCategoryId change
  useEffect(() => { setLocalCategories(categories) }, [categories])
  useEffect(() => { setCategoryId(defaultCategoryId ?? null) }, [defaultCategoryId])

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
      if (videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    }
  }, [imagePreview, videoPreview])

  function reset() {
    setFormData({ name: '', price: 0, available: true })
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    if (videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setImagePreview('')
    setVideoPreview('')
    setImageFile(null)
    setVideoFile(null)
    setVideoError(null)
    setSubmitError(null)
    setCategoryId(defaultCategoryId ?? null)
    setShowNewCat(false)
    setNewCatName('')
    setCatError(null)
  }

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
    if (!formData.name || !imageFile || formData.price <= 0) {
      setSubmitError('Veuillez remplir tous les champs obligatoires (nom, image, prix)')
      return
    }
    if (!profile) {
      setSubmitError('Session invalide. Veuillez vous reconnecter.')
      return
    }
    try {
      setLoading(true)
      setSubmitError(null)

      // Upload image + (optional) video just before persisting.
      const imageUrl = await uploadPlateImage(profile.id, restaurantId, imageFile)
      const videoUrl = videoFile
        ? await uploadPlateVideo(profile.id, restaurantId, videoFile)
        : ''

      await onAdded({
        name: formData.name,
        price: formData.price,
        image: imageUrl,
        video: videoUrl,
        available: formData.available,
        currency: 'FCFA',
        categoryId,
        sortOrder: 0,
      })
      reset()
    } catch (error: any) {
      setSubmitError(error?.message ?? "Erreur lors de l'ajout du plat")
    } finally {
      setLoading(false)
    }
  }

  function handleImageFile(file: File) {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    setImageFile(file)
  }

  function handleVideoFile(file: File) {
    setVideoError(null)
    const objectUrl = URL.createObjectURL(file)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.src = objectUrl
    vid.onloadedmetadata = () => {
      if (vid.duration > VIDEO_MAX_SECONDS) {
        URL.revokeObjectURL(objectUrl)
        setVideoError(`La vidéo dépasse ${VIDEO_MAX_SECONDS} secondes. Veuillez en choisir une plus courte.`)
        return
      }
      // Keep the same objectUrl for the preview to avoid a second read.
      if (videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
      setVideoPreview(objectUrl)
      setVideoFile(file)
    }
    vid.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setVideoError('Fichier vidéo invalide.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un Plat</DialogTitle>
          <DialogDescription>Créez un nouveau plat pour votre menu</DialogDescription>
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Image du plat <span className="text-destructive">*</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-green-500">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
                    setImagePreview('')
                    setImageFile(null)
                  }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Dropzone
                id="add-dish-image"
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
            {videoPreview ? (
              <div className="relative">
                <video src={videoPreview} controls className="w-full rounded-lg border-2 border-green-500" />
                <button
                  type="button"
                  onClick={() => {
                    if (videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
                    setVideoPreview('')
                    setVideoFile(null)
                    setVideoError(null)
                  }}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Dropzone
                id="add-dish-video"
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
            <label htmlFor="add-dish-name" className="block text-sm font-medium text-foreground mb-2">
              Nom du plat <span className="text-destructive">*</span>
            </label>
            <Input
              id="add-dish-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Thieboudienne"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="add-dish-price" className="block text-sm font-medium text-foreground mb-2">
              Prix (FCFA) <span className="text-destructive">*</span>
            </label>
            <Input
              id="add-dish-price"
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

          {/* Available */}
          <div className="flex items-center gap-2">
            <input
              id="add-dish-available"
              type="checkbox"
              checked={formData.available}
              onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              className="w-4 h-4 rounded border border-input"
            />
            <label htmlFor="add-dish-available" className="text-sm font-medium text-foreground cursor-pointer">
              Disponible
            </label>
          </div>

          {submitError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{submitError}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Envoi en cours…' : 'Ajouter le plat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
