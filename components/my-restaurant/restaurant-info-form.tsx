'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRestaurantById, updateRestaurantData } from '@/services/restaurant.service'
import type { Restaurant, DayHours } from '@/services/restaurant.service'
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
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

interface RestaurantInfoFormProps {
  restaurantId: number
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

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
    hours: [] as DayHours[],
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [scheduleErrors, setScheduleErrors] = useState<Record<number, string>>({})
  useUnsavedChanges(hasChanges)

  // Validate time format (HH:MM - HH:MM)
  function validateTimeFormat(time: string): boolean {
    if (!time.trim()) return false
    const timeRegex = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/
    return timeRegex.test(time.trim())
  }

  // Validate all schedules
  function validateSchedules(): boolean {
    const errors: Record<number, string> = {}
    let isValid = true

    formData.hours.forEach((day, index) => {
      // Skip validation for closed days
      if (day.closed) return

      if (!day.hours.trim()) {
        errors[index] = 'Veuillez remplir les horaires'
        isValid = false
      } else if (!validateTimeFormat(day.hours)) {
        errors[index] = 'Format invalide (ex: 09:00 - 22:00)'
        isValid = false
      }
    })

    setScheduleErrors(errors)
    return isValid
  }

  useEffect(() => {
    fetchRestaurant()
  }, [restaurantId])

  async function fetchRestaurant() {
    try {
      setLoading(true)
      const data = await getRestaurantById(restaurantId)
      if (data) {
        setRestaurant(data)
        setFormData({
          name: data.name,
          about: data.about,
          position: data.position,
          city: data.city,
          neighborhood: data.neighborhood,
          image: data.image,
          logo: '',
          hours: data.hours,
        })
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
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (type === 'logo') {
          setLogoPreview(result)
          setFormData(prev => ({ ...prev, logo: result }))
        } else {
          setCoverPreview(result)
          setFormData(prev => ({ ...prev, image: result }))
        }
        handleFormChange()
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTimeChange = (dayIndex: number, newHours: string) => {
    const newSchedule = [...formData.hours]
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], hours: newHours }
    setFormData(prev => ({ ...prev, hours: newSchedule }))
    handleFormChange()
  }

  const handleToggleClosed = (dayIndex: number) => {
    const newSchedule = [...formData.hours]
    newSchedule[dayIndex] = { 
      ...newSchedule[dayIndex], 
      closed: !newSchedule[dayIndex].closed,
      hours: !newSchedule[dayIndex].closed ? '' : newSchedule[dayIndex].hours
    }
    setFormData(prev => ({ ...prev, hours: newSchedule }))
    // Clear error when toggling closed
    if (scheduleErrors[dayIndex]) {
      setScheduleErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[dayIndex]
        return newErrors
      })
    }
    handleFormChange()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)
      
      // Validate schedules before submit
      if (!validateSchedules()) {
        setMessage({ type: 'error', text: 'Veuillez corriger les erreurs dans les horaires' })
        setSaving(false)
        return
      }

      await updateRestaurantData(restaurantId, {
        name: formData.name,
        about: formData.about,
        position: formData.position,
        city: formData.city,
        neighborhood: formData.neighborhood,
        image: formData.image,
        hours: formData.hours,
      })
      setMessage({ type: 'success', text: 'Les informations ont été mises à jour avec succès' })
      setHasChanges(false)
      setScheduleErrors({})
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
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG (carré recommandé)</p>
                    </label>
                  </div>
                </div>
                {(logoPreview || restaurant.image) && (
                  <div className="flex flex-col gap-2">
                    {logoPreview && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nouveau logo</p>
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input border-green-500">
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        </div>
                      </div>
                    )}
                    {restaurant.image && !logoPreview && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Logo actuel</p>
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-input">
                          <img src={restaurant.image} alt="Current logo" className="w-full h-full object-cover" crossOrigin="anonymous" />
                        </div>
                      </div>
                    )}
                  </div>
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
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG (16:9 recommandé, min 720p)</p>
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

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Horaires d'ouverture *</label>
              <p className="text-xs text-muted-foreground mb-4 p-3 bg-blue-50 rounded-md">
                ✓ Cochez la case "Fermé" pour indiquer que le restaurant n'est pas ouvert ce jour-là
              </p>
              <div className="space-y-3">
                {formData.hours.map((day, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm text-foreground block mb-2">{day.day}</label>
                      <Input
                        type="text"
                        value={day.hours}
                        onChange={(e) => {
                          handleTimeChange(index, e.target.value)
                          // Clear error when user starts typing
                          if (scheduleErrors[index]) {
                            setScheduleErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors[index]
                              return newErrors
                            })
                          }
                        }}
                        placeholder="Ex: 09:00 - 22:00"
                        disabled={day.closed ?? false}
                        className={`w-full disabled:opacity-50 disabled:cursor-not-allowed ${scheduleErrors[index] ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {scheduleErrors[index] && (
                        <p className="text-sm text-red-500 mt-1">{scheduleErrors[index]}</p>
                      )}
                      {day.closed && (
                        <p className="text-sm text-muted-foreground mt-1">Fermé ce jour</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <label htmlFor={`closed-${index}`} className="text-xs text-foreground cursor-pointer whitespace-nowrap">
                        Fermé
                      </label>
                      <input
                        type="checkbox"
                        id={`closed-${index}`}
                        checked={day.closed ?? false}
                        onChange={() => handleToggleClosed(index)}
                        className="w-4 h-4 rounded border border-input cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Format: HH:MM - HH:MM (ex: 09:00 - 22:00)</p>
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
