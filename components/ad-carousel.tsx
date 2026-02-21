"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getActiveAds } from "@/services/ad.service"
import type { Ad } from "@/services/ad.service"

export function AdCarousel() {
  const [ads, setAds] = React.useState<Ad[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true)
  const [loading, setLoading] = React.useState(true)

  // Fetch active ads on mount
  React.useEffect(() => {
    async function fetchAds() {
      try {
        const activeAds = await getActiveAds()
        const shuffled = [...activeAds].sort(() => Math.random() - 0.5).slice(0, 10)
        setAds(shuffled)
      } catch (error) {
        console.error("Error fetching ads:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAds()
  }, [])

  const goToPrevious = () => {
    if (ads.length === 0) return
    setCurrentIndex((prev) => (prev === 0 ? ads.length - 1 : prev - 1))
  }

  const goToNext = React.useCallback(() => {
    if (ads.length === 0) return
    setCurrentIndex((prev) => (prev === ads.length - 1 ? 0 : prev + 1))
  }, [ads.length])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  React.useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      goToNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, goToNext])

  if (loading || ads.length === 0) {
    return (
      <div className="relative w-full max-w-6xl mx-auto px-4">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div 
      className="relative w-full max-w-6xl mx-auto px-4"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        {ads.map((ad, index) => (
          <div
            key={ad.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {ad.link ? (
              <a href={ad.link} className="block w-full h-full">
                <Image
                  src={ad.image || "/placeholder.svg"}
                  alt={ad.alt}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </a>
            ) : (
              <Image
                src={ad.image || "/placeholder.svg"}
                alt={ad.alt}
                fill
                className="object-cover"
                priority={index === 0}
              />
            )}
          </div>
        ))}

        {/* Navigation Arrows - Desktop only */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm hover:bg-highlight text-foreground shadow-md"
          onClick={goToPrevious}
          aria-label="Image précédente"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm hover:bg-highlight text-foreground shadow-md"
          onClick={goToNext}
          aria-label="Image suivante"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-6 bg-highlight" 
                  : "w-2 bg-card/60 hover:bg-card"
              )}
              aria-label={`Aller à l'image ${index + 1}`}
            />
          ))}
        </div>

        {/* Publicité label */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-medium bg-card/80 backdrop-blur-sm rounded text-muted-foreground">
            Publicité
          </span>
        </div>
      </div>
    </div>
  )
}
