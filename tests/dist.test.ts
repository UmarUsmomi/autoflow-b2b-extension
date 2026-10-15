import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const dist = resolve(import.meta.dirname, "..", "dist")

describe("built extension contract", () => {
  it("contains every manifest-referenced file and no private environment files", () => {
    expect(existsSync(join(dist, "manifest.json"))).toBe(true)
    const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"))
    const references = [manifest.background.service_worker, manifest.action.default_popup, manifest.side_panel.default_path]
    for (const script of manifest.content_scripts) references.push(...script.js, ...(script.css ?? []))

    for (const reference of references) {
      expect(typeof reference).toBe("string")
      expect(reference).not.toContain("..")
      expect(existsSync(join(dist, reference))).toBe(true)
    }

    expect(existsSync(join(dist, ".env"))).toBe(false)
    expect(existsSync(join(dist, "private.key"))).toBe(false)
    expect(readFileSync(join(dist, "background.js"), "utf8")).not.toContain("http://")
  })
})
