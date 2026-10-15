import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, normalize, relative, resolve } from "node:path"

const root = resolve(process.cwd())
const dist = join(root, "dist")
const manifestPath = join(dist, "manifest.json")
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

function fail(message) {
  throw new Error(`dist validation failed: ${message}`)
}

if (!existsSync(manifestPath)) fail("manifest.json is missing")
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
if (manifest.manifest_version !== 3) fail("manifest_version must be 3")
if (manifest.version !== packageJson.version) fail("manifest version does not match package version")

const references = []
if (typeof manifest.background?.service_worker === "string") references.push(manifest.background.service_worker)
if (typeof manifest.action?.default_popup === "string") references.push(manifest.action.default_popup)
if (typeof manifest.side_panel?.default_path === "string") references.push(manifest.side_panel.default_path)
for (const script of manifest.content_scripts ?? []) {
  for (const path of script.js ?? []) references.push(path)
  for (const path of script.css ?? []) references.push(path)
}
for (const icon of Object.values(manifest.icons ?? {})) references.push(icon)

for (const reference of references) {
  if (typeof reference !== "string" || reference.startsWith("/") || reference.includes("..")) fail(`unsafe manifest reference ${reference}`)
  if (!existsSync(join(dist, reference))) fail(`missing manifest file ${reference}`)
}

const popup = manifest.action?.default_popup
if (typeof popup === "string") {
  const html = readFileSync(join(dist, popup), "utf8")
  const htmlReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]).filter((value) => value && !value.startsWith("data:"))
  for (const reference of htmlReferences) {
    const clean = reference.replace(/^\//, "")
    if (!existsSync(join(dist, clean))) fail(`popup references missing asset ${clean}`)
    if (/^https?:/i.test(reference)) fail(`remote popup asset ${reference}`)
  }
}

const files = []
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) collect(path)
    else files.push(path)
  }
}
collect(dist)
for (const path of files) {
  const name = path.toLowerCase()
  if (name.endsWith(".env") || name.endsWith(".pem") || name.endsWith(".key")) fail(`secret-like file ${relative(dist, path)}`)
  const normalized = normalize(relative(dist, path))
  if (normalized.startsWith("..")) fail(`file escapes dist ${normalized}`)
}

console.log(`dist validated: ${files.length} files, ${references.length} manifest references`)
