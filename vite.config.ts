import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { getMatchesByStatus, replySpark, resetDb } from "./src/server/localSparkDb"

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-spark-mock-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || "", "http://localhost")

          // Only handle local API paths.
          if (!url.pathname.startsWith("/api/")) return next()

          if (req.method === "GET" && url.pathname === "/api/me/matches") {
            res.setHeader("content-type", "application/json; charset=utf-8")
            res.end(JSON.stringify(getMatchesByStatus()))
            return
          }

          if (req.method === "POST" && url.pathname === "/api/me/reset") {
            resetDb()
            res.setHeader("content-type", "application/json; charset=utf-8")
            res.end(JSON.stringify({ ok: true }))
            return
          }

          const replySparkMatch = url.pathname.match(
            /^\/api\/me\/matches\/([^/]+)\/reply-spark$/,
          )
          if (req.method === "POST" && replySparkMatch) {
            const matchId = replySparkMatch[1]
            const result = replySpark(matchId)
            res.setHeader("content-type", "application/json; charset=utf-8")
            res.end(JSON.stringify(result))
            return
          }

          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
