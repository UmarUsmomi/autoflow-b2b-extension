import type { ScrapedRow } from "./types"

const CSV_COLUMNS = [
  "title",
  "phone",
  "email",
  "website",
  "price",
  "description",
  "imageUrl",
] as const

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim()
  return /[",;]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized
}

export function rowsToCsv(rows: readonly ScrapedRow[]): string {
  const header = CSV_COLUMNS.join(";")
  const body = rows.map((row) => CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(";"))
  return `\uFEFF${[header, ...body].join("\r\n")}`
}

export function rowsToJson(rows: readonly ScrapedRow[]): string {
  return JSON.stringify(rows, null, 2)
}

export function fileNameFor(format: "csv" | "json", now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `autoflow-leads-${stamp}.${format}`
}
