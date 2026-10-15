import { serve } from "@hono/node-server"
import app from "./license-worker.js"

const port = Number(process.env["LICENSE_WORKER_PORT"] ?? "8787")
const bindings = {
  LICENSE_HMAC_SECRET: process.env["LICENSE_HMAC_SECRET"] ?? "development-only-secret",
  LICENSE_ADMIN_SECRET: process.env["LICENSE_ADMIN_SECRET"] ?? "development-only-admin-secret",
  ALLOWED_ORIGINS: process.env["ALLOWED_ORIGINS"] ?? "http://localhost:5173",
}

serve({
  fetch: (request) => app.fetch(request, bindings),
  port,
})
