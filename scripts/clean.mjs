import { rmSync } from "node:fs"

for (const path of ["dist", "server-dist", "autoflow-b2b-extension.zip"]) rmSync(path, { recursive: true, force: true })
