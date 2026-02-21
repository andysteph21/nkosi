"use client"

import { useState, useEffect } from "react"
import { MapPin, Building2, UtensilsCrossed, X } from "lucide-react"
import { CuisineFilters } from "@/components/cuisine-filters"
import { FilterDropdown } from "@/components/filter-dropdown"
import { RestaurantGrid } from "@/components/restaurant-grid"
import { SearchBar } from "@/components/search-bar"
import { Button } from "@/components/ui/button"
import { getUniqueCuisines, getUniqueCities, getUniqueNeighborhoods } from "@/services/restaurant.service"

export function RestaurantSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all")
  const [uniqueCuisines, setUniqueCuisines] = useState<string[]>([])
  const [uniqueCities, setUniqueCities] = useState<string[]>([])
  const [uniqueNeighborhoods, setUniqueNeighborhoods] = useState<string[]>([])

  // Fetch unique cuisines and cities on mount
  useEffect(() => {
    async function fetchFilters() {
      const [cuisines, cities] = await Promise.all([
        getUniqueCuisines(),
        getUniqueCities(),
      ])
      setUniqueCuisines(cuisines)
      setUniqueCities(cities)
    }
    fetchFilters()
  }, [])

  // Fetch neighborhoods when city changes
  useEffect(() => {
    async function fetchNeighborhoods() {
      const neighborhoods = await getUniqueNeighborhoods(selectedCity)
      setUniqueNeighborhoods(neighborhoods)
    }
    fetchNeighborhoods()
  }, [selectedCity])

  const cuisineOptions = uniqueCuisines.map((c) => ({ value: c, label: c }))

  const cityOptions = [
    { value: "all", label: "Toutes les villes" },
    ...uniqueCities.map((c) => ({ value: c, label: c })),
  ]

  const neighborhoodOptions = [
    { value: "all", label: "Tous les quartiers" },
    ...uniqueNeighborhoods.map((n) => ({ value: n, label: n })),
  ]

  function handleCuisineToggle(cuisine: string) {
    setSelectedCuisines((prev) => {
      if (prev.includes(cuisine)) {
        return prev.filter((c) => c !== cuisine)
      }
      return [...prev, cuisine]
    })
  }

  function handleCityChange(city: string) {
    setSelectedCity(city)
    setSelectedNeighborhood("all")
  }

  function resetAllFilters() {
    setSearchQuery("")
    setSelectedCuisines([])
    setSelectedCity("all")
    setSelectedNeighborhood("all")
  }

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCuisines.length > 0 || selectedCity !== "all" || selectedNeighborhood !== "all"

  return (
    <div className="space-y-6">
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      {/* Mobile: pill buttons for cuisine */}
      <CuisineFilters
        cuisines={uniqueCuisines}
        selectedCuisines={selectedCuisines}
        onToggle={handleCuisineToggle}
      />
      {/* Tablet+: cuisine dropdown */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        <FilterDropdown
          icon={<UtensilsCrossed className="h-4 w-4" />}
          label="Toutes les cuisines"
          values={selectedCuisines}
          options={cuisineOptions}
          onChange={handleCuisineToggle}
          multiSelect
        />
        <FilterDropdown
          icon={<Building2 className="h-4 w-4" />}
          label="Toutes les villes"
          value={selectedCity}
          options={cityOptions}
          onChange={handleCityChange}
        />
        <FilterDropdown
          icon={<MapPin className="h-4 w-4" />}
          label="Tous les quartiers"
          value={selectedNeighborhood}
          options={neighborhoodOptions}
          onChange={setSelectedNeighborhood}
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={resetAllFilters}
            className="gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>
      {/* Mobile: city & neighborhood custom dropdowns */}
      <div className="md:hidden space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            icon={<Building2 className="h-4 w-4" />}
            label="Toutes les villes"
            value={selectedCity}
            options={cityOptions}
            onChange={handleCityChange}
          />
          <FilterDropdown
            icon={<MapPin className="h-4 w-4" />}
            label="Tous les quartiers"
            value={selectedNeighborhood}
            options={neighborhoodOptions}
            onChange={setSelectedNeighborhood}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={resetAllFilters}
            className="w-full gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <X className="h-4 w-4" />
            Réinitialiser les filtres
          </Button>
        )}
      </div>
      <RestaurantGrid
        search={searchQuery}
        selectedCuisines={selectedCuisines}
        selectedCity={selectedCity}
        selectedNeighborhood={selectedNeighborhood}
      />
    </div>
  )
}
