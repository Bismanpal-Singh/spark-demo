"use client"

import { useEffect, useMemo, useState } from "react"
import { Flame, Sparkles, X } from "lucide-react"
import { supabase } from "@/src/supabase"
import { getTodaysQuestion } from "@/lib/questions"
import { SPARK_MIN_CHARS, SPARK_MAX_CHARS } from "../lib/sparkRules"
import { SparkReveal, type SparkRevealProfile } from "@/components/SparkReveal"

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
  bio?: string | null
}

type SparkAnswerRow = {
  id: string
  match_id: string
  user_id: string
  answer: string
}

type SparkAnswerUpsert = {
  match_id: string
  user_id: string
  answer: string
}

type MatchesResponse = {
  spark_pending: Array<{
    match: MatchRow
    other: UserRow
    theirAnswer?: string | null
  }>
  waiting_on_them: Array<{
    match: MatchRow
    other: UserRow
  }>
  sparked: Array<{
    match: MatchRow
    other: UserRow
    myAnswer: string | null
    theirAnswer: string | null
  }>
}

const ACCEPTED_MATCH_STATUS: MatchStatus[] = ["sparked", "dating"]

function getOtherUserId(match: MatchRow, userId: string) {
  return match.user_a === userId ? match.user_b : match.user_a
}

export function MatchesView({
  userId,
  onGoToChat,
}: {
  userId: string
  onGoToChat?: (matchId: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MatchesResponse | null>(null)
  const [currentUserName, setCurrentUserName] = useState("You")

  const [sparkOpen, setSparkOpen] = useState(false)
  const [sparkMatchId, setSparkMatchId] = useState<string | null>(null)
  const [sparkQuestion, setSparkQuestion] = useState<string>("")
  const [sparkMinChars, setSparkMinChars] = useState(SPARK_MIN_CHARS)
  const [sparkMaxChars, setSparkMaxChars] = useState(SPARK_MAX_CHARS)
  const [answer, setAnswer] = useState("")
  const [sparkLoading, setSparkLoading] = useState(false)
  const [sparkError, setSparkError] = useState<string | null>(null)
  const [sparkRevealProfile, setSparkRevealProfile] = useState<SparkRevealProfile | null>(null)
  const [sparkRevealMatchId, setSparkRevealMatchId] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    const len = answer.trim().length
    return len >= sparkMinChars && len <= sparkMaxChars
  }, [answer, sparkMinChars, sparkMaxChars])

  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: me } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle()
      if (me?.display_name) setCurrentUserName(me.display_name)

      // 1) Load matches for this user.
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id,user_a,user_b,status")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)

      if (matchesError) throw matchesError
      const matchRows = (matches ?? []) as MatchRow[]

      const matchIds = matchRows.map((m) => m.id)
      if (matchIds.length === 0) {
        setData({
          spark_pending: [],
          waiting_on_them: [],
          sparked: [],
        })
        return
      }

      // 2) Load other users + spark answers.
      const otherUserIds = Array.from(
        new Set(
          matchRows.map((m) => getOtherUserId(m, userId)),
        ),
      )

      const { data: users } = await supabase
        .from("users")
        .select("id,display_name,avatar_url,bio")
        .in("id", otherUserIds)

      const userById = new Map<string, UserRow>()
      ;(users ?? []).forEach((u) => {
        userById.set(u.id, u as UserRow)
      })

      const { data: sparkAnswers } = await supabase
        .from("spark_answers")
        .select("id,match_id,user_id,answer")
        .in("match_id", matchIds)

      const answerByMatchAndUser = new Map<string, SparkAnswerRow>()
      ;(sparkAnswers ?? []).forEach((a) => {
        answerByMatchAndUser.set(`${a.match_id}:${a.user_id}`, a as SparkAnswerRow)
      })

      const response: MatchesResponse = {
        spark_pending: [],
        waiting_on_them: [],
        sparked: [],
      }

      for (const m of matchRows) {
        const otherId = getOtherUserId(m, userId)
        const other = userById.get(otherId) ?? {
          id: otherId,
          display_name: "Unknown",
          avatar_url: null,
        }

        const myAnswerKey = `${m.id}:${userId}`
        const theirAnswerKey = `${m.id}:${otherId}`

        const myAnswer = answerByMatchAndUser.get(myAnswerKey)?.answer ?? null
        const theirAnswer = answerByMatchAndUser.get(theirAnswerKey)?.answer ?? null

        const bothAnswered = Boolean(myAnswer) && Boolean(theirAnswer)
        const otherAnswered = Boolean(theirAnswer)
        const iAnswered = Boolean(myAnswer)

        if (bothAnswered || ACCEPTED_MATCH_STATUS.includes(m.status)) {
          response.sparked.push({
            match: m,
            other,
            myAnswer,
            theirAnswer,
          })
        } else if (!iAnswered && otherAnswered) {
          // Waiting on you: they answered first, so you reply to unlock.
          response.spark_pending.push({
            match: m,
            other,
            theirAnswer,
          })
        } else if (iAnswered && !otherAnswered) {
          // Waiting on them.
          response.waiting_on_them.push({
            match: m,
            other,
          })
        } else {
          // No answers yet: treat like spark pending for simplicity.
          response.spark_pending.push({
            match: m,
            other,
            theirAnswer,
          })
        }
      }

      setData(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const closeSparkPrompt = () => {
    setSparkOpen(false)
    setSparkMatchId(null)
    setSparkQuestion("")
    setAnswer("")
    setSparkError(null)
  }

  const openSparkPrompt = async (matchId: string) => {
    setSparkOpen(true)
    setSparkMatchId(matchId)
    setSparkLoading(true)
    setSparkError(null)

    try {
      // For the demo: the question is deterministic (same day) across matches.
      const question = getTodaysQuestion()
      setSparkQuestion(question)
      setSparkMinChars(SPARK_MIN_CHARS)
      setSparkMaxChars(SPARK_MAX_CHARS)

      const { data: existing } = await supabase
        .from("spark_answers")
        .select("answer")
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .maybeSingle()

      setAnswer(existing?.answer ?? "")
    } catch (e) {
      setSparkError(e instanceof Error ? e.message : "Failed to load spark prompt")
    } finally {
      setSparkLoading(false)
    }
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

    setSparkLoading(true)
    try {
      const payload: SparkAnswerUpsert = {
        match_id: sparkMatchId,
        user_id: userId,
        answer: trimmed,
      }

      const { error: upsertError } = await supabase
        .from("spark_answers")
        .upsert(payload, { onConflict: "match_id,user_id" })

      if (upsertError) throw upsertError

      // Refresh categories and only navigate once both sides answered.
      await refresh()
      // We can’t rely on `data` state immediately; check via a direct query.
      const { data: answers } = await supabase
        .from("spark_answers")
        .select("user_id")
        .eq("match_id", sparkMatchId)

      const answerUserIds = new Set((answers ?? []).map((a) => a.user_id))

      // Load match to determine both participants.
      const { data: matchRow } = await supabase
        .from("matches")
        .select("id,user_a,user_b")
        .eq("id", sparkMatchId)
        .single()

      if (!matchRow) return
      const otherId = getOtherUserId(matchRow as any, userId)

      if (answerUserIds.has(userId) && answerUserIds.has(otherId)) {
        // Pull latest profile details for spark reveal moment.
        const { data: otherUser } = await supabase
          .from("users")
          .select("display_name,avatar_url,bio")
          .eq("id", otherId)
          .maybeSingle()

        closeSparkPrompt()
        setSparkRevealMatchId(sparkMatchId)
        setSparkRevealProfile({
          name: otherUser?.display_name ?? "Your match",
          bio: otherUser?.bio ?? "Your connection is unlocked. Start the conversation.",
          photos: otherUser?.avatar_url ? [otherUser.avatar_url] : [],
        })
        return
      }

      closeSparkPrompt()
    } catch (e) {
      setSparkError(e instanceof Error ? e.message : "Reply failed")
    } finally {
      setSparkLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mutual sparks, then conversation.
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
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-semibold text-foreground">Spark pending</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Reply to unlock chat.</p>

              <div className="space-y-3">
                {data.spark_pending.map((row) => (
                  <div
                    key={row.match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={row.other.avatar_url ?? ""}
                        alt={row.other.display_name ?? "Profile"}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                        <Flame className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {row.other.display_name ?? "Unknown"}
                      </h3>
                      <p className="text-sm text-muted-foreground">Your turn to spark.</p>
                    </div>

                    <button
                      onClick={() => void openSparkPrompt(row.match.id)}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Answer spark
                    </button>
                  </div>
                ))}
                {data.spark_pending.length === 0 && (
                  <div className="rounded-2xl bg-card/40 p-4 text-center text-sm text-muted-foreground">
                    Nothing pending right now.
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="font-semibold text-foreground">Waiting on them</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">They haven’t answered yet.</p>

              <div className="space-y-3">
                {data.waiting_on_them.map((row) => (
                  <div
                    key={row.match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
                  >
                    <div className="relative">
                      <img
                        src={row.other.avatar_url ?? ""}
                        alt={row.other.display_name ?? "Profile"}
                        className="h-16 w-16 rounded-full object-cover opacity-80 grayscale-[30%]"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{row.other.display_name ?? "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground">Hold tight.</p>
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

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Sparked</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">View sparks, then decide.</p>

              <div className="space-y-3">
                {data.sparked.map((row) => (
                  <div
                    key={row.match.id}
                    className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={row.other.avatar_url ?? ""}
                        alt={row.other.display_name ?? "Profile"}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                        <Flame className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{row.other.display_name ?? "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground">Mutual spark complete.</p>
                    </div>

                    <button
                      onClick={() => onGoToChat?.(row.match.id)}
                      className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      Go to chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && data && data.spark_pending.length === 0 && data.waiting_on_them.length === 0 && data.sparked.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Flame className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Your sparks are coming
            </h3>
            <p className="text-sm text-muted-foreground">
              Seed a match in Supabase to test the full flow.
            </p>
          </div>
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
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Spark prompt</h2>
                  <p className="text-xs text-muted-foreground">Answer to unlock full profile and chat.</p>
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
                <p className="mb-3 text-sm leading-relaxed text-foreground/95">{sparkQuestion}</p>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your answer…"
                  maxLength={sparkMaxChars}
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {answer.trim().length < sparkMinChars ? `Min ${sparkMinChars} chars` : "Looks good"}
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

      {sparkRevealProfile && sparkRevealMatchId && (
        <SparkReveal
          currentUserName={currentUserName}
          matchedProfile={sparkRevealProfile}
          onComplete={() => {
            const matchId = sparkRevealMatchId
            setSparkRevealProfile(null)
            setSparkRevealMatchId(null)
            onGoToChat?.(matchId)
          }}
        />
      )}
    </div>
  )
}

