import { describe, expect, it } from "vitest"
import { createDefaultState } from "../src/shared/constants"
import { applyLicenseValidation, hasLicenseKeyShape } from "../src/shared/license"
import { reserveAction } from "../src/shared/quota"

describe("freemium quota and license activation", () => {
  it("allows exactly 25 free actions and rejects the next one", () => {
    const now = new Date("2026-02-15T10:00:00.000Z")
    let state = createDefaultState(now)
    for (let index = 0; index < 25; index += 1) {
      const decision = reserveAction(state, now)
      expect(decision.allowed).toBe(true)
      state = decision.state
    }

    const blocked = reserveAction(state, now)

    expect(state.quota.used).toBe(25)
    expect(blocked.allowed).toBe(false)
    if (!blocked.allowed) expect(blocked.reason).toBe("limit_reached")
  })

  it("resets a new month and unlocks Pro after a valid server response", () => {
    const state = createDefaultState(new Date("2026-02-15T10:00:00.000Z"))
    const rollover = reserveAction(state, new Date("2026-03-01T10:00:00.000Z"))
    const key = "AFB2B-PRO-eyJzdWIiOiJ0ZXN0In0.signature-signature"
    const activated = applyLicenseValidation(rollover.state, {
      valid: true,
      plan: "pro",
      key,
      expiresAt: "2027-03-01T00:00:00.000Z",
    })

    expect(rollover.state.quota.used).toBe(1)
    expect(activated?.license.plan).toBe("pro")
    expect(hasLicenseKeyShape(key)).toBe(true)
    if (activated) {
      const proDecision = reserveAction(activated, new Date("2026-03-01T10:00:00.000Z"))
      expect(proDecision.allowed).toBe(true)
      expect(proDecision.state.quota.used).toBe(1)
    }
  })
})
