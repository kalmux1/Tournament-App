export function safeSubstring(str: string | null | undefined, start: number, end?: number): string {
  if (!str || typeof str !== "string") return ""
  return str.substring(start, end)
}

export function getInitials(nameOrEmail: string | null | undefined, fallback: string = "AD"): string {
  if (!nameOrEmail || typeof nameOrEmail !== "string") return fallback
  const clean
