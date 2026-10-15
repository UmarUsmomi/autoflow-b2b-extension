import { parseLicenseValidation } from "../shared/schemas"
import type { Message } from "../shared/messages"

export class ActiveTabUnavailableError extends Error {
  readonly name = "ActiveTabUnavailableError"

  constructor() {
    super("active_tab_unavailable")
  }
}

export type TabMessenger = {
  readonly sendToActive: (message: Message) => Promise<unknown>
}

export function createChromeTabMessenger(): TabMessenger {
  return {
    sendToActive: async (message) => {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      const tab = tabs[0]
      if (!tab?.id) throw new ActiveTabUnavailableError()
      return chrome.tabs.sendMessage(tab.id, message)
    },
  }
}

export type LicenseClient = {
  readonly validate: (endpoint: string, key: string) => Promise<unknown>
}

export function createLicenseClient(): LicenseClient {
  return {
    validate: async (endpoint, key) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(10_000),
      })
      const raw: unknown = await response.json()
      return parseLicenseValidation(raw) ?? { valid: false, reason: `http_${response.status}` }
    },
  }
}

export type WebhookClient = {
  readonly send: (url: string, body: string) => Promise<{ readonly status: number }>
}

export function createWebhookClient(): WebhookClient {
  return {
    send: async (url, body) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      return { status: response.status }
    },
  }
}
