# AutoFlow B2B Copilot

AutoFlow B2B Copilot is a Manifest V3 Chrome extension for small businesses, agencies, and marketplace sellers. It combines a practical lead scraper, form autofill, local data export, CRM/Webhook delivery, and a 25-action Free plan with an activation-ready Pro license service.

## Product flow

1. Open a directory, company catalog, marketplace listing, or internal form.
2. Click the AutoFlow action and choose **Сбор данных / Collect data**.
3. Scrape the page or pick one representative card. The preview is stored locally in `chrome.storage.local`.
4. Switch to **Автозаполнение / Autofill**, paste a JSON profile, and run it explicitly. React/Vue fields receive native `input`, `change`, and `blur` events. Forms are never submitted.
5. Save reusable templates, download Excel-compatible UTF-8 BOM CSV/JSON, or send rows to an HTTPS Webhook.
6. Activate a signed Pro key from the **Pro-доступ / Pro access** screen when the Free quota is exhausted.

## Repository layout

- `src/content/` — DOM scraper, visual selector, and controlled-form autofill engine.
- `src/background/` — storage-backed MV3 service worker, task queue, message router, quota and webhook adapters.
- `src/popup/` — bilingual React UI for the popup and side panel.
- `src/shared/` — Zod boundary schemas, message contracts, quota, license, CSV, and Webhook logic.
- `server/license-worker.ts` — Hono/Cloudflare-compatible license and payment-webhook worker.
- `server/node.ts` — small Node adapter for local development and Docker.
- `tests/` — offline Vitest/JSDOM tests plus manifest, `dist/`, and server contract checks.
- `docs/architecture.md` — service boundaries and message protocol.
- `docs/selectors_and_profiles.md` — DOM extraction and autofill heuristics.

## Requirements

- Node.js `24.14.0` from `.nvmrc`.
- npm 11+.
- Chrome or Chromium for manual extension testing.
- Docker is optional locally; the Dockerfile is validated by CI on Linux.

## Setup

```bash
nvm use
npm ci
```

If `nvm` is not available, install Node `24.14.0` directly and verify `node --version` before running the commands below. Dependencies are local to this project; no global package is required.

## Checks and build

The complete offline test command builds the extension first so the `dist/` contract test observes the actual bundle:

```bash
npm run test
npm run typecheck
npm run build
npm run package
```

Equivalent Make targets are available: `make test`, `make typecheck`, `make build`, and `make package`. `npm run build` emits the extension to `dist/` and compiles the license service to `server-dist/`. `npm run package` creates `autoflow-b2b-extension.zip` with `dist/` contents at the archive root.

## Load the extension in Chrome right now

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose the repository's `dist` folder.
5. Pin **AutoFlow B2B Copilot** in the toolbar.
6. Open the company-directory fixture or any page containing repeated cards and contacts.
7. Click the extension, select **Сбор данных**, then click **Собрать страницу**.
8. For selector mode, click **Выбрать карточку**, hover a card, and click it. The selected record appears in the preview.
9. Open a form, switch to **Автозаполнение**, paste a profile such as `{ "name": "Elena Petrova", "email": "elena@example.test" }`, and click **Заполнить форму**.
10. Use **Экспорт** to download CSV/JSON. Chrome's download will contain a local file only; no page data leaves the browser unless a Webhook is explicitly sent.

The keyboard shortcuts in the manifest are `Alt+Shift+S` for a scrape and `Alt+Shift+F` for the latest saved profile. Chrome may require choosing a non-conflicting shortcut in `chrome://extensions/shortcuts`.

## License service and monetization

The worker uses signed, self-contained keys so the first deployment does not need a database. Production deployments should add durable idempotency records for payment event IDs and a provider signature check before issuing keys.

```bash
cp .env.example .env
npm run build:server
npm run server
```

The local service listens on `http://localhost:8787` by default:

- `GET /health`
- `POST /v1/licenses/validate` with `{ "key": "AFB2B-PRO-..." }`
- `POST /v1/webhooks/payment` with the `X-License-Admin` secret and `{ "provider": "stripe", "externalId": "...", "customerEmail": "buyer@example.com" }`

Supported webhook provider labels are `stripe`, `lemonsqueezy`, and `telegram`. The worker returns the generated key; the payment system should store that key against the customer and send it through the product's email, dashboard, or bot. Set `ALLOWED_ORIGINS` to the extension origin after Chrome assigns its production ID. Never put HMAC or admin secrets into the extension bundle.

### Docker

```bash
```

## CI and GitHub release

`.github/workflows/ci-release.yml` runs `npm ci`, type checking, the offline test suite, the full build, and ZIP packaging on pushes and pull requests. It uploads the ZIP as a workflow artifact. Pushing a `v*` tag also creates a GitHub Release with the validated `autoflow-b2b-extension.zip` asset.

This is a GitHub Release package, not an automatic Chrome Web Store submission. Web Store publication should be a separate protected step after the extension ID, publisher account, review assets, and rollback policy are configured.

## Commercial niches

- Local business directories and map-based prospecting.
- B2B distributors and wholesale catalogs.
- Marketplace seller research and product-card collection.
- Real-estate and automotive dealer inventories.
- Recruitment agency candidate databases.
- Event, conference, and vendor directories.
- Logistics, freight, and procurement lead lists.
- Agency onboarding forms and repetitive CRM entry.
- Franchise, clinic, and service-location catalogs.

## Privacy and safety

The extension asks for `activeTab`, `scripting`, `storage`, `commands`, and `sidePanel` only. Scraped data is local by default. Webhook delivery is user-triggered and requires an HTTPS URL or localhost during development. Autofill skips passwords and file controls, clears field validation state, and never submits forms. Page text is treated as untrusted input and is never executed.

## License

The code is provided as the AutoFlow B2B Copilot product baseline. Add your commercial license and Chrome Web Store legal pages before selling it under a company name.
