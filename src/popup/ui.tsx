import type { ReactNode } from "react"
import { AlertTriangle, Check, LoaderCircle } from "lucide-react"

export function Surface({ children, tone = "default" }: { readonly children: ReactNode; readonly tone?: "default" | "signal" | "error" }): ReactNode {
  return <section className={`af-card af-card-${tone}`}>{children}</section>
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
  type = "button",
}: {
  readonly children: ReactNode
  readonly onClick?: () => void
  readonly disabled?: boolean
  readonly loading?: boolean
  readonly variant?: "primary" | "quiet" | "signal"
  readonly type?: "button" | "submit"
}): ReactNode {
  return (
    <button className={`af-button af-button-${variant}`} type={type} onClick={onClick} disabled={disabled || loading}>
      {loading ? <LoaderCircle aria-hidden="true" className="af-icon af-spin" size={15} /> : null}
      {children}
    </button>
  )
}

export function StatusNotice({ message, kind }: { readonly message: string; readonly kind: "success" | "error" }): ReactNode {
  return (
    <div className={`af-notice af-notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {kind === "error" ? <AlertTriangle aria-hidden="true" size={15} /> : <Check aria-hidden="true" size={15} />}
      <span>{message}</span>
    </div>
  )
}
