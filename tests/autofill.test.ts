import { describe, expect, it } from "vitest"
import { autofillPage } from "../src/content/autofillEngine"

describe("autofillPage", () => {
  it("fills controlled-style fields, dispatches events, and clears validation state", () => {
    document.body.innerHTML = `
      <form>
        <label for="contact-name">Full name</label>
        <input id="contact-name" name="contactName" value="old" />
        <label for="contact-email">Email</label>
        <input id="contact-email" name="contactEmail" aria-invalid="true" class="is-invalid" value="old@example.test" />
        <label for="contact-phone">Телефон</label>
        <input id="contact-phone" name="contactPhone" value="000" />
        <label for="segment">Customer segment</label>
        <select id="segment" name="segment"><option value="retail">Retail</option><option value="b2b">B2B</option></select>
      </form>
    `
    const email = document.querySelector<HTMLInputElement>("#contact-email")
    if (!email) throw new Error("email_fixture_missing")
    email.setCustomValidity("invalid")
    let inputEvents = 0
    let changeEvents = 0
    let blurEvents = 0
    document.querySelectorAll("input, select").forEach((field) => {
      field.addEventListener("input", () => { inputEvents += 1 })
      field.addEventListener("change", () => { changeEvents += 1 })
      field.addEventListener("blur", () => { blurEvents += 1 })
    })

    const result = autofillPage(document, {
      name: "Elena Petrova",
      email: "elena@example.test",
      phone: "+7 900 123 45 67",
      segment: "b2b",
    })

    expect(result.filled).toBe(4)
    expect(result.skipped).toEqual([])
    expect(document.querySelector<HTMLInputElement>("#contact-name")?.value).toBe("Elena Petrova")
    expect(email.value).toBe("elena@example.test")
    expect(email.validity.customError).toBe(false)
    expect(email.getAttribute("aria-invalid")).toBeNull()
    expect(email.classList.contains("is-invalid")).toBe(false)
    expect(email.dataset["autoflowFilled"]).toBe("true")
    expect(inputEvents).toBe(4)
    expect(changeEvents).toBe(4)
    expect(blurEvents).toBe(4)
  })

  it("handles a field added after the first render and reports unmatched profile keys", () => {
    document.body.innerHTML = `<label for="company">Company</label><input id="company" />`
    const first = autofillPage(document, { company: "Acme", missing: "value" })
    const dynamic = document.createElement("input")
    dynamic.name = "email"
    document.body.append(dynamic)

    const second = autofillPage(document, { email: "team@acme.test" })

    expect(first.filled).toBe(1)
    expect(first.skipped).toEqual(["missing"])
    expect(second.filled).toBe(1)
    expect(dynamic.value).toBe("team@acme.test")
  })
})
