"use client"

import { useEffect, useMemo, useState } from "react"
import { MessageCircle, Sparkles } from "lucide-react"
import { supabase } from "@/src/supabase"
import { ChatConversation } from "@/components/ChatConversation"

type MatchStatus = "pending" | "sparked" | "dating"

type MatchRow = {
  id: string
  user_a: string
  user_b: string
  status: MatchStatus
}

type UserRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type SparkAnswerRow = {
  match_id: string
  user_id: string
  answer: string
}

type SparkedChatRow = {
  match: MatchRow
  other: UserRow
  answers: {
    a: string | null
    b: string | null
  }
}

function getOtherUserId(match: MatchRow, userId: string) {
  return match.user_a === userId ? match.user_b : match.user_a
}

export function ChatView({
  userId,
  initialMatchId,
}: {
  userId: string
  initialMatchId?: string | null
}) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(initialMatchId ?? null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SparkedChatRow[]>([])
  const [seenSparkRevealIds, setSeenSparkRevealIds] = useState<Set<string>>(new Set())
  const sparkRevealSeenKey = useMemo(() => `spark-reveal-seen:${userId}`, [userId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(sparkRevealSeenKey)
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      setSeenSparkRevealIds(new Set(parsed))
    } catch {
      setSeenSparkRevealIds(new Set())
    }
  }, [sparkRevealSeenKey])

  useEffect(() => {
    if (initialMatchId) setSelectedMatchId(initialMatchId)
  }, [initialMatchId])

  const refresh = async () => {
    setLoading(true)
    try {
      // Only show matches where both people have answered (sparked) or where chat is already dating.
      const { data: matches } = await supabase
        .from("matches")
        .select("id,user_a,user_b,status")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)

      const matchRows = (matches ?? []) as MatchRow[]
      const matchIds = matchRows.map((m) => m.id)

      if (matchIds.length === 0) {
        setRows([])
        return
      }

      const otherIds = Array.from(
        new Set(matchRows.map((m) => getOtherUserId(m, userId))),
      )
      const { data: users } = await supabase
        .from("users")
        .select("id,display_name,avatar_url")
        .in("id", otherIds)

      const userById = new Map<string, UserRow>()
      ;(users ?? []).forEach((u) => userById.set(u.id, u as UserRow))

      const { data: answers } = await supabase
        .from("spark_answers")
        .select("match_id,user_id,answer")
        .in("match_id", matchIds)

      const answerByMatch = new Map<string, { a: string | null; b: string | null }>()
      for (const match of matchRows) {
        answerByMatch.set(match.id, { a: null, b: null })
      }
      ;(answers ?? []).forEach((a) => {
        const match = (a as SparkAnswerRow).match_id
        const answerUserId = (a as SparkAnswerRow).user_id
        const matchRow = matchRows.find((m) => m.id === match)
        if (!matchRow) return
        const current = answerByMatch.get(match) ?? { a: null, b: null }
        if (answerUserId === matchRow.user_a) current.a = (a as SparkAnswerRow).answer
        if (answerUserId === matchRow.user_b) current.b = (a as SparkAnswerRow).answer
        answerByMatch.set(match, current)
      })

      const computed: SparkedChatRow[] = matchRows
        .filter((m) => {
          const a = answerByMatch.get(m.id)?.a ?? null
          const b = answerByMatch.get(m.id)?.b ?? null
          const bothAnswered = Boolean(a) && Boolean(b)
          if (!bothAnswered) return false

          // Show chat row as soon as spark is complete for both users.
          // Keep selected-match passthrough for immediate post-flow navigation.
          if (selectedMatchId && m.id === selectedMatchId) return true
          return true
        })
        .map((m) => {
          const otherId = getOtherUserId(m, userId)
          const other = userById.get(otherId) ?? {
            id: otherId,
            display_name: "Unknown",
            avatar_url: null,
          }
          const answersAB = answerByMatch.get(m.id) ?? { a: null, b: null }
          return {
            match: m,
            other,
            answers: answersAB,
          }
        })

      setRows(computed)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, seenSparkRevealIds, selectedMatchId])

  const selected = useMemo(() => {
    if (!selectedMatchId) return null
    return rows.find((r) => r.match.id === selectedMatchId) ?? null
  }, [rows, selectedMatchId])

  if (selected) {
    return (
      <ChatConversation
        userId={userId}
        match={selected.match}
        other={selected.other}
        answers={selected.answers}
        onBack={() => setSelectedMatchId(null)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Once both spark replies are in, chat opens.</p>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No sparks ready</h3>
            <p className="text-sm text-muted-foreground">Reply to spark pending matches.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row) => {
              const locked = row.match.status !== "dating"
              return (
                <div
                  key={row.match.id}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 text-left shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative">
                    <img
                      src={row.other.avatar_url ?? ""}
                      alt={row.other.display_name ?? "Profile"}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    {locked && (
                      <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary border-2 border-card" />
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedMatchId(row.match.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{row.other.display_name ?? "Unknown"}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate">
                          {locked ? "Spark complete. Chat ready." : "Chat unlocked."}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {locked ? "Sparked" : "Dating"}
                    </span>
                  </button>

                </div>
              )
            })}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/20 p-2.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Mutual intro ready</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Spark replies from both sides unlock chat automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

