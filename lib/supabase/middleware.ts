import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const ADMIN_ROLES = new Set(["admin", "super_admin"])

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicPath =
    path === "/" ||
    path.startsWith("/restaurant/") ||
    path.startsWith("/contact") ||
    path.startsWith("/terms")

  const isAuthPath = path.startsWith("/sign-in") || path.startsWith("/sign-up")
  const isAdminPath = path.startsWith("/admin")
  const isMyRestaurantPath = path.startsWith("/my-restaurant")
  const isProfilePath = path.startsWith("/profile")
  const isCreateRestaurantPath = path.startsWith("/create-restaurant")
  const isFirstSetupPath = path.startsWith("/first-setup")

  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!user && (isAdminPath || isMyRestaurantPath || isProfilePath || isCreateRestaurantPath || isFirstSetupPath)) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (!user || isPublicPath) {
    return response
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("role,is_active,must_change_password")
    .eq("user_id", user.id)
    .single()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (profile.must_change_password && !isFirstSetupPath && path !== "/auth/callback") {
    return NextResponse.redirect(new URL("/first-setup", request.url))
  }

  if (isAdminPath && !ADMIN_ROLES.has(profile.role)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isMyRestaurantPath && profile.role !== "restaurateur") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isCreateRestaurantPath && profile.role !== "restaurateur") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}
