import { redirect } from "next/navigation"

export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string
) {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}
