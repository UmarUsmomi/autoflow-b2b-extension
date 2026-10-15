# AutoFlow B2B Copilot Design System

## 0. Research Log

- Embedded refs: shortlisted `aside.md` (AI browser/product frame), `linear.app.md` (precise operational SaaS), and `airtable.md` (structured data); picked `taste-skill.md` + `aside.md` because this is a browser-product command surface that must feel useful before it feels decorative.
- Lazyweb: skipped — the product brief did not name a live reference URL, and the extension UI is a local popup rather than a marketing page.
- Imagen drafts: skipped — no image generation tool is available or needed for a compact utility popup; the focal object is the live preview table.
- Primitive showcase: the popup's reusable controls are exercised through the empty, populated, error, and Pro states in the real UI; the visual QA capture is documented in the README.

## 1. Atmosphere & Identity

AutoFlow feels like a bright browser instrument: calm white workspace, graphite typography, a pale sky-blue signal for the current workflow, and dense but readable data preview. Its signature is the **three-step command rail** — a single row that always makes the next action, quota, and outcome legible without opening another page.

## 2. Color

### Palette

| Role | Token | Light | Dark fallback | Usage |
|------|-------|-------|---------------|-------|
| Canvas | `--surface-canvas` | `#F7F9FB` | `#101419` | Popup background |
| Surface | `--surface-primary` | `#FFFFFF` | `#171D23` | Cards and panels |
| Raised | `--surface-raised` | `#F1F4F7` | `#202832` | Preview header, controls |
| Ink | `--ink-primary` | `#11161C` | `#F8FAFC` | Headings and values |
| Muted ink | `--ink-secondary` | `#5C6875` | `#B1BBC6` | Supporting copy |
| Quiet ink | `--ink-tertiary` | `#8D98A5` | `#7F8B97` | Metadata and disabled text |
| Hairline | `--line-subtle` | `rgba(17,22,28,.10)` | `rgba(248,250,252,.12)` | Structure and separators |
| Signal | `--signal-sky` | `#DFF3FF` | `#153448` | Selection wash and status |
| Signal strong | `--signal-ink` | `#1477A8` | `#71C7EF` | Links, active action |
| Success | `--status-success` | `#228653` | `#72D59D` | Filled fields, ready states |
| Warning | `--status-warning` | `#A96516` | `#E8B46E` | Quota caution |
| Error | `--status-error` | `#B94747` | `#F19A9A` | Validation and failures |

Accent is reserved for the action currently most likely to be taken. Selected tabs use a tonal wash and a glyph, never a colored edge.

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Usage |
|------|------|--------|-------------|-------|
| Display | 24px | 650 | 1.1 | Popup title |
| H2 | 18px | 650 | 1.2 | Panel titles |
| H3 | 15px | 600 | 1.3 | Card titles |
| Body | 14px | 400 | 1.5 | Main copy and controls |
| Small | 12px | 500 | 1.35 | Metadata, quota, hints |
| Mono | 12px | 500 | 1.4 | CSV preview, key status |

### Font Stack

- Primary: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

## 4. Spacing & Layout

### Base Unit

All spacing derives from a 4px base. The popup uses 8px page padding, 12px card padding, 16px panel gaps, and 24px section rhythm.

### Grid and scroll ownership

- Default popup width: 420px; minimum readable width: 320px.
- Main shell: fixed header plus one `.scroll-body` owner with `min-height: 0` and `overflow: auto`.
- Preview table: its own horizontal scroll owner only when columns exceed the popup width.
- Content grids use `repeat(auto-fit, minmax(min(14rem, 100%), 1fr))` to avoid narrow-device overflow.

## 5. Components

### Command rail

- Structure: brand mark, current task label, quota chip, language toggle.
- Variants: default, Pro, warning quota.
- States: hover, active, focus-visible, disabled; selected state is a tonal wash plus check glyph.
- Accessibility: semantic buttons, visible focus, `aria-pressed` for language and tabs.
- Motion: 150ms transform/opacity feedback; reduced motion uses a cross-fade.
- Layout: fixed header in the scroll shell.

### Workflow tab

- Structure: `nav` with four task buttons.
- Variants: scraper, autofill, templates, export, Pro.
- States: default, hover, selected, focus-visible, disabled.
- Accessibility: tablist semantics are avoided for simpler popup keyboard behavior; buttons have explicit labels.
- Motion: 200ms tonal transition only.

### Surface card

- Structure: section header, helper copy, controls, outcome region.
- Variants: neutral, signal, error, success.
- States: default, loading, empty, populated, error.
- Accessibility: heading hierarchy and labeled controls.
- Layout: stack; card content must tolerate long URLs and empty rows.

### Data preview

- Structure: row count summary, scrollable table, row actions.
- Variants: empty, populated, selected.
- States: loading, empty, populated, export-ready, error.
- Accessibility: table headers, keyboard-safe action buttons, text alternatives for images.
- Layout: one horizontal scroll owner; vertical scrolling belongs to the popup shell.

### Primary action

- Structure: icon + concise label.
- Variants: dark ink, signal, quiet.
- States: hover, active, focus-visible, disabled, loading, success, error.
- Accessibility: minimum 40px hit target and contrast above WCAG AA.
- Motion: 150ms transform/opacity; pressed state scales to 0.98.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 120ms | ease-out | Press and hover |
| Standard | 200ms | ease-in-out | Tab and card state |
| Emphasis | 450ms | cubic-bezier(.16,1,.3,1) | First result reveal |

Only transform, opacity, filter, and color/background transitions animate. `prefers-reduced-motion` removes positional movement but preserves visible state changes.

## 7. Depth & Surface

Strategy: **mixed**. Structural separation uses hairlines; raised preview and popover surfaces use a tinted shadow `0 12px 32px rgba(17,22,28,.10)` plus a one-pixel highlight. Rounded controls use 8px radius, cards 12px, full-width status chips 999px. Nested corners subtract the containing padding.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target.
- Body text stays at or above 12px in the compact popup and 14px for readable copy.
- Every action is keyboard reachable with a visible focus ring.
- Data never relies on color alone; status includes text or an icon.
- Reduced motion and forced-colors modes preserve functional meaning.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| Full screenshot matrix for Chrome side panel | `tests/` | Headless extension loading is not available in the offline unit gate | Release QA: run Chrome manual checklist before Web Store upload |
