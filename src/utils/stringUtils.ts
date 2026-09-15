export function safeSubstring(str: string | null | undefined, start: number, end?: number): string {
  if (!str || typeof str !== "string") return ""
  return str.substring(start, end)
}

export function getInitials(nameOrEmail: string | null | undefined, fallback: string = "AD"): string {
  if (!nameOrEmail || typeof nameOrEmail !== "string") return fallback
  const clean = nameOrEmail.trim()
  if (!clean) return fallback
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase()
  }
  return clean.substring(0, 2).toUpperCase()
}
