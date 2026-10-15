import { createDefaultState, STORAGE_KEY } from "../shared/constants"
import { parseState } from "../shared/schemas"
import type { ExtensionState } from "../shared/types"

export type StateStore = {
  readonly get: () => Promise<ExtensionState>
  readonly set: (state: ExtensionState) => Promise<void>
  readonly initialize: () => Promise<void>
}

export function createChromeStateStore(): StateStore {
  return {
    get: async () => {
      const values = await chrome.storage.local.get(STORAGE_KEY)
      return parseState(values[STORAGE_KEY])
    },
    set: async (state) => {
      await chrome.storage.local.set({ [STORAGE_KEY]: state })
    },
    initialize: async () => {
      const values = await chrome.storage.local.get(STORAGE_KEY)
      if (values[STORAGE_KEY] === undefined) await chrome.storage.local.set({ [STORAGE_KEY]: createDefaultState() })
    },
  }
}
