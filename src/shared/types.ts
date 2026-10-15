export const ACTIONS = {
  scrape: "scrape",
  autofill: "autofill",
  export: "export",
} as const

export type ActionKind = (typeof ACTIONS)[keyof typeof ACTIONS]

export type ScrapedRow = {
  readonly id: string
  readonly sourceUrl: string
  readonly title: string
  readonly phone: string
  readonly email: string
  readonly website: string
  readonly price: string
  readonly description: string
  readonly imageUrl: string
  readonly attributes: Readonly<Record<string, string>>
}

export type Profile = {
  readonly id: string
  readonly name: string
  readonly fields: Readonly<Record<string, string>>
  readonly updatedAt: string
}

export type LicenseState =
  | {
      readonly plan: "free"
      readonly key: null
      readonly expiresAt: null
    }
  | {
      readonly plan: "pro"
      readonly key: string
      readonly expiresAt: string
    }

export type QuotaState = {
  readonly period: string
  readonly used: number
  readonly limit: number
}

export type ExtensionState = {
  readonly quota: QuotaState
  readonly license: LicenseState
  readonly profiles: readonly Profile[]
  readonly rows: readonly ScrapedRow[]
  readonly webhookUrl: string
  readonly language: "ru" | "en"
}

export type QuotaDecision =
  | { readonly allowed: true; readonly state: ExtensionState }
  | { readonly allowed: false; readonly state: ExtensionState; readonly reason: "limit_reached" }

export type LicenseValidation =
  | { readonly valid: true; readonly plan: "pro"; readonly expiresAt: string; readonly key: string }
  | { readonly valid: false; readonly reason: string }
