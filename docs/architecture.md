# AutoFlow B2B Copilot Architecture

## Runtime topology

```text
┌───────────────────────────── Web page ─────────────────────────────┐
│  Content script (isolated DOM adapter)                             │
│  • scraper heuristics      • visual selector                       │
│  • form autofill           • page-side highlight styles             │
└───────────────┬────────────────────────────────────────────────────┘
                │ chrome.runtime.sendMessage / tabs.sendMessage
┌───────────────▼────────────────────────────────────────────────────┐
│ Background service worker                                           │
│  • storage-backed state       • task queue                          │
│  • quota/license decisions     • commands and keyboard shortcuts    │
│  • webhook dispatch adapter    • side-panel/popup message router     │
└───────────────┬────────────────────────────────────────────────────┘
                │ chrome.storage.local / runtime messages
┌───────────────▼────────────────────────────────────────────────────┐
│ Popup / Side Panel React UI                                         │
│  • bilingual workflow tabs    • preview and export controls         │
│  • templates/profile editor   • webhook and license settings         │
└────────────────────────────────────────────────────────────────────┘

Optional payment provider webhook ─────► license worker ─────► license key state
```

## Responsibilities

### Content script

`src/content/contentScript.ts` is the only page-facing entry point. It receives typed commands, queries the active document, and returns serializable results. The pure modules in `src/content/` do not know about Chrome APIs. Scraping starts with semantic tables/lists, then falls back to repeated card-like containers and contact/price patterns. The selector mode uses one delegated pointer listener, highlights the hovered candidate, and resolves an analogous repeated container set after the user clicks.

Autofill matches an input/select/textarea against normalized `name`, `id`, `placeholder`, `aria-label`, associated label text, and nearby text. It writes through the native prototype setter and dispatches `input`, `change`, and `blur` so React/Vue controlled fields observe the update. Filled fields receive a temporary green outline with cleanup.

### Background service worker

`src/background/serviceWorker.ts` is event-driven. It does not hold business state in module globals. The storage adapter persists quota counters, license metadata, profiles, recent rows, and queued tasks in `chrome.storage.local`. Every metered action asks the quota service for a reservation before sending work to a tab. The queue is intentionally small and serializable so Chrome can restart the worker safely.

### Popup / side panel UI

The React UI sends commands to the worker and renders the last known state. It never reaches into page DOM directly. CSV export is generated locally with UTF-8 BOM; JSON and Excel-compatible CSV remain downloadable without a backend. Webhook delivery is an explicit user action and is disabled until a valid HTTPS URL is configured.

### License worker

`server/license-worker.ts` is Cloudflare Workers-compatible TypeScript. It validates request shape, verifies an HMAC-signed license payload, supports idempotent payment webhook activation, and exposes `GET /health` plus `POST /v1/licenses/validate` and `POST /v1/webhooks/payment`. Stripe, Lemon Squeezy, and Telegram payment adapters can map their event payload to the stable internal activation contract without putting provider secrets in the extension.

## Message contract

Messages use a discriminated `type` field and are defined in `src/shared/messages.ts`. Each request returns `{ ok: true, data }` or `{ ok: false, error }`. Boundary parsing rejects unknown messages. The main commands are:

- `SCRAPE_PAGE` — parse the active tab and return preview rows.
- `START_SELECTOR` — enter visual selector mode in the active tab.
- `AUTOFILL_PAGE` — apply a profile or row to the active form.
- `GET_STATE` / `SAVE_PROFILE` — read or persist extension state.
- `RESERVE_ACTION` — atomically enforce the free quota or Pro license.
- `EXPORT_ROWS` / `SEND_WEBHOOK` — perform local export or explicit delivery.
- `ACTIVATE_LICENSE` — validate and persist a Pro key.
- `SELECTOR_ROWS` — receive the row selected by the visual selector and merge it into the local preview.

## Security and privacy boundaries

- The extension requests only `activeTab`, `scripting`, `storage`, `commands`, and `sidePanel` permissions.
- Host permissions are not required for the bundled page action; `activeTab` grants access after a user action.
- Scraped data stays local until the user chooses a download or webhook action.
- License keys are stored locally and never logged. The license worker returns short-lived validation metadata, not payment secrets.
- Webhook URLs are validated as HTTPS at the UI and worker boundaries. Production deployments should add an allowlist and provider signature verification before accepting live payment events.

## Build output

Vite emits a self-contained `dist/` directory containing `manifest.json`, the popup HTML/CSS/JS, background worker bundle, content-script bundle, icons, and the extension metadata needed by `chrome://extensions`. The CI workflow zips `dist/` as `autoflow-b2b-extension.zip`.
