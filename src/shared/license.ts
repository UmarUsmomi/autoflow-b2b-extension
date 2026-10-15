import { parseLicenseValidation } from "./schemas"
import type { ExtensionState, LicenseValidation } from "./types"

const LICENSE_KEY_PATTERN = /^AFB2B-PRO-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{16,}$/

export function hasLicenseKeyShape(value: string): boolean {
  return LICENSE_KEY_PATTERN.test(value.trim())
}

export function applyLicenseValidation(
  state: ExtensionState,
  rawValidation: unknown,
): ExtensionState | null {
  const validation = parseLicenseValidation(rawValidation)
  if (!validation || !validation.valid || validation.plan !== "pro") return null
  return {
    ...state,
    license: {
      plan: "pro",
      key: validation.key,
      expiresAt: validation.expiresAt,
    },
  }
}

export function parseLicenseValidationResult(raw: unknown): LicenseValidation | null {
  return parseLicenseValidation(raw)
}
