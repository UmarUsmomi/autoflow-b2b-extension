import { describe, expect, it } from "vitest"
import { scrapeDocument } from "../src/content/scraper"

describe("scrapeDocument", () => {
  it("extracts company cards with contact details", () => {
    document.body.innerHTML = `
      <main>
        <article class="company-card">
          <h2>North Star Logistics</h2>
          <p>Freight forwarding for regional retailers.</p>
          <a href="mailto:hello@northstar.test">hello@northstar.test</a>
          <a href="tel:+7 900 111 22 33">Call us</a>
          <a href="https://northstar.test">Website</a>
        </article>
        <article class="company-card">
          <h2>Atlas Retail Group</h2>
          <p>Wholesale sourcing and fulfilment.</p>
          <span>+7 (900) 444-55-66</span>
          <span>sales@atlas.test</span>
        </article>
      </main>
    `

    const rows = scrapeDocument(document, "https://directory.test/companies")

    expect(rows).toHaveLength(2)
    expect(rows[0]?.title).toBe("North Star Logistics")
    expect(rows[0]?.email).toBe("hello@northstar.test")
    expect(rows[0]?.phone).toBe("+7 900 111 22 33")
    expect(rows[0]?.website).toBe("https://northstar.test")
    expect(rows[1]?.title).toBe("Atlas Retail Group")
    expect(rows[1]?.email).toBe("sales@atlas.test")
  })

  it("extracts product table rows and normalizes price data", () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Product</th><th>Price</th><th>Spec</th></tr></thead>
        <tbody>
          <tr><td><strong>Compact POS Terminal</strong></td><td>₽ 18 990</td><td>Wi-Fi · 8GB</td></tr>
          <tr><td><strong>Barcode Scanner</strong></td><td>€49.90</td><td>USB-C</td></tr>
        </tbody>
      </table>
    `

    const rows = scrapeDocument(document, "https://catalog.test/products")

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.title)).toEqual(["Compact POS Terminal", "Barcode Scanner"])
    expect(rows.map((row) => row.price)).toEqual(["₽ 18 990", "€49.90"])
    expect(rows[0]?.sourceUrl).toBe("https://catalog.test/products")
  })
})
