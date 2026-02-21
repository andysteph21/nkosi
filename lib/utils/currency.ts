export function sanitizeFcfaInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "")
  return Number.parseInt(digits || "0", 10)
}

export function formatFcfa(value: number): string {
  return `${value.toLocaleString("fr-FR")} F CFA`
}
