"use client"

import { useEffect, useMemo, useState } from "react"
import { Flame, Sparkles, X } from "lucide-react"

type MatchStatus =
  | "waiting_for_their_match"
  | "waiting_for_my_spark"
  | "sparked"

type Match = {
  id: string
  name: string
  photo: string
  status: MatchStatus
  lastActivity?: string
}

type MatchesApiResponse = {
  waiting_for_their_match: Match[]
  waiting_for_my_spark: Match[]
  sparked: Match[]
}

type SparkQuestionResponse = {
  ok?: boolean
  question?: string
  maxChars?: number
  minChars?: number
  myAnswer?: string | null
  theirAnswer?: string | null
  error?: string
}

export function MatchesView({ onGoToChat }: { onGoToChat?: () => void }) {
  const [data, setData] = useState<MatchesApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/me/matches", { method: "GET" })
      if (!res.ok) throw new Error(`Failed to load matches (${res.status})`)

      const json = (await res.json()) as MatchesApiResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchMatches()
  }, [])

  // Spark modal state
  const [sparkOpen, setSparkOpen] = useState(false)
  const [sparkMatchId, setSparkMatchId] = useState<string | null>(null)
  const [sparkQuestion, setSparkQuestion] = useState<string>("")
  const [sparkMinChars, setSparkMinChars] = useState(5)
  const [sparkMaxChars, setSparkMaxChars] = useState(180)
  const [answer, setAnswer] = useState("")
  const [sparkLoading, setSparkLoading] = useState(false)
  const [sparkError, setSparkError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    const len = answer.trim().length
    return len >= sparkMinChars && len <= sparkMaxChars
  }, [answer, sparkMinChars, sparkMaxChars])

  const openSparkPrompt = async (matchId: string) => {
    setSparkOpen(true)
    setSparkMatchId(matchId)
    setSparkError(null)
    setSparkLoading(true)

    try {
      const res = await fetch(`/api/me/matches/${matchId}/spark-question`, {
        method: "GET",
      })
      if (!res.ok) throw new Error(`Failed to load spark question (${res.status})`)

      const json = (await res.json()) as SparkQuestionResponse
      if (!json.question) throw new Error(json.error ? String(json.error) : "Missing question")

      setSparkQuestion(json.question)
      setSparkMinChars(json.minChars ?? 5)
      setSparkMaxChars(json.maxChars ?? 180)
      setAnswer(json.myAnswer ?? "")
    } catch (e) {
      setSparkError(e instanceof Error ? e.message : "Failed to load spark question")
    } finally {
      setSparkLoading(false)
    }
  }

  const closeSparkPrompt = () => {
    setSparkOpen(false)
    setSparkMatchId(null)
    setSparkQuestion("")
    setAnswer("")
    setSparkError(null)
  }

  const submitSparkAnswer = async () => {
    if (!sparkMatchId) return

    setSparkError(null)
    const trimmed = answer.trim()
    if (trimmed.length < sparkMinChars) {
      setSparkError(`Answer is too short (min ${sparkMinChars} chars).`)
      return
    }
    if (trimmed.length > sparkMaxChars) {
      setSparkError(`Answer is too long (max ${sparkMaxChars} chars).`)
      return
    }

    try {
      const res = await fetch(`/api/me/matches/${sparkMatchId}/reply-spark`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: trimmed }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        throw new Error(json.error ? String(json.error) : "Reply failed")
      }

      // Backend updates match status to sparked.
      closeSparkPrompt()
      await fetchMatches()
      onGoToChat?.()
    } catch (e) {
      setSparkError(e instanceof Error ? e.message : "Reply failed")
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connections waiting to spark
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/80" />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-foreground/90">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Spark pending */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-semibold text-foreground">Spark pending</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Reply to unlock chat.</p>

              <div className="space-y-3">
                {data.waiting_for_my_spark.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                        <Flame className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{match.name}</h3>
                      <p className="text-sm text-muted-foreground">{match.lastActivity}</p>
                    </div>

                    <button
                      onClick={() => void openSparkPrompt(match.id)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Answer spark
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Waiting on them */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="font-semibold text-foreground">Waiting on them</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">You liked them first.</p>

              <div className="space-y-3">
                {data.waiting_for_their_match.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
                  >
                    <div className="relative">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="h-16 w-16 rounded-full object-cover opacity-80 grayscale-[30%]"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{match.name}</h3>
                      <p className="text-sm text-muted-foreground">{match.lastActivity}</p>
                    </div>

                    <button
                      disabled
                      className="cursor-not-allowed rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary opacity-60"
                    >
                      Waiting
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sparked */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Sparked</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Ready for conversation.</p>

              <div className="space-y-3">
                {data.sparked.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                        <Flame
                          className="h-3 w-3 text-primary-foreground"
                          fill="currentColor"
                        />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{match.name}</h3>
                      <p className="text-sm text-muted-foreground">{match.lastActivity}</p>
                    </div>

                  <button
                    onClick={() => onGoToChat?.()}
                    className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                      Go to chat
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {data.waiting_for_my_spark.length === 0 &&
              data.waiting_for_their_match.length === 0 &&
              data.sparked.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Flame className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Your sparks are coming
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Keep swiping to find your connections
                  </p>
                </div>
              )}
          </>
        )}
      </div>

      {/* Spark prompt modal */}
      {sparkOpen && sparkMatchId && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeSparkPrompt()
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-fuchsia-400/25 to-rose-300/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Spark prompt
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Answer to unlock full profile and chat.
                  </p>
                </div>
              </div>

              <button
                onClick={closeSparkPrompt}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sparkLoading ? (
              <div className="space-y-3 py-8">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-32 w-full animate-pulse rounded bg-muted/60" />
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm leading-relaxed text-foreground/95">
                  {sparkQuestion}
                </p>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your answer…"
                  maxLength={sparkMaxChars}
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {answer.trim().length < sparkMinChars
                      ? `Min ${sparkMinChars} chars`
                      : "Looks good"}
                  </span>
                  <span>
                    {answer.trim().length}/{sparkMaxChars}
                  </span>
                </div>

                {sparkError && (
                  <div className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-foreground/90">
                    {sparkError}
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={closeSparkPrompt}
                    className="flex-1 rounded-2xl border border-border/70 bg-muted/30 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                  >
                    Later
                  </button>
                  <button
                    onClick={() => void submitSparkAnswer()}
                    disabled={!canSubmit}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-400 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Unlock spark
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

