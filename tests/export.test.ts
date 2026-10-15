import { describe, expect, it } from "vitest"
import { fileNameFor, rowsToCsv, rowsToJson } from "../src/shared/export"
import type { ScrapedRow } from "../src/shared/types"

const row: ScrapedRow = {
  id: "row-1",
  sourceUrl: "https://catalog.test",
  title: "Widget, Pro",
  phone: "+7 900 111 22 33",
  email: "sales@widget.test",
  website: "https://widget.test",
  price: "₽ 1 990",
  description: "Fast; reliable\nfor stores",
  imageUrl: "https://widget.test/image.jpg",
  attributes: { material: "steel" },
}

describe("exports", () => {
  it("writes Excel-compatible UTF-8 BOM CSV with escaped delimiters", () => {
    const csv = rowsToCsv([row])
    expect(csv.startsWith("\uFEFFtitle;phone;email")).toBe(true)
    expect(csv).toContain('"Widget, Pro"')
    expect(csv).toContain('"Fast; reliable for stores"')
  })

  it("writes readable JSON and deterministic date-based names", () => {
    expect(JSON.parse(rowsToJson([row]))).toEqual([row])
    expect(fileNameFor("csv", new Date("2026-03-08T12:00:00.000Z"))).toBe("autoflow-leads-2026-03-08.csv")
  })
})
