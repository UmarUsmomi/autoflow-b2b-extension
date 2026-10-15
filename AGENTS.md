# AutoFlow B2B Copilot — Autonomous Engineering Rules

## 1. Scope and operating mode

- This repository builds a Chrome Extension Manifest V3 product with a small license service.
- Work autonomously through implementation, tests, build, packaging, and GitHub publication.
- Do not ask for confirmation between phases. Ask only when a missing credential or an irreversible external choice blocks the requested outcome.
- Preserve unrelated work and never copy secrets, tokens, cookies, private logs, or absolute machine paths into the repository.

## 2. Reproducibility contract

- The supported runtime is the version in `.nvmrc`; use the project's local npm dependencies only.
- Keep `package-lock.json` committed and keep every build dependency in `package.json`.
- `Dockerfile` must install the server dependencies and run the license worker without relying on global packages.
- `.env.example` documents required configuration without real values.
- `npm run test` is the offline test command. It must not call production services.
- `npm run typecheck` and `npm run build` are required before a milestone is considered working.
- Run the smallest meaningful check after each code change, then run the full gate before committing.

## 3. Context and editing discipline

- Read targeted files only; do not dump the whole repository into context.
- Keep service boundaries documented in `docs/architecture.md` and update that document when message contracts change.
- Keep DOM extraction and field-mapping heuristics documented near their implementation and covered by JSDOM tests.
- Prefer small, reversible patches. If a patch context is stale, re-read the file before retrying.
- Keep modules focused; split a file before it becomes difficult to review.

## 4. TypeScript and MV3 rules

- TypeScript is strict: no `any`, no `@ts-ignore`, no non-null assertions, and type-only imports use `import type`.
- Parse user/API input at boundaries, use readonly domain types internally, and handle discriminated unions exhaustively.
- Chrome APIs are accessed through typed adapters so pure domain logic remains testable in Node/JSDOM.
- Background state belongs in `chrome.storage.local`; do not rely on persistent service-worker globals.
- Content-script styles are isolated and all injected listeners have cleanup paths.
- No remotely hosted code is loaded by the extension.

## 5. Self-verification loop

After every implementation milestone, run the relevant tests. Before a commit, run:

```text
npm run test
npm run typecheck
npm run build
```

If a test, typecheck, or build fails, inspect the first actionable error, fix the root cause, and rerun the failed command. Do not mark a check as passed unless it actually ran successfully.

## 6. Git and release rules

- Use conventional commits (`feat:`, `fix:`, `test:`, `ci:`, `docs:`, `chore:`).
- Commit only verified, intentional files after each working milestone.
- Never force-push `main` or `master`.
- Use GitHub CLI for repository creation and publication. If `gh auth status` fails, report the exact blocker and leave the local repository ready.
- Release archives contain `dist/` only and must not contain `.env` files or private credentials.
