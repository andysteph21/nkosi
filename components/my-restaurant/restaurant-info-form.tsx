'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRestaurantById, updateRestaurantData, getAvailableCuisines, updateRestaurantCuisines } from '@/services/restaurant.service'
import type { Restaurant } from '@/services/restaurant.service'
import { CuisineSelector } from '@/components/cuisine-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { ScheduleEditor, dayHoursToEntry, entryToDayHours, isEntryValid } from '@/components/my-restaurant/schedule-editor'
import type { ScheduleEntry } from '@/components/my-restaurant/schedule-editor'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

// Checkerboard reveals whether the logo has a transparent background.
const CHECKER_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23ccc'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23ccc'/%3E%3Crect x='8' width='8' height='8' fill='%23fff'/%3E%3Crect y='8' width='8' height='8' fill='%23fff'/%3E%3C/svg%3E\")"

function LogoPreview({ src, isNew }: { src: string; isNew: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-[96px]">
      <p className="text-xs text-muted-foreground">{isNew ? 'Nouveau logo' : 'Logo actuel'}</p>
      <div
        className="w-24 h-24 rounded-lg border border-input overflow-hidden"
        style={{ backgroundImage: CHECKER_BG, backgroundSize: '16px 16px' }}
      >
        <img src={src} alt="Logo" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}

interface RestaurantInfoFormProps {
  restaurantId: number
}

export function RestaurantInfoForm({ restaurantId }: RestaurantInfoFormProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'cancel' | 'leave' | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    position: '',
    city: '',
    neighborhood: '',
    image: '',
    logo: '',
    schedule: [] as ScheduleEntry[],
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const [cropModal, setCropModal] = useState<{
    open: boolean
    src: string
    type: 'logo' | 'cover'
  }>({ open: false, src: '', type: 'logo' })

  const [availableCuisines, setAvailableCuisines] = useState<{ id: number; name: string }[]>([])
  const [mainCuisineId, setMainCuisineId] = useState<number | null>(null)
  const [subCuisineIds, setSubCuisineIds] = useState<number[]>([])

  useUnsavedChanges(hasChanges)

  function validateSchedule(): boolean {
    const invalid = formData.schedule.some((entry) => !isEntryValid(entry))
    if (invalid) {
      setScheduleError('Veuillez remplir les horaires d\'ouverture et de fermeture pour chaque jour actif.')
      return false
    }
    setScheduleError(null)
    return true
  }

  useEffect(() => {
    fetchRestaurant()
  }, [restaurantId])

  async function fetchRestaurant() {
    try {
      setLoading(true)
      const [data, allCuisines] = await Promise.all([
        getRestaurantById(restaurantId),
        getAvailableCuisines(),
      ])
      setAvailableCuisines(allCuisines)
      if (data) {
        setRestaurant(data)
        setFormData({
          name: data.name,
          about: data.about,
          position: data.position,
          city: data.city,
          neighborhood: data.neighborhood,
          image: data.image,
          logo: data.logo,
          schedule: data.hours.map(dayHoursToEntry),
        })
        const main = data.cuisines.find((c) => c.isMain)
        setMainCuisineId(main?.id ?? null)
        setSubCuisineIds(data.cuisines.filter((c) => !c.isMain).map((c) => c.id))
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement du restaurant' })
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = useCallback(() => {
    setHasChanges(true)
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset file input so the same file can be re-selected after cancelling crop
    e.target.value = ''
    const reader = new FileReader()
    reader.onloadend = () => {
      setCropModal({ open: true, src: reader.result as string, type })
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = (croppedDataUrl: string) => {
    const { type } = cropModal
    if (type === 'logo') {
      setLogoPreview(croppedDataUrl)
      setFormData(prev => ({ ...prev, logo: croppedDataUrl }))
    } else {
      setCoverPreview(croppedDataUrl)
      setFormData(prev => ({ ...prev, image: croppedDataUrl }))
    }
    handleFormChange()
    setCropModal({ open: false, src: '', type: 'logo' })
  }

  const handleCropCancel = () => {
    setCropModal({ open: false, src: '', type: 'logo' })
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)
      
      if (!validateSchedule()) {
        setSaving(false)
        return
      }

      await updateRestaurantData(restaurantId, {
        name: formData.name,
        about: formData.about,
        position: formData.position,
        city: formData.city,
        neighborhood: formData.neighborhood,
        ...(coverPreview ? { image: formData.image } : {}),
        ...(logoPreview ? { logo: formData.logo } : {}),
        hours: formData.schedule.map(entryToDayHours),
      })
      if (mainCuisineId) {
        await updateRestaurantCuisines(restaurantId, mainCuisineId, subCuisineIds)
      }
      setMessage({ type: 'success', text: 'Les informations ont été mises à jour avec succès' })
      setHasChanges(false)
      setScheduleError(null)
    } catch (error) {
      console.error('Error updating restaurant:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      setPendingAction('cancel')
      setShowConfirmDialog(true)
    } else {
      fetchRestaurant()
    }
  }

  const confirmCancel = () => {
    setShowConfirmDialog(false)
    setPendingAction(null)
    fetchRestaurant()
    setHasChanges(false)
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Informations du Restaurant</CardTitle>
          <CardDescription>Modifiez les détails de votre restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Logo du restaurant</label>
              <div className="flex gap-6 items-start">
                <div className="flex-1">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, 'logo')}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer block">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Cliquez pour uploader un logo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG — recadrage carré (1:1) automatique</p>
                    </label>
                  </div>
                </div>
                {(logoPreview || restaurant.logo) && (
                  <LogoPreview
                    src={logoPreview ?? restaurant.logo}
                    isNew={!!logoPreview}
                  />
                )}
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Image de couverture</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'cover')}
                  className="hidden"
                  id="cover-upload"
                />
                <label htmlFor="cover-upload" className="cursor-pointer block">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cliquez pour uploader une image de couverture</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG — recadrage 16:9 automatique</p>
                </label>
              </div>
              {(coverPreview || restaurant.image) && (
                <div className="mt-4 space-y-3">
                  {coverPreview && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nouvelle couverture</p>
                      <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-green-500">
                        <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  )}
                  {restaurant.image && !coverPreview && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Couverture actuelle</p>
                      <div className="relative aspect-video overflow-hidden rounded-lg border border-input">
                        <img src={restaurant.image} alt="Current cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Nom du restaurant *</label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); handleFormChange() }}
                required
              />
            </div>

            <div>
              <label htmlFor="about" className="block text-sm font-medium text-foreground mb-2">Description</label>
              <textarea
                id="about"
                value={formData.about}
                onChange={(e) => { setFormData(prev => ({ ...prev, about: e.target.value })); handleFormChange() }}
                rows={4}
                placeholder="Décrivez votre restaurant..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground mb-2">Ville *</label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => { setFormData(prev => ({ ...prev, city: e.target.value })); handleFormChange() }}
                  required
                />
              </div>

              <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-foreground mb-2">Quartier *</label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => { setFormData(prev => ({ ...prev, neighborhood: e.target.value })); handleFormChange() }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-foreground mb-2">Adresse détaillée *</label>
              <textarea
                id="position"
                value={formData.position}
                onChange={(e) => { setFormData(prev => ({ ...prev, position: e.target.value })); handleFormChange() }}
                rows={2}
                placeholder="Ex: 12 Rue de l'Exemple, Paris 75001..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Cuisines */}
            {availableCuisines.length > 0 && (
              <CuisineSelector
                cuisines={availableCuisines}
                initialMainId={mainCuisineId}
                initialSubIds={subCuisineIds}
                onChange={(mainId, subIds) => {
                  setMainCuisineId(mainId)
                  setSubCuisineIds(subIds)
                  handleFormChange()
                }}
              />
            )}

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Horaires d'ouverture *</label>
              <ScheduleEditor
                value={formData.schedule}
                onChange={(schedule) => {
                  setFormData(prev => ({ ...prev, schedule }))
                  setScheduleError(null)
                  handleFormChange()
                }}
              />
              {scheduleError && (
                <p className="text-sm text-destructive mt-2">{scheduleError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                L'icône <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">🌙 +1j</span> indique que la fermeture est le lendemain.
              </p>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex gap-2 pt-6 border-t">
              <Button 
                type="submit" 
                disabled={saving || !hasChanges}
                className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={saving}
              >
                Annuler
              </Button>
            </div>

            {/* Status Messages */}
            {message && (
              <div className={`flex gap-2 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <ImageCropModal
        open={cropModal.open}
        src={cropModal.src}
        aspect={cropModal.type === 'logo' ? 1 : 16 / 9}
        title={cropModal.type === 'logo' ? 'Recadrer le logo (1:1)' : 'Recadrer la couverture (16:9)'}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discarter les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir les abandonner ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Continuer l'édition</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground">
              Discarter
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
