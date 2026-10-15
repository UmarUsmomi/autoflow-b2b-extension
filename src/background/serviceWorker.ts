import { createChromeTabMessenger, createLicenseClient, createWebhookClient } from "./adapters"
import { handleMessage, type RouterDependencies } from "./router"
import { createChromeStateStore } from "./storage"

function dependencies(): RouterDependencies {
  return {
    store: createChromeStateStore(),
    tabs: createChromeTabMessenger(),
    license: createLicenseClient(),
    webhook: createWebhookClient(),
  }
}

function registerServiceWorker(): void {
  const getDependencies = (): RouterDependencies => dependencies()

  const handleCommand = async (command: string): Promise<void> => {
    const currentDependencies = getDependencies()
    if (command === "scrape-page") {
      await handleMessage({ type: "SCRAPE_ACTIVE_TAB" }, currentDependencies)
      return
    }
    if (command === "autofill-page") {
      const state = await currentDependencies.store.get()
      const profile = [...state.profiles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
      if (profile) await handleMessage({ type: "AUTOFILL_ACTIVE_TAB", payload: { fields: profile.fields } }, currentDependencies)
    }
  }

  chrome.runtime.onInstalled.addListener(() => {
    void getDependencies().store.initialize()
  })

  chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
    void handleMessage(rawMessage, getDependencies()).then(sendResponse).catch((error: unknown) => {
      if (error instanceof Error) {
        sendResponse({ ok: false, error: error.message })
        return
      }
      sendResponse({ ok: false, error: "unexpected_error" })
    })
    return true
  })

  chrome.commands.onCommand.addListener((command) => {
    void handleCommand(command)
  })
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) registerServiceWorker()

export { registerServiceWorker }
