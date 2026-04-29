import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import {
  getMatchesByStatus,
  getSparkQuestionForMatch,
  replySpark,
  resetDb,
} from "./src/server/localSparkDb"

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-spark-mock-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || "", "http://localhost")

          const readJsonBody = async () => {
            let raw = ""
            await new Promise<void>((resolve) => {
              req.on("data", (chunk) => {
                raw += String(chunk)
              })
              req.on("end", () => resolve())
              req.on("error", () => resolve())
            })

            if (!raw) return {}
            return JSON.parse(raw) as unknown
          }

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

          const sparkQuestionMatch = url.pathname.match(
            /^\/api\/me\/matches\/([^/]+)\/spark-question$/,
          )
          if (req.method === "GET" && sparkQuestionMatch) {
            const matchId = sparkQuestionMatch[1]
            const result = getSparkQuestionForMatch(matchId)
            res.setHeader("content-type", "application/json; charset=utf-8")
            res.end(JSON.stringify(result))
            return
          }

          const replySparkMatch = url.pathname.match(
            /^\/api\/me\/matches\/([^/]+)\/reply-spark$/,
          )
          if (req.method === "POST" && replySparkMatch) {
            const matchId = replySparkMatch[1]
            const body = await readJsonBody()
            const answer = (body as { answer?: unknown }).answer

            const result =
              typeof answer === "string"
                ? replySpark(matchId, answer)
                : { ok: false as const, error: "missing_answer" as const }

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
