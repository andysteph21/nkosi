import { redirect } from "next/navigation"

export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string
): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}
