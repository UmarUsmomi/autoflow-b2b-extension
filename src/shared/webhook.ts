export function isValidWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.hostname === "localhost"
  } catch (error) {
    if (error instanceof TypeError) return false
    throw error
  }
}

export type WebhookTransport = (url: string, body: string) => Promise<{ readonly status: number }>

export async function sendRowsToWebhook(
  url: string,
  rows: readonly unknown[],
  transport: WebhookTransport,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  if (!isValidWebhookUrl(url)) return { ok: false, reason: "invalid_url" }
  const response = await transport(url, JSON.stringify({ rows, sentAt: new Date().toISOString() }))
  return response.status >= 200 && response.status < 300
    ? { ok: true }
    : { ok: false, reason: `http_${response.status}` }
}
