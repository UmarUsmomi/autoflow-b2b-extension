// @vitest-environment node
import { z } from "zod"
import { describe, expect, it } from "vitest"
import app from "../server/license-worker"

const bindings = {
  LICENSE_HMAC_SECRET: "test-license-secret-which-is-long-enough",
  LICENSE_ADMIN_SECRET: "test-admin-secret",
  ALLOWED_ORIGINS: "chrome-extension://test",
}

describe("license worker", () => {
  it("activates a paid webhook and validates the generated key", async () => {
    const issueResponse = await app.fetch(
      new Request("http://worker.test/v1/webhooks/payment", {
        method: "POST",
        headers: { "content-type": "application/json", "X-License-Admin": bindings.LICENSE_ADMIN_SECRET },
        body: JSON.stringify({
          provider: "stripe",
          externalId: "checkout-001",
          customerEmail: "buyer@example.test",
          expiresAt: "2027-03-01T00:00:00.000Z",
        }),
      }),
      bindings,
    )
    const issueBody: unknown = await issueResponse.json()
    const issue = z.object({ key: z.string(), activated: z.literal(true) }).safeParse(issueBody)
    expect(issueResponse.status).toBe(200)
    expect(issue.success).toBe(true)
    if (!issue.success) return

    const validateResponse = await app.fetch(
      new Request("http://worker.test/v1/licenses/validate", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "chrome-extension://test" },
        body: JSON.stringify({ key: issue.data.key }),
      }),
      bindings,
    )
    const validateBody: unknown = await validateResponse.json()

    expect(validateResponse.status).toBe(200)
    expect(validateBody).toMatchObject({ valid: true, plan: "pro", key: issue.data.key })
  })

  it("rejects payment webhooks without the admin secret", async () => {
    const response = await app.fetch(
      new Request("http://worker.test/v1/webhooks/payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "telegram", externalId: "checkout-002", customerEmail: "buyer@example.test" }),
      }),
      bindings,
    )

    expect(response.status).toBe(401)
  })
})
