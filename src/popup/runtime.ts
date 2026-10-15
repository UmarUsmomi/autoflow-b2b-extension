import { failure, parseResponse } from "../shared/messages"
import type { Message, MessageResponse } from "../shared/messages"

export async function sendExtensionMessage(message: Message): Promise<MessageResponse> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return failure("extension_unavailable")
  const raw: unknown = await chrome.runtime.sendMessage(message)
  return parseResponse(raw) ?? failure("invalid_response")
}

export function downloadText(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
