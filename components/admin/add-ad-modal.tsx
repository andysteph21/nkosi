'use client'

import { useState, useRef, useEffect } from 'react'
import { createAd, updateAd } from '@/services/ad.service'
import type { Ad } from '@/services/ad.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, X } from 'lucide-react'

interface AddAdModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  ad?: Ad
}

export function AddAdModal({ open, onOpenChange, onSaved, ad }: AddAdModalProps) {
  const isEdit = Boolean(ad)

  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [formData, setFormData] = useState({
    image: '',
    alt: '',
    link: '',
    endDate: '',
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  // Re-initialise form whenever the modal opens or the target ad changes
  useEffect(() => {
    if (open) {
      if (ad) {
        setFormData({
          image: ad.image,
          alt: ad.alt,
          link: ad.link ?? '',
          endDate: ad.endDate ? ad.endDate.toISOString().split('T')[0] : '',
        })
        setImagePreview(ad.image)
      } else {
        setFormData({ image: '', alt: '', link: '', endDate: '' })
        setImagePreview('')
      }
    }
  }, [open, ad])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.image || !formData.alt) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)
      const endDate = formData.endDate ? new Date(formData.endDate) : null

      if (isEdit && ad) {
        await updateAd(ad.id, {
          image: formData.image,
          alt: formData.alt,
          link: formData.link || undefined,
          endDate,
        })
      } else {
        await createAd(formData.image, formData.alt, formData.link || undefined, endDate)
      }

      onOpenChange(false)
      onSaved()
    } catch (error) {
      console.error('Error saving ad:', error)
      alert(isEdit ? 'Erreur lors de la modification de la publicité' : 'Erreur lors de la création de la publicité')
    } finally {
      setLoading(false)
    }
  }

  function loadFile(file: File) {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setImagePreview(result)
      setFormData(prev => ({ ...prev, image: result }))
    }
    reader.readAsDataURL(file)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.type.startsWith('image/svg')) {
      alert('Seules les images (JPG, PNG, WebP…) sont acceptées.')
      return
    }
    loadFile(file)
  }

  function clearImage() {
    setImagePreview('')
    setFormData(prev => ({ ...prev, image: '' }))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la Publicité' : 'Ajouter une Publicité'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations de la publicité.'
              : "Créez une nouvelle publicité. L'image doit être en ratio 16:9 et résolution minimum 720p."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-foreground mb-2">
              Image (16:9, min 720p)
            </label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors ${isDragging ? 'border-primary bg-accent' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative aspect-video mb-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearImage() }}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label="Supprimer l'image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader ou glisser-déposer</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="alt" className="block text-sm font-medium text-foreground mb-2">
              Texte alternatif *
            </label>
            <Input
              id="alt"
              value={formData.alt}
              onChange={(e) => setFormData(prev => ({ ...prev, alt: e.target.value }))}
              placeholder="Description de la publicité"
              required
            />
          </div>

          <div>
            <label htmlFor="link" className="block text-sm font-medium text-foreground mb-2">
              Lien (optionnel)
            </label>
            <Input
              id="link"
              value={formData.link}
              onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-2">
              Date de fin{' '}
              <span className="text-muted-foreground font-normal">(laisser vide pour durée indéfinie)</span>
            </label>
            <Input
              id="endDate"
              type="date"
              min={today}
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit ? 'Modification...' : 'Création...'
                : isEdit ? 'Enregistrer les modifications' : 'Créer la publicité'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
