'use client'

import { useState, useEffect } from 'react'
import { getAllAds, deleteAd, activateAd, deactivateAd } from '@/services/ad.service'
import type { Ad } from '@/services/ad.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Power, Plus, CalendarClock, Infinity, Pencil } from 'lucide-react'
import { AddAdModal } from './add-ad-modal'

export function AdsManagementTab() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)

  useEffect(() => {
    fetchAds()
  }, [])

  async function fetchAds() {
    try {
      setLoading(true)
      const data = await getAllAds()
      setAds(data)
    } catch (error) {
      console.error('Error fetching ads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?')) {
      try {
        await deleteAd(id)
        setAds(ads.filter(ad => ad.id !== id))
      } catch (error) {
        console.error('Error deleting ad:', error)
      }
    }
  }

  async function handleToggleActive(id: number, isActive: boolean) {
    try {
      if (isActive) {
        await deactivateAd(id)
      } else {
        await activateAd(id)
      }
      setAds(ads.map(ad => 
        ad.id === id ? { ...ad, active: !ad.active } : ad
      ))
    } catch (error) {
      console.error('Error toggling ad status:', error)
    }
  }

  async function handleAdSaved() {
    await fetchAds()
  }

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestion des Publicités</h2>
          <p className="text-sm text-muted-foreground mt-1">Total: {ads.length} publicité(s)</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une Publicité
        </Button>
      </div>

      <AddAdModal
        open={showAddModal || editingAd !== null}
        onOpenChange={(open) => { if (!open) { setShowAddModal(false); setEditingAd(null) } }}
        onSaved={handleAdSaved}
        ad={editingAd ?? undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map(ad => (
          <Card key={ad.id} className="overflow-hidden">
            <div className="relative aspect-video overflow-hidden bg-muted">
              <img 
                src={ad.image} 
                alt={ad.alt}
                className="w-full h-full object-cover"
              />
              <Badge 
                variant={ad.active ? 'default' : 'secondary'}
                className="absolute top-2 right-2"
              >
                {ad.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{ad.alt}</p>
              {ad.link && (
                <p className="text-xs text-muted-foreground truncate">{ad.link}</p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 mb-4">
                {ad.endDate ? (
                  <>
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {ad.endDate < new Date()
                      ? <span className="text-destructive">Expiré le {ad.endDate.toLocaleDateString('fr-FR')}</span>
                      : <span>Expire le {ad.endDate.toLocaleDateString('fr-FR')}</span>
                    }
                  </>
                ) : (
                  <>
                    <Infinity className="h-3 w-3 shrink-0" />
                    Durée indéfinie
                  </>
                )}
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(ad.id, ad.active)}
                  className="flex-1 gap-1"
                >
                  <Power className="h-3.5 w-3.5" />
                  {ad.active ? 'Désactiver' : 'Activer'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingAd(ad)}
                  aria-label="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(ad.id)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ads.length === 0 && (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">Aucune publicité trouvée</p>
            <Button onClick={() => setShowAddModal(true)}>Créer la première publicité</Button>

          </CardContent>
        </Card>
      )}
    </div>
  )
}
