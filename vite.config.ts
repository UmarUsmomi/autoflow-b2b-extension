import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const contentBuild = mode === "content"
  return {
    plugins: contentBuild ? [] : [react(), tailwindcss()],
    build: {
      outDir: "dist",
      emptyOutDir: !contentBuild,
      rollupOptions: {
        input: contentBuild
          ? { content: resolve(import.meta.dirname, "src/content/contentScript.ts") }
          : {
              popup: resolve(import.meta.dirname, "popup.html"),
              background: resolve(import.meta.dirname, "src/background/serviceWorker.ts"),
            },
        output: {
          format: contentBuild ? "iife" : "es",
          inlineDynamicImports: contentBuild,
          entryFileNames: (chunk) => {
            if (chunk.name === "background" || chunk.name === "content") return "[name].js"
            return "assets/[name]-[hash].js"
          },
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
        onwarn: (warning, warn) => {
          if (warning.code === "INVALID_ANNOTATION" && warning.id?.includes("node_modules/zod/")) return
          warn(warning)
        },
      },
    },
  }
})
