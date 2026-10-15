import { contentFailure, contentOk, parseContentMessage } from "../shared/contentMessages"
import { scrapeDocument, scrapeElements } from "./scraper"
import { autofillPage } from "./autofillEngine"
import { startVisualSelector } from "./selector"

function registerContentScript(): void {
  chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
    const message = parseContentMessage(rawMessage)
    if (!message) {
      sendResponse(contentFailure("invalid_message"))
      return false
    }

    switch (message.type) {
      case "SCRAPE_PAGE":
        sendResponse(contentOk({ kind: "rows", rows: scrapeDocument(document, location.href) }))
        return false
      case "AUTOFILL_PAGE":
        sendResponse(contentOk({ kind: "autofill", ...autofillPage(document, message.payload.fields) }))
        return false
      case "START_SELECTOR":
        startVisualSelector(document, (elements) => {
          const rows = scrapeElements(elements, location.href)
          void chrome.runtime.sendMessage({ type: "SELECTOR_ROWS", payload: { rows } })
        })
        sendResponse(contentOk({ kind: "selector_started" }))
        return false
      default:
        sendResponse(contentFailure("unsupported_content_message"))
        return false
    }
  })
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) registerContentScript()

export { registerContentScript }
