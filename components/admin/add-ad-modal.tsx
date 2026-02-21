'use client'

import { useState } from 'react'
import { createAd } from '@/services/ad.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Upload } from 'lucide-react'

interface AddAdModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

export function AddAdModal({ open, onOpenChange, onAdded }: AddAdModalProps) {
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [formData, setFormData] = useState({
    image: '',
    alt: '',
    link: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.image || !formData.alt) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)
      await createAd(formData.image, formData.alt, formData.link || undefined)
      setFormData({ image: '', alt: '', link: '' })
      setImagePreview('')
      onOpenChange(false)
      onAdded()
    } catch (error) {
      console.error('Error creating ad:', error)
      alert('Erreur lors de la création de la publicité')
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
          <DialogTitle>Ajouter une Publicité</DialogTitle>
          <DialogDescription>
            Créez une nouvelle publicité. L'image doit être en ratio 16:9 et résolution minimum 720p.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-foreground mb-2">Image (16:9, min 720p)</label>
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
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader ou glisser-déposer</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="alt" className="block text-sm font-medium text-foreground mb-2">Texte alternatif *</label>
            <Input
              id="alt"
              value={formData.alt}
              onChange={(e) => setFormData(prev => ({ ...prev, alt: e.target.value }))}
              placeholder="Description de la publicité"
              required
            />
          </div>

          <div>
            <label htmlFor="link" className="block text-sm font-medium text-foreground mb-2">Lien (optionnel)</label>
            <Input
              id="link"
              value={formData.link}
              onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer la publicité'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
