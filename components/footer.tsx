import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/nkosi-logo.png"
              alt="NKOSI"
              width={80}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-primary-foreground/80">
              © 2026 - Tous droits réservés
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link 
              href="/terms" 
              className="text-primary-foreground/80 hover:text-highlight transition-colors"
            >
              Termes et Conditions
            </Link>
            <Link 
              href="/contact" 
              className="text-primary-foreground/80 hover:text-highlight transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
