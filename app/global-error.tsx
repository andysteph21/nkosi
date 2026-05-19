"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

// Root-level error boundary. Renders ONLY when the root layout itself
// crashes (e.g. `getProfile()` throws, `ensureSuperAdminBootstrapped`
// blows up). When that happens the providers, fonts and global CSS from
// the root layout are all unavailable — so this file must be entirely
// self-contained and ship its own <html> / <body>.
//
// We use inline styles so it works even when Tailwind / globals.css
// failed to load.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app/global-error]", error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#1f2937",
          background: "#fafaf9",
        }}
      >
        <main role="alert" aria-live="assertive" style={{ maxWidth: 520 }}>
          <AlertTriangle
            aria-hidden="true"
            style={{ width: 48, height: 48, color: "#b91c1c", margin: "0 auto" }}
          />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1rem" }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            L&apos;application n&apos;a pas pu démarrer. Veuillez réessayer dans
            quelques instants.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
              Référence&nbsp;:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </code>
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: "none",
                borderRadius: 9999,
                padding: "0.5rem 1.25rem",
                background: "#2f5f2f",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                borderRadius: 9999,
                padding: "0.5rem 1.25rem",
                background: "white",
                color: "#1f2937",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: "1px solid #e5e7eb",
                textDecoration: "none",
              }}
            >
              Retour à l&apos;accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
