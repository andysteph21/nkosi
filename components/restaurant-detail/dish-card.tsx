"use client"

import { useState, useRef } from "react"
import { Play, X } from "lucide-react"
import type { Dish } from "@/services/restaurant.service"

interface DishCardProps {
  dish: Dish
}

export function DishCard({ dish }: DishCardProps) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = !!dish.video

  function handlePlay() {
    setPlaying(true)
  }

  function handleStop() {
    setPlaying(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden">
        {playing ? (
          <>
            <video
              ref={videoRef}
              src={dish.video}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              onClick={handleStop}
              className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm hover:bg-card transition-colors"
              aria-label="Arrêter la vidéo"
            >
              <X className="h-4 w-4 text-card-foreground" />
            </button>
          </>
        ) : (
          <>
            <img
              src={dish.image || "/placeholder.svg"}
              alt={dish.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              crossOrigin="anonymous"
            />
            {hasVideo && (
              <button
                onClick={handlePlay}
                className="absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm hover:bg-card transition-colors"
                aria-label="Lire la vidéo"
              >
                <Play className="h-4 w-4 text-card-foreground" />
              </button>
            )}
          </>
        )}
        {!dish.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-medium text-destructive">
              Indisponible
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold text-card-foreground">{dish.name}</h3>
        <span className="font-bold text-primary whitespace-nowrap ml-3">
          {dish.price.toLocaleString("fr-FR")} {dish.currency}
        </span>
      </div>
      <div className="px-4 pb-4 -mt-1">
        <span className={dish.available ? "text-xs font-medium text-primary" : "text-xs font-medium text-destructive"}>
          {dish.available ? "Disponible" : "Indisponible"}
        </span>
      </div>
    </article>
  )
}
