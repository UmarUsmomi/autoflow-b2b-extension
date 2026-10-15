import type { ExtensionState } from "./types"

export const FREE_ACTION_LIMIT = 25
export const DEFAULT_LICENSE_ENDPOINT = ""
export const STORAGE_KEY = "autoflow_state"

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
}

export function createDefaultState(now: Date = new Date()): ExtensionState {
  return {
    quota: { period: currentPeriod(now), used: 0, limit: FREE_ACTION_LIMIT },
    license: { plan: "free", key: null, expiresAt: null },
    profiles: [],
    rows: [],
    webhookUrl: "",
    language: "ru",
  }
}
