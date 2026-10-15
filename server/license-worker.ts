import { Hono } from "hono"
import { cors } from "hono/cors"
import { z } from "zod"

export type LicenseBindings = {
  readonly LICENSE_HMAC_SECRET: string
  readonly LICENSE_ADMIN_SECRET: string
  readonly ALLOWED_ORIGINS?: string
}

const LicensePayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  plan: z.literal("pro"),
  expiresAt: z.string().datetime(),
  nonce: z.string().min(8),
})

const ValidateSchema = z.object({ key: z.string().min(1) })
const PaymentWebhookSchema = z.object({
  provider: z.union([z.literal("stripe"), z.literal("lemonsqueezy"), z.literal("telegram")]),
  externalId: z.string().min(1),
  customerEmail: z.string().email(),
  expiresAt: z.string().datetime().optional(),
})

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const normalized = padded.padEnd(Math.ceil(padded.length / 4) * 4, "=")
  const binary = atob(normalized)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

async function issueLicense(email: string, expiresAt: string, secret: string): Promise<string> {
  const payload = {
    sub: email,
    email,
    plan: "pro" as const,
    expiresAt,
    nonce: crypto.randomUUID(),
  }
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  return `AFB2B-PRO-${encoded}.${await sign(secret, encoded)}`
}

async function verifyLicense(key: string, secret: string): Promise<z.infer<typeof LicensePayloadSchema> | null> {
  const match = /^AFB2B-PRO-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(key.trim())
  const encoded = match?.[1]
  const signature = match?.[2]
  if (!encoded || !signature) return null
  const expected = await sign(secret, encoded)
  if (expected !== signature) return null
  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)))
    const parsed = LicensePayloadSchema.safeParse(payload)
    if (!parsed.success || new Date(parsed.data.expiresAt).getTime() <= Date.now()) return null
    return parsed.data
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) return null
    throw error
  }
}

function allowedOrigins(bindings: LicenseBindings): readonly string[] {
  return (bindings.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean)
}

export const app = new Hono<{ Bindings: LicenseBindings }>()

app.use(
  "*",
  cors({
    origin: (origin, context) => {
      const allowed = allowedOrigins(context.env)
      return allowed.includes(origin) ? origin : ""
    },
    allowHeaders: ["Content-Type", "X-License-Admin"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
)

app.get("/health", (context) => context.json({ status: "ok", service: "autoflow-license-worker" }))

app.post("/v1/licenses/validate", async (context) => {
  const body: unknown = await context.req.json()
  const parsed = ValidateSchema.safeParse(body)
  if (!parsed.success) return context.json({ valid: false, reason: "invalid_request" }, 400)
  const payload = await verifyLicense(parsed.data.key, context.env.LICENSE_HMAC_SECRET)
  if (!payload) return context.json({ valid: false, reason: "license_invalid_or_expired" }, 401)
  return context.json({ valid: true, plan: "pro", expiresAt: payload.expiresAt, key: parsed.data.key })
})

app.post("/v1/webhooks/payment", async (context) => {
  if (context.req.header("X-License-Admin") !== context.env.LICENSE_ADMIN_SECRET) {
    return context.json({ error: "unauthorized" }, 401)
  }
  const body: unknown = await context.req.json()
  const parsed = PaymentWebhookSchema.safeParse(body)
  if (!parsed.success) return context.json({ error: "invalid_request" }, 400)
  const expiresAt = parsed.data.expiresAt ?? new Date(Date.now() + 31_536_000_000).toISOString()
  const key = await issueLicense(parsed.data.customerEmail, expiresAt, context.env.LICENSE_HMAC_SECRET)
  return context.json({ activated: true, provider: parsed.data.provider, externalId: parsed.data.externalId, key, expiresAt })
})

export default app
