"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterDropdownProps {
  icon: React.ReactNode
  label: string
  value?: string
  values?: string[]
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  multiSelect?: boolean
}

export function FilterDropdown({ 
  icon, 
  label, 
  value, 
  values = [], 
  options, 
  onChange, 
  multiSelect = false 
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = multiSelect 
    ? values.length === 0 
      ? label 
      : `${values.length} cuisine${values.length > 1 ? 's' : ''}`
    : options.find((o) => o.value === value)?.label ?? label

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isFiltered = multiSelect ? values.length > 0 : value !== "all"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
          "border shadow-sm",
          isFiltered
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-primary/40"
        )}
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate max-w-40">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = multiSelect 
                ? values.some((v) => v.toLowerCase() === option.value.toLowerCase())
                : option.value === value
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    if (!multiSelect) {
                      setOpen(false)
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-highlight hover:text-highlight-foreground"
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
