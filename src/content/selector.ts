import { normalizeText } from "./normalization"

type HighlightState = {
  readonly outline: string
  readonly transition: string
  readonly boxShadow: string
}

function candidateFor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const candidate = target.closest("article, li, tr, [role='article'], [class*='card' i]")
  return candidate instanceof HTMLElement ? candidate : null
}

function isUsefulCandidate(element: HTMLElement): boolean {
  return normalizeText(element.textContent ?? "").length >= 20
}

function analogousCandidates(element: HTMLElement, document: Document): readonly HTMLElement[] {
  const classToken = Array.from(element.classList).find((token) => /card|product|company|listing|result/i.test(token))
  const sameClass = classToken
    ? Array.from(document.querySelectorAll(element.tagName.toLocaleLowerCase())).filter(
        (candidate): candidate is HTMLElement => candidate instanceof HTMLElement && candidate.classList.contains(classToken) && isUsefulCandidate(candidate),
      )
    : []
  if (sameClass.length >= 2) return sameClass

  const sameTag = element.parentElement
    ? Array.from(element.parentElement.children).filter(
        (candidate): candidate is HTMLElement => candidate instanceof HTMLElement && candidate.tagName === element.tagName && isUsefulCandidate(candidate),
      )
    : []
  return sameTag.length >= 2 ? sameTag : [element]
}

export function startVisualSelector(
  document: Document,
  onSelect: (elements: readonly HTMLElement[]) => void,
): () => void {
  const previous = new WeakMap<HTMLElement, HighlightState>()
  let active: HTMLElement | null = null

  const restore = (element: HTMLElement): void => {
    const state = previous.get(element)
    if (!state) return
    element.style.outline = state.outline
    element.style.transition = state.transition
    element.style.boxShadow = state.boxShadow
    previous.delete(element)
  }

  const highlight = (element: HTMLElement): void => {
    if (!previous.has(element)) {
      previous.set(element, {
        outline: element.style.outline,
        transition: element.style.transition,
        boxShadow: element.style.boxShadow,
      })
    }
    element.style.transition = "outline 120ms ease-out, box-shadow 120ms ease-out"
    element.style.outline = "2px solid #1477A8"
    element.style.boxShadow = "0 0 0 4px rgba(20,119,168,.15)"
  }

  const onPointerOver = (event: PointerEvent): void => {
    const candidate = candidateFor(event.target)
    if (!candidate || !isUsefulCandidate(candidate) || candidate === active) return
    if (active) restore(active)
    active = candidate
    highlight(candidate)
  }

  const onClick = (event: MouseEvent): void => {
    const candidate = candidateFor(event.target)
    if (!candidate || !isUsefulCandidate(candidate)) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(analogousCandidates(candidate, document))
  }

  document.addEventListener("pointerover", onPointerOver, true)
  document.addEventListener("click", onClick, true)

  return (): void => {
    document.removeEventListener("pointerover", onPointerOver, true)
    document.removeEventListener("click", onClick, true)
    if (active) restore(active)
    active = null
  }
}
