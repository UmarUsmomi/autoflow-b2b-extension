import { z } from "zod"
import { ExtensionStateSchema, ProfileSchema, ScrapedRowSchema } from "./schemas"
import type { ExtensionState, Profile, ScrapedRow } from "./types"

const RowListSchema = z.array(ScrapedRowSchema)

export const MessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_STATE") }),
  z.object({ type: z.literal("SCRAPE_ACTIVE_TAB") }),
  z.object({ type: z.literal("START_SELECTOR") }),
  z.object({
    type: z.literal("AUTOFILL_ACTIVE_TAB"),
    payload: z.object({ fields: z.record(z.string(), z.string()) }),
  }),
  z.object({ type: z.literal("SAVE_PROFILE"), payload: ProfileSchema }),
  z.object({ type: z.literal("DELETE_PROFILE"), payload: z.object({ id: z.string().min(1) }) }),
  z.object({ type: z.literal("RESET_ROWS") }),
  z.object({
    type: z.literal("EXPORT_ROWS"),
    payload: z.object({ format: z.union([z.literal("csv"), z.literal("json")]) }),
  }),
  z.object({
    type: z.literal("SEND_WEBHOOK"),
    payload: z.object({ url: z.string(), rows: RowListSchema }),
  }),
  z.object({
    type: z.literal("ACTIVATE_LICENSE"),
    payload: z.object({ key: z.string(), endpoint: z.string() }),
  }),
  z.object({ type: z.literal("SET_LANGUAGE"), payload: z.object({ language: z.union([z.literal("ru"), z.literal("en")]) }) }),
  z.object({ type: z.literal("SCRAPE_PAGE") }),
  z.object({
    type: z.literal("AUTOFILL_PAGE"),
    payload: z.object({ fields: z.record(z.string(), z.string()) }),
  }),
  z.object({
    type: z.literal("SELECTOR_ROWS"),
    payload: z.object({ rows: RowListSchema }),
  }),
])

export type Message = z.infer<typeof MessageSchema>

export type MessageResponse =
  | { readonly ok: true; readonly data: MessageData }
  | { readonly ok: false; readonly error: string }

export type MessageData =
  | { readonly kind: "state"; readonly state: ExtensionState }
  | { readonly kind: "rows"; readonly rows: readonly ScrapedRow[] }
  | { readonly kind: "selector_started" }
  | { readonly kind: "autofill"; readonly filled: number; readonly skipped: readonly string[] }
  | { readonly kind: "saved"; readonly profile: Profile }
  | { readonly kind: "export"; readonly content: string; readonly fileName: string; readonly mimeType: string }
  | { readonly kind: "webhook"; readonly delivered: boolean }
  | { readonly kind: "license"; readonly state: ExtensionState }

const MessageDataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("state"), state: ExtensionStateSchema }),
  z.object({ kind: z.literal("rows"), rows: RowListSchema }),
  z.object({ kind: z.literal("selector_started") }),
  z.object({ kind: z.literal("autofill"), filled: z.number().int().min(0), skipped: z.array(z.string()) }),
  z.object({ kind: z.literal("saved"), profile: ProfileSchema }),
  z.object({ kind: z.literal("export"), content: z.string(), fileName: z.string(), mimeType: z.string() }),
  z.object({ kind: z.literal("webhook"), delivered: z.boolean() }),
  z.object({ kind: z.literal("license"), state: ExtensionStateSchema }),
])

export const MessageResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: MessageDataSchema }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
])

export function parseMessage(raw: unknown): Message | null {
  const parsed = MessageSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function parseResponse(raw: unknown): MessageResponse | null {
  const parsed = MessageResponseSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function ok(data: MessageData): MessageResponse {
  return { ok: true, data }
}

export function failure(error: string): MessageResponse {
  return { ok: false, error }
}
