import Image from "next/image"

export function HeroBanner() {
  return (
    <div className="relative h-64 md:h-80 overflow-hidden">
      <Image
        src="/images/image.jpg"
        alt="Délicieux plats africains"
        fill
        className="object-cover object-center"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3 text-balance">
          Savourez l&apos;Afrique
        </h2>
        <p className="text-primary-foreground/90 text-lg md:text-xl max-w-xl text-balance">
          Découvrez les saveurs authentiques de la cuisine africaine près de chez vous
        </p>
      </div>
    </div>
  )
}
