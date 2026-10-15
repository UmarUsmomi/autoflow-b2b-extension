import { describe, expect, it } from "vitest"
import { startVisualSelector } from "../src/content/selector"

describe("startVisualSelector", () => {
  it("highlights a card and returns the analogous repeated cards", () => {
    document.body.innerHTML = `
      <div class="grid">
        <article class="company-card"><h2>North Star</h2><p>One long company description.</p></article>
        <article class="company-card"><h2>Atlas Group</h2><p>Another long company description.</p></article>
      </div>
    `
    const first = document.querySelector<HTMLElement>(".company-card")
    if (!first) throw new Error("selector_fixture_missing")
    let selectedCount = 0
    const stop = startVisualSelector(document, (elements) => { selectedCount = elements.length })
    const text = first.querySelector("h2")
    if (!text) throw new Error("selector_text_missing")

    text.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }))
    expect(first.style.outline).toContain("solid")
    text.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))

    expect(selectedCount).toBe(2)
    stop()
    expect(first.style.outline).toBe("")
  })
})
