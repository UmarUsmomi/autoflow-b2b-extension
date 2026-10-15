import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")

describe("Manifest V3 contract", () => {
  it("declares stable source entries and least-privilege permissions", () => {
    const manifest = JSON.parse(readFileSync(join(root, "public", "manifest.json"), "utf8"))

    expect(manifest.manifest_version).toBe(3)
    expect(manifest.background.service_worker).toBe("background.js")
    expect(manifest.action.default_popup).toBe("popup.html")
    expect(manifest.permissions).toEqual(expect.arrayContaining(["activeTab", "storage", "commands"]))
    expect(manifest.permissions).not.toContain("tabs")
    expect(manifest).not.toHaveProperty("browser_action")
    expect(manifest).not.toHaveProperty("background.scripts")
    expect(existsSync(join(root, "src", "background", "serviceWorker.ts"))).toBe(true)
    expect(existsSync(join(root, "src", "content", "contentScript.ts"))).toBe(true)
  })
})
