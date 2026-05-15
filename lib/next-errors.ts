/**
 * Next.js uses thrown errors as control-flow signals during rendering:
 *
 *   - `NEXT_REDIRECT`         → result of calling `redirect()`
 *   - `NEXT_NOT_FOUND`        → result of calling `notFound()`
 *   - `DYNAMIC_SERVER_USAGE`  → thrown when a static render touches
 *                               `cookies()`, `headers()`, `searchParams`,
 *                               etc., so Next can re-mark the route dynamic
 *
 * Any defensive `try/catch` around server-side data fetching MUST let these
 * propagate, otherwise:
 *   - `redirect()` / `notFound()` silently no-op
 *   - dynamic-detection breaks and the route is incorrectly prerendered as
 *     static, with `cookies()` returning empty values at build time
 *
 * Errors thrown by Next carry a `digest` string; that's the cheap way to
 * detect them without depending on Next's private exports.
 */
export function isNextInternalError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const digest = (err as { digest?: unknown }).digest
  if (typeof digest !== "string") return false
  return (
    digest.startsWith("NEXT_") ||
    digest === "DYNAMIC_SERVER_USAGE"
  )
}
