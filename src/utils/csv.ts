/**
 * Minimal, dependency-free CSV helpers.
 * - Handles commas, quotes, newlines in values (RFC 4180 escaping).
 * - Prepends a UTF-8 BOM so Excel on Windows renders accented chars correctly.
 * - Numbers, booleans, and null/undefined are converted sensibly.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeCell).join(","))
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","))
  }
  return lines.join("\r\n")
}

export function downloadCSV(filename: string, csv: string): void {
  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`
  // \ufeff = UTF-8 BOM — makes Excel detect UTF-8 automatically.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Timestamp slug for filenames: "2026-09-27_1432". */
export function fileStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`
}