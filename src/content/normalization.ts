export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function normalizeKey(value: string): string {
  return normalizeText(value)
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "")
}

export function firstNonEmpty(values: readonly string[]): string {
  return values.map(normalizeText).find((value) => value.length > 0) ?? ""
}

export function extractEmails(text: string): readonly string[] {
  return [...new Set(text.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [])]
}

export function extractPhones(text: string): readonly string[] {
  const values = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []
  return [...new Set(values.map(normalizeText))]
}

export function extractPrices(text: string): readonly string[] {
  const values = text.match(/(?:[$€£₽]|руб\.?|USD|EUR)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:[$€£₽]|руб\.?|USD|EUR)/gi) ?? []
  return [...new Set(values.map(normalizeText))]
}
