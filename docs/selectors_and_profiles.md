# DOM selectors and profile mapping

## Scraping heuristic order

The content script intentionally uses generic signals so it can work across directories, maps, marketplaces, and internal catalogs without remote site code:

1. `table > tr` rows with at least one `td` are treated as structured records.
2. Repeated `article`, `role=article`, schema.org Product/Organization nodes, and class names containing `card`, `product`, or `company` are treated as card candidates.
3. Each candidate is normalized into title, contact, price, description, image, website, and `<dt>/<dd>` attributes.
4. Email, phone, and price values come from both semantic links (`mailto:`, `tel:`) and conservative text patterns.
5. Duplicate records are removed by a title/contact/price signature, and the result is capped at 100 candidates per action.

The parser never executes page content, uses `innerHTML`, or assumes a specific vendor DOM. Page-specific adapters can be added later as pure `Element -> ScrapedRow` functions without changing the message boundary.

## Visual selector

Selector mode attaches one capture-phase `pointerover` listener and one capture-phase `click` listener to the document. The nearest useful `article`, `li`, `tr`, role article, or card-like element is highlighted with an inline outline. The cleanup function restores the element's original outline, transition, and shadow and removes both listeners. Clicking a candidate prevents navigation and sends a `SELECTOR_ROWS` message to the service worker.

## Autofill matching

The mapper scores each available input, select, and textarea against a profile key. It considers `name`, `id`, `placeholder`, `aria-label`, associated `<label>` text, and the nearest parent text. Exact or substring matches win first; bilingual aliases cover name, company, email, phone, website, title, price, and address. Password, file, hidden, submit, and disabled fields are deliberately excluded.

Writes use the native `value` property setter for the concrete control prototype, then dispatch bubbling `input`, `change`, and `blur` events. This mirrors the observable sequence expected by React and Vue controlled fields. Before writing, custom validity, `aria-invalid`, and common invalid classes are cleared. Filled fields are marked with `data-autoflow-filled` and a temporary green outline; no form is submitted automatically.

Profile JSON is parsed at the popup boundary as a string-only record. Storage and message schemas use Zod before values enter the internal readonly domain types.
