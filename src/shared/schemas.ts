import { z } from "zod"
import { createDefaultState, FREE_ACTION_LIMIT } from "./constants"
import type { ExtensionState, LicenseValidation, Profile, ScrapedRow } from "./types"

export const ScrapedRowSchema = z.object({
  id: z.string().min(1),
  sourceUrl: z.string(),
  title: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  price: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  attributes: z.record(z.string(), z.string()),
})

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fields: z.record(z.string(), z.string()),
  updatedAt: z.string().datetime(),
})

const LicenseSchema = z.discriminatedUnion("plan", [
  z.object({ plan: z.literal("free"), key: z.null(), expiresAt: z.null() }),
  z.object({ plan: z.literal("pro"), key: z.string().min(1), expiresAt: z.string().datetime() }),
])

export const ExtensionStateSchema = z.object({
  quota: z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/),
    used: z.number().int().min(0),
    limit: z.number().int().min(FREE_ACTION_LIMIT),
  }),
  license: LicenseSchema,
  profiles: z.array(ProfileSchema),
  rows: z.array(ScrapedRowSchema),
  webhookUrl: z.string(),
  language: z.union([z.literal("ru"), z.literal("en")]),
})

export const LicenseValidationSchema = z.discriminatedUnion("valid", [
  z.object({ valid: z.literal(true), plan: z.literal("pro"), expiresAt: z.string().datetime(), key: z.string() }),
  z.object({ valid: z.literal(false), reason: z.string().min(1) }),
])

export function parseState(raw: unknown): ExtensionState {
  const parsed = ExtensionStateSchema.safeParse(raw)
  return parsed.success ? parsed.data : createDefaultState()
}

export function parseProfile(raw: unknown): Profile | null {
  const parsed = ProfileSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function parseRows(raw: unknown): readonly ScrapedRow[] {
  const parsed = z.array(ScrapedRowSchema).safeParse(raw)
  return parsed.success ? parsed.data : []
}

export function parseLicenseValidation(raw: unknown): LicenseValidation | null {
  const parsed = LicenseValidationSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
