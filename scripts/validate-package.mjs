import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { unzipSync } from "fflate"

const archive = unzipSync(readFileSync(join(resolve(process.cwd()), "autoflow-b2b-extension.zip")))
const names = new Set(Object.keys(archive))
if (!names.has("manifest.json")) throw new Error("package validation failed: manifest.json is not at archive root")
const manifest = JSON.parse(new TextDecoder().decode(archive["manifest.json"]))
const references = [manifest.background.service_worker, manifest.action.default_popup, manifest.side_panel.default_path]
for (const script of manifest.content_scripts ?? []) references.push(...script.js, ...(script.css ?? []))
for (const reference of references) {
  if (!names.has(reference)) throw new Error(`package validation failed: missing ${reference}`)
}
if ([...names].some((name) => name.startsWith("../") || name.includes(".env") || name.endsWith(".pem"))) {
  throw new Error("package validation failed: unsafe archive entry")
}
console.log(`package validated: ${names.size} archive entries`)
