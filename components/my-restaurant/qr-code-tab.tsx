"use client"

import { useMemo, useState } from "react"
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"

interface QrCodeTabProps {
  restaurantId: number
}

type ExportFormat = "jpeg" | "png" | "webp" | "svg"

export function QrCodeTab({ restaurantId }: QrCodeTabProps) {
  const [format, setFormat] = useState<ExportFormat>("jpeg")
  const [isBlack, setIsBlack] = useState(false)
  const url = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000"}/restaurant/${restaurantId}`,
    [restaurantId]
  )

  function downloadCanvas(targetFormat: "jpeg" | "png" | "webp") {
    const canvas = document.getElementById("restaurant-qr-canvas") as HTMLCanvasElement | null
    if (!canvas) return
    const mime = targetFormat === "jpeg" ? "image/jpeg" : targetFormat === "webp" ? "image/webp" : "image/png"
    const dataUrl = canvas.toDataURL(mime, 0.92)
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `restaurant-${restaurantId}-qr.${targetFormat}`
    a.click()
  }

  function downloadSvg() {
    const svg = document.getElementById("restaurant-qr-svg")
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `restaurant-${restaurantId}-qr.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function onDownload() {
    if (format === "svg") {
      downloadSvg()
    } else {
      downloadCanvas(format)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Scannez ce QR code pour ouvrir votre page restaurant.</p>
      <div className="rounded-xl border p-4 flex justify-center bg-white">
        <div>
          <QRCodeCanvas
            id="restaurant-qr-canvas"
            value={url}
            size={220}
            fgColor={isBlack ? "#000000" : "#2f5f2f"}
            bgColor="#ffffff"
            includeMargin
          />
          <QRCodeSVG id="restaurant-qr-svg" value={url} size={220} fgColor={isBlack ? "#000000" : "#2f5f2f"} bgColor="#ffffff" includeMargin className="hidden" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Format:</label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
        >
          <option value="jpeg">JPEG (defaut)</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
          <option value="svg">SVG</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBlack} onChange={(e) => setIsBlack(e.target.checked)} />
          Noir et blanc
        </label>
        <Button onClick={onDownload}>Telecharger</Button>
      </div>
    </div>
  )
}
