import { normalizeKey, normalizeText } from "./normalization"

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

export type AutofillResult = {
  readonly filled: number
  readonly skipped: readonly string[]
}

const FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = {
  name: ["name", "full name", "имя", "фио", "контактное лицо"],
  company: ["company", "organization", "компания", "организация", "юридическое лицо"],
  email: ["email", "e mail", "почта", "электронная почта"],
  phone: ["phone", "mobile", "телефон", "мобильный"],
  website: ["website", "site", "сайт", "веб сайт"],
  title: ["title", "product", "товар", "название", "наименование"],
  price: ["price", "cost", "цена", "стоимость"],
  address: ["address", "адрес", "location", "местоположение"],
}

function fieldLabel(field: FormField, document: Document): string {
  const placeholder = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.placeholder : ""
  const labels = Array.from(document.querySelectorAll("label"))
    .filter((label) => label.htmlFor === field.id || label.contains(field))
    .map((label) => label.textContent ?? "")
  const nearby = field.parentElement?.textContent ?? ""
  return normalizeText([
    field.name,
    field.id,
    placeholder,
    field.getAttribute("aria-label") ?? "",
    ...labels,
    nearby,
  ].join(" "))
}

function fieldScore(field: FormField, key: string, document: Document): number {
  const normalizedKey = normalizeKey(key)
  const label = normalizeKey(fieldLabel(field, document))
  if (!normalizedKey || !label) return 0
  if (label === normalizedKey || label.includes(normalizedKey)) return 100
  const aliases = FIELD_ALIASES[normalizedKey] ?? []
  return aliases.some((alias) => label.includes(normalizeKey(alias))) ? 80 : 0
}

function fieldsFor(document: Document): readonly FormField[] {
  return Array.from(document.querySelectorAll("input, select, textarea")).filter(
    (field): field is FormField => {
      if (field instanceof HTMLInputElement) {
        return !["hidden", "submit", "button", "reset", "file", "password"].includes(field.type) && !field.disabled
      }
      return (field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) && !field.disabled
    },
  )
}

function setNativeValue(field: FormField, value: string): void {
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    field.checked = ["true", "1", "yes", "on", "да"].includes(value.toLocaleLowerCase())
  } else {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")
    descriptor?.set?.call(field, value)
  }
  field.dispatchEvent(new Event("input", { bubbles: true }))
  field.dispatchEvent(new Event("change", { bubbles: true }))
  field.dispatchEvent(new Event("blur", { bubbles: true }))
}

function clearValidation(field: FormField): void {
  field.setCustomValidity("")
  field.removeAttribute("aria-invalid")
  field.classList.remove("error", "is-invalid", "field-error")
}

function markFilled(field: FormField): void {
  field.dataset["autoflowFilled"] = "true"
  field.style.outline = "2px solid #228653"
  field.style.outlineOffset = "2px"
  window.setTimeout(() => {
    delete field.dataset["autoflowFilled"]
    field.style.outline = ""
    field.style.outlineOffset = ""
  }, 1800)
}

export function autofillPage(document: Document, values: Readonly<Record<string, string>>): AutofillResult {
  const fields = fieldsFor(document)
  const used = new Set<FormField>()
  const skipped: string[] = []
  let filled = 0

  for (const [key, value] of Object.entries(values)) {
    const candidate = fields
      .filter((field) => !used.has(field))
      .map((field) => ({ field, score: fieldScore(field, key, document) }))
      .sort((left, right) => right.score - left.score)[0]
    if (!candidate || candidate.score === 0) {
      skipped.push(key)
      continue
    }
    setNativeValue(candidate.field, value)
    clearValidation(candidate.field)
    markFilled(candidate.field)
    used.add(candidate.field)
    filled += 1
  }

  return { filled, skipped }
}
