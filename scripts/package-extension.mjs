import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { zipSync, strToU8 } from "fflate"

const root = resolve(process.cwd())
const dist = join(root, "dist")
const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"))
const files = {}

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) collect(path)
    else files[relative(dist, path).replaceAll("\\", "/")] = strToU8(readFileSync(path))
  }
}

collect(dist)
writeFileSync(join(root, "autoflow-b2b-extension.zip"), zipSync(files, { level: 9 }))
console.log(`packaged ${manifest.name} ${manifest.version} with ${Object.keys(files).length} files`)
