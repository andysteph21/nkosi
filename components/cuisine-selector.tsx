"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface CuisineOption {
  id: number
  name: string
}

interface CuisineSelectorProps {
  cuisines: CuisineOption[]
  initialMainId?: number | null
  initialSubIds?: number[]
  /** Called on every change; when provided, hidden inputs are NOT rendered. */
  onChange?: (mainId: number | null, subIds: number[]) => void
}

export function CuisineSelector({ cuisines, initialMainId, initialSubIds = [], onChange }: CuisineSelectorProps) {
  const [mainCuisineId, setMainCuisineId] = useState<number | null>(initialMainId ?? null)
  const [subCuisineIds, setSubCuisineIds] = useState<number[]>(initialSubIds)

  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    onChange?.(mainCuisineId, subCuisineIds)
  }, [mainCuisineId, subCuisineIds])

  useEffect(() => {
    setMainCuisineId(initialMainId ?? null)
    setSubCuisineIds(initialSubIds)
  }, [initialMainId, JSON.stringify(initialSubIds)])

  const availableForSub = cuisines.filter(
    (c) => c.id !== mainCuisineId && !subCuisineIds.includes(c.id),
  )

  function handleAddSub(id: number) {
    if (subCuisineIds.length >= 3) return
    setSubCuisineIds((prev) => [...prev, id])
  }

  function handleRemoveSub(id: number) {
    setSubCuisineIds((prev) => prev.filter((x) => x !== id))
  }

  function handleMainChange(id: number | null) {
    setMainCuisineId(id)
    if (id !== null) {
      setSubCuisineIds((prev) => prev.filter((x) => x !== id))
    }
  }

  return (
    <div className="space-y-3">
      {!onChange && mainCuisineId && <input type="hidden" name="main_cuisine_id" value={mainCuisineId} />}
      {!onChange && subCuisineIds.map((id) => (
        <input key={id} type="hidden" name="sub_cuisine_ids" value={id} />
      ))}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Cuisine principale <span className="text-destructive">*</span>
        </label>
        <select
          value={mainCuisineId ?? ""}
          onChange={(e) => handleMainChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          <option value="">-- Choisir --</option>
          {cuisines.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Sous-cuisines (max 3, optionnel)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {subCuisineIds.map((id) => {
            const c = cuisines.find((x) => x.id === id)
            if (!c) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => handleRemoveSub(id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
        {subCuisineIds.length < 3 && availableForSub.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) handleAddSub(Number(e.target.value))
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">+ Ajouter une sous-cuisine</option>
            {availableForSub.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
