import { applyLicenseValidation } from "../shared/license"
import { fileNameFor, rowsToCsv, rowsToJson } from "../shared/export"
import { failure, ok, parseMessage } from "../shared/messages"
import { parseLicenseValidation, ScrapedRowSchema } from "../shared/schemas"
import { reserveAction } from "../shared/quota"
import { isValidWebhookUrl, sendRowsToWebhook } from "../shared/webhook"
import type { ExtensionState, Profile, ScrapedRow } from "../shared/types"
import type { MessageResponse } from "../shared/messages"
import { ActiveTabUnavailableError, type LicenseClient, type TabMessenger, type WebhookClient } from "./adapters"
import type { StateStore } from "./storage"

export type RouterDependencies = {
  readonly store: StateStore
  readonly tabs: TabMessenger
  readonly license: LicenseClient
  readonly webhook: WebhookClient
  readonly now?: () => Date
}

function currentTime(dependencies: RouterDependencies): Date {
  return dependencies.now?.() ?? new Date()
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null
}

function appendRows(state: ExtensionState, rows: readonly ScrapedRow[]): ExtensionState {
  const existing = new Map(state.rows.map((row) => [row.id, row]))
  for (const row of rows) existing.set(row.id, row)
  return { ...state, rows: [...existing.values()] }
}

function rowResponse(raw: unknown): readonly ScrapedRow[] | null {
  if (!isRecord(raw)) return null
  const record = raw
  const data = record["data"]
  if (record["ok"] !== true || !isRecord(data)) return null
  const dataRecord = data
  if (dataRecord["kind"] !== "rows") return null
  const rows = dataRecord["rows"]
  if (!Array.isArray(rows)) return null
  return rows.flatMap((row) => {
    const parsed = ScrapedRowSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

async function reserve(dependencies: RouterDependencies): Promise<ExtensionState | null> {
  const state = await dependencies.store.get()
  const decision = reserveAction(state, currentTime(dependencies))
  if (!decision.allowed) return null
  await dependencies.store.set(decision.state)
  return decision.state
}

async function handleScrape(dependencies: RouterDependencies): Promise<MessageResponse> {
  const state = await reserve(dependencies)
  if (!state) return failure("free_limit_reached")
  const response = await dependencies.tabs.sendToActive({ type: "SCRAPE_PAGE" })
  const rows = rowResponse(response)
  if (!rows) return failure("scrape_failed")
  const nextState = appendRows(state, rows)
  await dependencies.store.set(nextState)
  return ok({ kind: "state", state: nextState })
}

async function handleAutofill(
  dependencies: RouterDependencies,
  fields: Readonly<Record<string, string>>,
): Promise<MessageResponse> {
  const state = await reserve(dependencies)
  if (!state) return failure("free_limit_reached")
  const response = await dependencies.tabs.sendToActive({ type: "AUTOFILL_PAGE", payload: { fields } })
  if (!isRecord(response)) return failure("autofill_failed")
  const record = response
  const data = record["data"]
  if (record["ok"] !== true || !isRecord(data)) return failure("autofill_failed")
  const dataRecord = data
  const filled = dataRecord["filled"]
  const skipped = dataRecord["skipped"]
  return typeof filled === "number" && Array.isArray(skipped)
    ? ok({ kind: "autofill", filled, skipped: skipped.filter((item): item is string => typeof item === "string") })
    : failure("autofill_failed")
}

function profileWithTimestamp(profile: Profile, now: Date): Profile {
  return { ...profile, updatedAt: now.toISOString() }
}

export async function handleMessage(rawMessage: unknown, dependencies: RouterDependencies) {
  const message = parseMessage(rawMessage)
  if (!message) return failure("invalid_message")

  try {
    switch (message.type) {
      case "GET_STATE":
        return ok({ kind: "state", state: await dependencies.store.get() })
      case "SCRAPE_ACTIVE_TAB":
        return await handleScrape(dependencies)
      case "START_SELECTOR": {
        const state = await reserve(dependencies)
        if (!state) return failure("free_limit_reached")
        await dependencies.tabs.sendToActive({ type: "START_SELECTOR" })
        return ok({ kind: "selector_started" })
      }
      case "AUTOFILL_ACTIVE_TAB":
        return await handleAutofill(dependencies, message.payload.fields)
      case "SAVE_PROFILE": {
        const state = await dependencies.store.get()
        const profile = profileWithTimestamp(message.payload, currentTime(dependencies))
        const profiles = [...state.profiles.filter((item) => item.id !== profile.id), profile]
        await dependencies.store.set({ ...state, profiles })
        return ok({ kind: "saved", profile })
      }
      case "DELETE_PROFILE": {
        const state = await dependencies.store.get()
        await dependencies.store.set({
          ...state,
          profiles: state.profiles.filter((profile) => profile.id !== message.payload.id),
        })
        return ok({ kind: "state", state: await dependencies.store.get() })
      }
      case "RESET_ROWS": {
        const state = await dependencies.store.get()
        const nextState = { ...state, rows: [] }
        await dependencies.store.set(nextState)
        return ok({ kind: "state", state: nextState })
      }
      case "EXPORT_ROWS": {
        const state = await dependencies.store.get()
        const content = message.payload.format === "csv" ? rowsToCsv(state.rows) : rowsToJson(state.rows)
        return ok({
          kind: "export",
          content,
          fileName: fileNameFor(message.payload.format, currentTime(dependencies)),
          mimeType: message.payload.format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
        })
      }
      case "SEND_WEBHOOK": {
        if (!isValidWebhookUrl(message.payload.url)) return failure("invalid_webhook_url")
        const result = await sendRowsToWebhook(message.payload.url, message.payload.rows, dependencies.webhook.send)
        const state = await dependencies.store.get()
        await dependencies.store.set({ ...state, webhookUrl: message.payload.url })
        return result.ok ? ok({ kind: "webhook", delivered: true }) : failure(result.reason)
      }
      case "ACTIVATE_LICENSE": {
        if (!message.payload.endpoint || !message.payload.key) return failure("license_input_required")
        const validation = parseLicenseValidation(await dependencies.license.validate(message.payload.endpoint, message.payload.key))
        if (!validation || !validation.valid) return failure(validation?.reason ?? "license_invalid")
        const state = await dependencies.store.get()
        const nextState = applyLicenseValidation(state, validation)
        if (!nextState) return failure("license_invalid")
        await dependencies.store.set(nextState)
        return ok({ kind: "license", state: nextState })
      }
      case "SET_LANGUAGE": {
        const state = await dependencies.store.get()
        const nextState = { ...state, language: message.payload.language }
        await dependencies.store.set(nextState)
        return ok({ kind: "state", state: nextState })
      }
      case "SELECTOR_ROWS": {
        const state = await dependencies.store.get()
        const nextState = appendRows(state, message.payload.rows)
        await dependencies.store.set(nextState)
        return ok({ kind: "state", state: nextState })
      }
      case "SCRAPE_PAGE":
      case "AUTOFILL_PAGE":
        return failure("content_message_only")
      default:
        return failure("unsupported_message")
    }
  } catch (error) {
    if (error instanceof ActiveTabUnavailableError) return failure(error.message)
    if (error instanceof Error) return failure(error.message)
    throw error
  }
}
