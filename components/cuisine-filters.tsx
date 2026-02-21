"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_VISIBLE_PHONE = 2
const MAX_VISIBLE_TABLET = 5

const pillBase = "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all"
const pillActive = "bg-primary text-primary-foreground shadow-sm"
const pillInactive = "bg-card text-foreground/80 hover:bg-highlight hover:text-highlight-foreground border border-border"

function useMaxVisible() {
  const [maxVisible, setMaxVisible] = useState(MAX_VISIBLE_PHONE)

  useEffect(() => {
    function update() {
      setMaxVisible(window.innerWidth >= 640 ? MAX_VISIBLE_TABLET : MAX_VISIBLE_PHONE)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return maxVisible
}

interface CuisineFiltersProps {
  cuisines: string[]
  selectedCuisines: string[]
  onToggle: (cuisine: string) => void
}

export function CuisineFilters({ cuisines, selectedCuisines, onToggle }: CuisineFiltersProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const maxVisible = useMaxVisible()

  const { visible, overflow } = useMemo(() => {
    const shuffled = [...cuisines].sort(() => Math.random() - 0.5)
    const vis = shuffled.slice(0, maxVisible)
    const ovf = shuffled.slice(maxVisible)
    
    // Ensure selected cuisines are visible when possible
    const selectedInOverflow = ovf.filter((c) =>
      selectedCuisines.some((s) => s.toLowerCase() === c.toLowerCase())
    )
    
    for (const selected of selectedInOverflow) {
      if (vis.length < maxVisible) break
      const firstUnselected = vis.findIndex((c) =>
        !selectedCuisines.some((s) => s.toLowerCase() === c.toLowerCase())
      )
      if (firstUnselected !== -1) {
        const temp = vis[firstUnselected]
        vis[firstUnselected] = selected
        const selectedIndex = ovf.indexOf(selected)
        ovf[selectedIndex] = temp
      }
    }
    
    return { visible: vis, overflow: ovf }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuisines, maxVisible, selectedCuisines.length])

  const isOverflowSelected = overflow.some(
    (c) => selectedCuisines.some((s) => s.toLowerCase() === c.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2 md:hidden">
      {visible.map((cuisine) => {
        const isSelected = selectedCuisines.some((s) => s.toLowerCase() === cuisine.toLowerCase())
        return (
          <button
            key={cuisine}
            onClick={() => onToggle(cuisine)}
            className={cn(pillBase, isSelected ? pillActive : pillInactive)}
          >
            {cuisine}
          </button>
        )
      })}
      {overflow.length > 0 && (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={cn(
              pillBase,
              "flex items-center gap-1",
              isOverflowSelected ? pillActive : pillInactive
            )}
          >
            +{overflow.length} autres
            <ChevronDown className={cn("h-4 w-4 transition-transform", dropdownOpen && "rotate-180")} />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-48 rounded-xl border border-border bg-card p-2 shadow-lg">
              {overflow.map((cuisine) => {
                const isSelected = selectedCuisines.some((s) => s.toLowerCase() === cuisine.toLowerCase())
                return (
                  <button
                    key={cuisine}
                    onClick={() => {
                      onToggle(cuisine)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-highlight hover:text-highlight-foreground"
                    )}
                  >
                    {cuisine}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
