import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileDown,
  Globe2,
  LayoutTemplate,
  ListFilter,
  ScanSearch,
  ShieldCheck,
  Trash2,
  WandSparkles,
  Webhook,
} from "lucide-react"
import { createDefaultState, DEFAULT_LICENSE_ENDPOINT } from "../shared/constants"
import { hasLicenseKeyShape } from "../shared/license"
import type { Message, MessageResponse } from "../shared/messages"
import { type ExtensionState, type Profile } from "../shared/types"
import { ActionButton, StatusNotice, Surface } from "./ui"
import { COPY, type Language } from "./copy"
import { downloadText, sendExtensionMessage } from "./runtime"

type View = "collect" | "autofill" | "profiles" | "export" | "pro"

const DEFAULT_FIELDS = JSON.stringify(
  { name: "", company: "", email: "", phone: "", website: "" },
  null,
  2,
)

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null
}

function parseJsonFields(value: string): Readonly<Record<string, string>> | null {
  try {
    const raw: unknown = JSON.parse(value)
    if (!isRecord(raw)) return null
    const entries = Object.entries(raw)
    const fields: Record<string, string> = {}
    for (const [key, item] of entries) {
      if (typeof item !== "string") return null
      fields[key] = item
    }
    return fields
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

function resultMessage(response: MessageResponse, copy: ReturnType<typeof getCopy>): { readonly kind: "success" | "error"; readonly text: string } {
  if (!response.ok) return { kind: "error", text: `${copy.error}: ${response.error}` }
  return { kind: "success", text: copy.success }
}

function getCopy(language: Language) {
  return COPY[language]
}

function latestProfile(state: ExtensionState): Profile | undefined {
  return [...state.profiles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
}

export function App(): ReactNode {
  const [state, setState] = useState<ExtensionState>(() => createDefaultState())
  const [view, setView] = useState<View>("collect")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ readonly kind: "success" | "error"; readonly text: string } | null>(null)
  const [fieldsJson, setFieldsJson] = useState(DEFAULT_FIELDS)
  const [profileName, setProfileName] = useState("")
  const [selectedProfile, setSelectedProfile] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [licenseKey, setLicenseKey] = useState("")
  const [licenseEndpoint, setLicenseEndpoint] = useState(DEFAULT_LICENSE_ENDPOINT)
  const copy = getCopy(state.language)

  useEffect(() => {
    void sendExtensionMessage({ type: "GET_STATE" }).then((response) => {
      if (response.ok && response.data.kind === "state") {
        setState(response.data.state)
        setWebhookUrl(response.data.state.webhookUrl)
        const profile = latestProfile(response.data.state)
        if (profile) setFieldsJson(JSON.stringify(profile.fields, null, 2))
      }
    })
  }, [])

  const run = async (message: Message): Promise<MessageResponse> => {
    setBusy(true)
    setNotice(null)
    try {
      return await sendExtensionMessage(message)
    } finally {
      setBusy(false)
    }
  }

  const applyResponse = (response: MessageResponse): void => {
    if (response.ok && (response.data.kind === "state" || response.data.kind === "license")) {
      setState(response.data.state)
    }
    setNotice(resultMessage(response, copy))
  }

  const scrape = async (): Promise<void> => applyResponse(await run({ type: "SCRAPE_ACTIVE_TAB" }))
  const selectCard = async (): Promise<void> => applyResponse(await run({ type: "START_SELECTOR" }))

  const autofill = async (): Promise<void> => {
    const fields = parseJsonFields(fieldsJson)
    if (!fields) {
      setNotice({ kind: "error", text: `${copy.error}: JSON` })
      return
    }
    const response = await run({ type: "AUTOFILL_ACTIVE_TAB", payload: { fields } })
    if (response.ok && response.data.kind === "autofill") {
      setNotice({ kind: "success", text: `${copy.success}: ${response.data.filled}` })
      return
    }
    setNotice(resultMessage(response, copy))
  }

  const saveProfile = async (): Promise<void> => {
    const fields = parseJsonFields(fieldsJson)
    if (!fields || profileName.trim().length < 2) {
      setNotice({ kind: "error", text: `${copy.error}: ${copy.profileName}` })
      return
    }
    const profile: Profile = {
      id: selectedProfile || `profile-${Date.now()}`,
      name: profileName.trim(),
      fields,
      updatedAt: new Date().toISOString(),
    }
    const response = await run({ type: "SAVE_PROFILE", payload: profile })
    if (response.ok && response.data.kind === "saved") {
      const nextState = { ...state, profiles: [...state.profiles.filter((item) => item.id !== profile.id), response.data.profile] }
      setState(nextState)
      setSelectedProfile(profile.id)
      setNotice({ kind: "success", text: copy.success })
      return
    }
    setNotice(resultMessage(response, copy))
  }

  const loadProfile = (id: string): void => {
    const profile = state.profiles.find((item) => item.id === id)
    setSelectedProfile(id)
    if (profile) {
      setProfileName(profile.name)
      setFieldsJson(JSON.stringify(profile.fields, null, 2))
    }
  }

  const deleteProfile = async (id: string): Promise<void> => {
    const response = await run({ type: "DELETE_PROFILE", payload: { id } })
    applyResponse(response)
    if (response.ok && response.data.kind === "state") setState(response.data.state)
  }

  const exportRows = async (format: "csv" | "json"): Promise<void> => {
    const response = await run({ type: "EXPORT_ROWS", payload: { format } })
    if (response.ok && response.data.kind === "export") {
      downloadText(response.data.content, response.data.fileName, response.data.mimeType)
      setNotice({ kind: "success", text: copy.success })
      return
    }
    setNotice(resultMessage(response, copy))
  }

  const sendWebhook = async (): Promise<void> => {
    const response = await run({ type: "SEND_WEBHOOK", payload: { url: webhookUrl, rows: [...state.rows] } })
    applyResponse(response)
  }

  const activate = async (): Promise<void> => {
    if (!hasLicenseKeyShape(licenseKey)) {
      setNotice({ kind: "error", text: `${copy.error}: ${copy.licenseKey}` })
      return
    }
    applyResponse(await run({ type: "ACTIVATE_LICENSE", payload: { key: licenseKey, endpoint: licenseEndpoint } }))
  }

  const setLanguage = async (language: Language): Promise<void> => {
    const response = await run({ type: "SET_LANGUAGE", payload: { language } })
    if (response.ok && response.data.kind === "state") setState(response.data.state)
  }

  const quotaText = useMemo(() => {
    if (state.license.plan === "pro") return "PRO"
    return `${state.quota.used}/${state.quota.limit}`
  }, [state.license.plan, state.quota.limit, state.quota.used])

  return (
    <div className="af-shell">
      <header className="af-header">
        <div className="af-brand">
          <div className="af-mark"><BriefcaseBusiness aria-hidden="true" size={16} /></div>
          <div><div className="af-eyebrow">{copy.eyebrow}</div><strong>{copy.product}</strong></div>
        </div>
        <div className="af-header-actions">
          <span className={`af-quota ${state.license.plan === "pro" ? "af-quota-pro" : ""}`}><ShieldCheck aria-hidden="true" size={13} />{quotaText}</span>
          <div className="af-language" aria-label={copy.language}>
            <button type="button" aria-pressed={state.language === "ru"} onClick={() => void setLanguage("ru")}>RU</button>
            <button type="button" aria-pressed={state.language === "en"} onClick={() => void setLanguage("en")}>EN</button>
          </div>
        </div>
      </header>
      <div className="af-body">
        <div className="af-intro"><div className="af-eyebrow">{copy.ready}</div><p>{copy.subtitle}</p></div>
        <nav className="af-nav" aria-label={copy.product}>
          {([
            ["collect", ListFilter, copy.collect],
            ["autofill", WandSparkles, copy.autofill],
            ["profiles", LayoutTemplate, copy.profiles],
            ["export", FileDown, copy.export],
            ["pro", ShieldCheck, copy.pro],
          ] as const).map(([key, Icon, label]) => <button key={key} type="button" className={view === key ? "is-selected" : ""} aria-pressed={view === key} onClick={() => setView(key)}><Icon aria-hidden="true" size={15} />{label}</button>)}
        </nav>
        {view === "collect" ? <CollectView copy={copy} rows={state.rows} busy={busy} onScrape={() => void scrape()} onSelect={() => void selectCard()} /> : null}
        {view === "autofill" ? <AutofillView copy={copy} fieldsJson={fieldsJson} onFieldsChange={setFieldsJson} busy={busy} onAutofill={() => void autofill()} /> : null}
        {view === "profiles" ? <ProfilesView copy={copy} profiles={state.profiles} selected={selectedProfile} name={profileName} fieldsJson={fieldsJson} onSelect={loadProfile} onName={setProfileName} onFields={setFieldsJson} onSave={() => void saveProfile()} onDelete={(id) => void deleteProfile(id)} busy={busy} /> : null}
        {view === "export" ? <ExportView copy={copy} rows={state.rows} webhookUrl={webhookUrl} onWebhookUrl={setWebhookUrl} onExport={(format) => void exportRows(format)} onWebhook={() => void sendWebhook()} busy={busy} /> : null}
        {view === "pro" ? <ProView copy={copy} state={state} licenseKey={licenseKey} endpoint={licenseEndpoint} onKey={setLicenseKey} onEndpoint={setLicenseEndpoint} onActivate={() => void activate()} busy={busy} /> : null}
        {notice ? <StatusNotice message={notice.text} kind={notice.kind} /> : null}
      </div>
    </div>
  )
}

type Copy = ReturnType<typeof getCopy>

function CollectView({ copy, rows, busy, onScrape, onSelect }: { readonly copy: Copy; readonly rows: ExtensionState["rows"]; readonly busy: boolean; readonly onScrape: () => void; readonly onSelect: () => void }) {
  return <><Surface tone="signal"><div className="af-section-heading"><div><div className="af-icon-badge"><ScanSearch aria-hidden="true" size={17} /></div><h1>{copy.collectTitle}</h1><p>{copy.collectBody}</p></div><span className="af-count">{rows.length} {copy.rows}</span></div><div className="af-actions"><ActionButton onClick={onScrape} loading={busy}><ScanSearch aria-hidden="true" size={15} />{copy.scrape}</ActionButton><ActionButton onClick={onSelect} disabled={busy} variant="quiet"><Globe2 aria-hidden="true" size={15} />{copy.selector}</ActionButton></div></Surface><Surface><div className="af-section-heading"><div><h2>{copy.collect}</h2><p>{rows.length ? copy.success : copy.noRowsHint}</p></div><span className="af-meta">{rows.length ? <CheckCircle2 aria-hidden="true" size={15} /> : null}{rows.length} {copy.rows}</span></div>{rows.length ? <div className="af-table-wrap"><table><thead><tr><th>{copy.collect}</th><th>Contact</th><th>Price</th></tr></thead><tbody>{rows.slice(0, 8).map((row) => <tr key={row.id}><td><strong>{row.title || "—"}</strong><span>{row.website || row.description.slice(0, 60)}</span></td><td>{row.email || row.phone || "—"}</td><td>{row.price || "—"}</td></tr>)}</tbody></table></div> : <div className="af-empty"><ScanSearch aria-hidden="true" size={20} /><strong>{copy.noRows}</strong><span>{copy.noRowsHint}</span></div>}</Surface></>
}

function AutofillView({ copy, fieldsJson, onFieldsChange, busy, onAutofill }: { readonly copy: Copy; readonly fieldsJson: string; readonly onFieldsChange: (value: string) => void; readonly busy: boolean; readonly onAutofill: () => void }) {
  return <Surface tone="signal"><div className="af-section-heading"><div><div className="af-icon-badge"><WandSparkles aria-hidden="true" size={17} /></div><h1>{copy.autofillTitle}</h1><p>{copy.autofillBody}</p></div></div><label className="af-label" htmlFor="fields-json">{copy.fields}</label><textarea id="fields-json" className="af-code" value={fieldsJson} onChange={(event) => onFieldsChange(event.target.value)} spellCheck={false} /><ActionButton onClick={onAutofill} loading={busy}><WandSparkles aria-hidden="true" size={15} />{copy.fillForm}</ActionButton></Surface>
}

function ProfilesView({ copy, profiles, selected, name, fieldsJson, onSelect, onName, onFields, onSave, onDelete, busy }: { readonly copy: Copy; readonly profiles: readonly Profile[]; readonly selected: string; readonly name: string; readonly fieldsJson: string; readonly onSelect: (id: string) => void; readonly onName: (value: string) => void; readonly onFields: (value: string) => void; readonly onSave: () => void; readonly onDelete: (id: string) => void; readonly busy: boolean }) {
  return <><Surface><div className="af-section-heading"><div><div className="af-icon-badge"><LayoutTemplate aria-hidden="true" size={17} /></div><h1>{copy.profilesTitle}</h1><p>{copy.autofillBody}</p></div></div>{profiles.length ? <div className="af-profile-list">{profiles.map((profile) => <div key={profile.id} className={`af-profile ${selected === profile.id ? "is-selected" : ""}`}><button type="button" onClick={() => onSelect(profile.id)}><strong>{profile.name}</strong><span>{Object.keys(profile.fields).length} fields</span></button><button type="button" className="af-icon-button" aria-label={copy.delete} onClick={() => onDelete(profile.id)}><Trash2 aria-hidden="true" size={15} /></button></div>)}</div> : <div className="af-empty"><LayoutTemplate aria-hidden="true" size={20} /><strong>{copy.noProfiles}</strong></div>}</Surface><Surface><label className="af-label" htmlFor="profile-name">{copy.profileName}</label><input id="profile-name" value={name} onChange={(event) => onName(event.target.value)} placeholder="Sales profile" /><label className="af-label" htmlFor="profile-fields">{copy.fields}</label><textarea id="profile-fields" className="af-code" value={fieldsJson} onChange={(event) => onFields(event.target.value)} spellCheck={false} /><ActionButton onClick={onSave} loading={busy}><LayoutTemplate aria-hidden="true" size={15} />{copy.saveProfile}</ActionButton></Surface></>
}

function ExportView({ copy, rows, webhookUrl, onWebhookUrl, onExport, onWebhook, busy }: { readonly copy: Copy; readonly rows: ExtensionState["rows"]; readonly webhookUrl: string; readonly onWebhookUrl: (value: string) => void; readonly onExport: (format: "csv" | "json") => void; readonly onWebhook: () => void; readonly busy: boolean }) {
  return <Surface tone="signal"><div className="af-section-heading"><div><div className="af-icon-badge"><FileDown aria-hidden="true" size={17} /></div><h1>{copy.exportTitle}</h1><p>{copy.exportBody}</p></div><span className="af-count">{rows.length} {copy.rows}</span></div><div className="af-actions"><ActionButton onClick={() => onExport("csv")} disabled={!rows.length || busy}><FileDown aria-hidden="true" size={15} />{copy.csv}</ActionButton><ActionButton onClick={() => onExport("json")} disabled={!rows.length || busy} variant="quiet"><ArrowUpRight aria-hidden="true" size={15} />{copy.json}</ActionButton></div><label className="af-label" htmlFor="webhook-url">{copy.webhookUrl}</label><input id="webhook-url" value={webhookUrl} onChange={(event) => onWebhookUrl(event.target.value)} placeholder="https://crm.example.com/hooks/autoflow" /><ActionButton onClick={onWebhook} disabled={!rows.length} loading={busy} variant="quiet"><Webhook aria-hidden="true" size={15} />{copy.sendWebhook}</ActionButton></Surface>
}

function ProView({ copy, state, licenseKey, endpoint, onKey, onEndpoint, onActivate, busy }: { readonly copy: Copy; readonly state: ExtensionState; readonly licenseKey: string; readonly endpoint: string; readonly onKey: (value: string) => void; readonly onEndpoint: (value: string) => void; readonly onActivate: () => void; readonly busy: boolean }) {
  return <Surface tone="signal"><div className="af-section-heading"><div><div className="af-icon-badge"><ShieldCheck aria-hidden="true" size={17} /></div><h1>{copy.proTitle}</h1><p>{copy.proBody}</p></div><span className={`af-plan ${state.license.plan === "pro" ? "is-pro" : ""}`}>{state.license.plan === "pro" ? "PRO" : copy.free}</span></div><div className="af-meter"><span style={{ width: `${Math.min((state.quota.used / state.quota.limit) * 100, 100)}%` }} /></div><div className="af-meta-row"><span>{state.quota.used} {copy.used}</span><span>{Math.max(state.quota.limit - state.quota.used, 0)} {copy.remaining}</span></div><label className="af-label" htmlFor="license-key">{copy.licenseKey}</label><input id="license-key" value={licenseKey} onChange={(event) => onKey(event.target.value.toUpperCase())} placeholder="AFB2B-PRO-XXXXXXXX.signature" /><label className="af-label" htmlFor="license-endpoint">{copy.licenseEndpoint}</label><input id="license-endpoint" value={endpoint} onChange={(event) => onEndpoint(event.target.value)} placeholder="https://api.example.com/v1/licenses/validate" /><ActionButton onClick={onActivate} loading={busy}><ShieldCheck aria-hidden="true" size={15} />{copy.activate}</ActionButton></Surface>
}
