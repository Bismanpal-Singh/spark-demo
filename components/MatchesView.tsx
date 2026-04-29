"use client"

import { useEffect, useState } from "react"
import { Flame, Sparkles } from "lucide-react"

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

export function MatchesView() {
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

  const handleReplySpark = async (matchId: string) => {
    setError(null)

    try {
      const res = await fetch(`/api/me/matches/${matchId}/reply-spark`, {
        method: "POST",
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        throw new Error(json.error ? String(json.error) : "Reply failed")
      }

      await fetchMatches()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed")
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
                      onClick={() => handleReplySpark(match.id)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Reply
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

                    <button className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
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
    </div>
  )
}

