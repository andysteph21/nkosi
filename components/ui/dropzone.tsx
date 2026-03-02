'use client'

import { useState, useRef, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

interface DropzoneProps {
  id: string
  accept: string
  label: string
  hint?: string
  icon?: ReactNode
  onFile: (file: File) => void
}

export function Dropzone({ id, accept, label, hint, icon, onFile }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function matchesAccept(file: File): boolean {
    return accept.split(',').some((token) => {
      const t = token.trim()
      if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -1))
      return file.type === t || file.name.endsWith(t.replace('*', ''))
    })
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = Array.from(files).find(matchesAccept)
    if (file) onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors select-none
        ${dragging ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex flex-col items-center gap-2 py-2 pointer-events-none">
        {icon ?? <Upload className="h-8 w-8 text-muted-foreground" />}
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
