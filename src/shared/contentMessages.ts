import type { ScrapedRow } from "./types"

export type ContentMessage =
  | { readonly type: "SCRAPE_PAGE" }
  | { readonly type: "START_SELECTOR" }
  | { readonly type: "AUTOFILL_PAGE"; readonly payload: { readonly fields: Readonly<Record<string, string>> } }

export type ContentData =
  | { readonly kind: "rows"; readonly rows: readonly ScrapedRow[] }
  | { readonly kind: "selector_started" }
  | { readonly kind: "autofill"; readonly filled: number; readonly skipped: readonly string[] }

export type ContentResponse = { readonly ok: true; readonly data: ContentData } | { readonly ok: false; readonly error: string }

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string")
}

export function parseContentMessage(raw: unknown): ContentMessage | null {
  if (!isRecord(raw) || typeof raw["type"] !== "string") return null
  switch (raw["type"]) {
    case "SCRAPE_PAGE":
      return { type: "SCRAPE_PAGE" }
    case "START_SELECTOR":
      return { type: "START_SELECTOR" }
    case "AUTOFILL_PAGE": {
      const payload = raw["payload"]
      if (!isRecord(payload) || !isStringRecord(payload["fields"])) return null
      return { type: "AUTOFILL_PAGE", payload: { fields: payload["fields"] } }
    }
    default:
      return null
  }
}

export function contentOk(data: ContentData): ContentResponse {
  return { ok: true, data }
}

export function contentFailure(error: string): ContentResponse {
  return { ok: false, error }
}
