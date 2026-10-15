import type { ScrapedRow } from "../shared/types"
import {
  extractEmails,
  extractPhones,
  extractPrices,
  firstNonEmpty,
  normalizeText,
} from "./normalization"

const CARD_SELECTORS = [
  "article",
  "[role='article']",
  "[itemtype*='Product']",
  "[itemtype*='Organization']",
  "[class*='card' i]",
  "[class*='product' i]",
  "[class*='company' i]",
  "li",
] as const

type RowContext = {
  readonly element: Element
  readonly index: number
  readonly sourceUrl: string
}

function extractAttributes(element: Element): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {}
  for (const label of Array.from(element.querySelectorAll("dt"))) {
    const value = label.nextElementSibling
    if (!value) continue
    const name = normalizeText(label.textContent ?? "")
    const text = normalizeText(value.textContent ?? "")
    if (name && text) attributes[name] = text
  }
  return attributes
}

function linkValues(element: Element): readonly string[] {
  return Array.from(element.querySelectorAll("a"))
    .map((link) => link.getAttribute("href") ?? "")
    .filter((href) => href.length > 0)
}

function rowFromElement({ element, index, sourceUrl }: RowContext): ScrapedRow {
  const text = normalizeText(element.textContent ?? "")
  const heading = element.querySelector(
    "h1, h2, h3, h4, strong, [itemprop='name'], [class*='title' i], [class*='name' i]",
  )
  const links = linkValues(element)
  const emailLink = links.find((href) => href.toLocaleLowerCase().startsWith("mailto:"))
  const phoneLink = links.find((href) => href.toLocaleLowerCase().startsWith("tel:"))
  const websiteLink = links.find((href) => /^https?:/i.test(href))
  const emails = extractEmails(text)
  const phones = extractPhones(text)
  const prices = extractPrices(text)
  const image = element.querySelector("img")
  const description = element.querySelector("p")
  const title = firstNonEmpty([
    heading?.textContent ?? "",
    element.getAttribute("aria-label") ?? "",
    text.split(/[•|]/)[0] ?? "",
    `Item ${index + 1}`,
  ])

  return {
    id: `row-${index + 1}`,
    sourceUrl,
    title,
    phone: phoneLink?.replace(/^tel:/i, "") ?? phones[0] ?? "",
    email: emailLink?.replace(/^mailto:/i, "") ?? emails[0] ?? "",
    website: websiteLink ?? "",
    price: prices[0] ?? "",
    description: firstNonEmpty([description?.textContent ?? "", text]).slice(0, 500),
    imageUrl: image?.getAttribute("src") ?? "",
    attributes: extractAttributes(element),
  }
}

function tableRows(document: Document, sourceUrl: string): readonly ScrapedRow[] {
  const result: ScrapedRow[] = []
  for (const table of Array.from(document.querySelectorAll("table"))) {
    const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row.querySelectorAll("td").length > 0)
    const headerRow = table.querySelector("thead tr") ?? Array.from(table.querySelectorAll("tr")).find((row) => row.querySelectorAll("th").length > 0)
    const headers = headerRow ? Array.from(headerRow.querySelectorAll("th")).map((header) => normalizeText(header.textContent ?? "")) : []
    for (const [index, row] of rows.entries()) {
      const parsed = rowFromElement({ element: row, index, sourceUrl })
      const attributes: Record<string, string> = { ...parsed.attributes }
      Array.from(row.querySelectorAll("td")).forEach((cell, cellIndex) => {
        const header = headers[cellIndex]
        const value = normalizeText(cell.textContent ?? "")
        if (header && value) attributes[header] = value
      })
      result.push({ ...parsed, attributes })
    }
  }
  return result
}

function repeatedCards(document: Document): readonly Element[] {
  for (const selector of CARD_SELECTORS) {
    const candidates = Array.from(document.querySelectorAll(selector)).filter((element) => {
      const length = normalizeText(element.textContent ?? "").length
      return length >= 20 && length <= 1400
    })
    if (candidates.length >= 2) return candidates.slice(0, 100)
  }
  return []
}

function uniqueRows(rows: readonly ScrapedRow[]): readonly ScrapedRow[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = [row.title, row.email, row.phone, row.price].join("|").toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function scrapeElements(elements: readonly Element[], sourceUrl: string): readonly ScrapedRow[] {
  return uniqueRows(elements.map((element, index) => rowFromElement({ element, index, sourceUrl })))
}

export function scrapeDocument(document: Document, sourceUrl: string): readonly ScrapedRow[] {
  const tables = tableRows(document, sourceUrl)
  const cards = scrapeElements(repeatedCards(document), sourceUrl)
  const rows = uniqueRows([...tables, ...cards])
  if (rows.length > 0) return rows

  const bodyText = normalizeText(document.body?.textContent ?? "")
  const hasSignal = extractEmails(bodyText).length > 0 || extractPhones(bodyText).length > 0 || extractPrices(bodyText).length > 0
  return hasSignal ? scrapeElements([document.body ?? document.documentElement], sourceUrl) : []
}
