"use client"

import { Bell, ChevronDown, LogIn, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import { signOutAction } from "@/app/actions/auth"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const { profile } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "Invite"
  const canAccessAdmin = profile?.role === "admin" || profile?.role === "super_admin"

  useEffect(() => {
    async function loadUnread() {
      if (!profile || profile.role !== "restaurateur") return
      const supabase = createClient()
      const { count } = await supabase
        .from("notification")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("is_read", false)
      setUnreadCount(count ?? 0)
    }
    loadUnread()
  }, [profile])

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/nkosi-logo.png"
            alt="NKOSI"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          {profile?.role === "restaurateur" ? (
            <Button
              variant="secondary"
              size="icon"
              className="bg-primary-foreground/10 hover:bg-highlight hover:text-highlight-foreground text-primary-foreground border-0"
              asChild
            >
              <Link href="/my-restaurant" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}
          {!profile ? (
            <Button
              variant="secondary"
              asChild
              className="bg-primary-foreground/10 hover:bg-highlight hover:text-highlight-foreground text-primary-foreground border-0"
            >
              <Link href="/sign-in" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Connexion
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2 bg-primary-foreground/10 hover:bg-highlight hover:text-highlight-foreground text-primary-foreground border-0 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{fullName}</span>
                  <span className="sm:hidden">{profile.first_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Mon profil</Link>
                </DropdownMenuItem>
                {canAccessAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Tableau de Bord Admin</Link>
                  </DropdownMenuItem>
                ) : null}
                {profile.role === "restaurateur" ? (
                  <DropdownMenuItem asChild>
                    <Link href="/my-restaurant">Mon Restaurant</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOutAction} className="w-full">
                    <button className="w-full text-left text-destructive">Deconnexion</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
