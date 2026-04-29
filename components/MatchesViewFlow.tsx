"use client"

import { useEffect, useMemo, useState } from "react"
import { Flame, Heart, Sparkles, X } from "lucide-react"
import { supabase } from "@/src/supabase"
import { getQuestionForMatch } from "@/lib/questions"
import { SPARK_MIN_CHARS, SPARK_MAX_CHARS } from "../lib/sparkRules"
import { SparkReveal, type SparkRevealProfile } from "@/components/SparkReveal"

type MatchRow = { id: string; user_a: string; user_b: string; status: "pending" | "sparked" | "dating" }
type LikeRow = { from_user_id: string; to_user_id: string; status: "pending" | "mutual" }
type UserRow = { id: string; display_name: string | null; avatar_url: string | null; bio?: string | null }
type SparkAnswerRow = { match_id: string; user_id: string; answer: string }

type MatchesResponse = {
  incoming_likes: Array<{ other: UserRow }>
  spark_pending: Array<{ match: MatchRow; other: UserRow }>
  waiting_on_them: Array<{ other: UserRow; stage: "like" | "spark" }>
  sparked: Array<{ match: MatchRow; other: UserRow }>
}

const getOtherUserId = (m: MatchRow, userId: string) => (m.user_a === userId ? m.user_b : m.user_a)

export function MatchesViewFlow({ userId, onGoToChat }: { userId: string; onGoToChat?: (matchId: string) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MatchesResponse | null>(null)
  const [currentUserName, setCurrentUserName] = useState("You")
  const [sparkOpen, setSparkOpen] = useState(false)
  const [sparkMatchId, setSparkMatchId] = useState<string | null>(null)
  const [sparkQuestion, setSparkQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [sparkLoading, setSparkLoading] = useState(false)
  const [sparkError, setSparkError] = useState<string | null>(null)
  const [sparkRevealProfile, setSparkRevealProfile] = useState<SparkRevealProfile | null>(null)
  const [sparkRevealMatchId, setSparkRevealMatchId] = useState<string | null>(null)
  const canSubmit = useMemo(() => answer.trim().length >= SPARK_MIN_CHARS && answer.trim().length <= SPARK_MAX_CHARS, [answer])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: me } = await supabase.from("users").select("display_name").eq("id", userId).maybeSingle()
      if (me?.display_name) setCurrentUserName(me.display_name)

      const { data: likes } = await supabase.from("likes").select("from_user_id,to_user_id,status").or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      const { data: matches } = await supabase.from("matches").select("id,user_a,user_b,status").or(`user_a.eq.${userId},user_b.eq.${userId}`)
      const likeRows = (likes ?? []) as LikeRow[]
      const matchRows = (matches ?? []) as MatchRow[]
      const matchIds = matchRows.map((m) => m.id)

      const { data: answers } = matchIds.length > 0 ? await supabase.from("spark_answers").select("match_id,user_id,answer").in("match_id", matchIds) : { data: [] as SparkAnswerRow[] }
      const answerKey = new Map<string, SparkAnswerRow>()
      ;((answers ?? []) as SparkAnswerRow[]).forEach((a) => answerKey.set(`${a.match_id}:${a.user_id}`, a))

      const otherIds = new Set<string>()
      likeRows.forEach((l) => otherIds.add(l.from_user_id === userId ? l.to_user_id : l.from_user_id))
      matchRows.forEach((m) => otherIds.add(getOtherUserId(m, userId)))
      const { data: users } = otherIds.size > 0 ? await supabase.from("users").select("id,display_name,avatar_url,bio").in("id", Array.from(otherIds)) : { data: [] as UserRow[] }
      const userById = new Map<string, UserRow>()
      ;((users ?? []) as UserRow[]).forEach((u) => userById.set(u.id, u))

      const matchedUsers = new Set(matchRows.map((m) => getOtherUserId(m, userId)))
      const next: MatchesResponse = { incoming_likes: [], spark_pending: [], waiting_on_them: [], sparked: [] }

      likeRows.forEach((l) => {
        const otherId = l.from_user_id === userId ? l.to_user_id : l.from_user_id
        const other = userById.get(otherId)
        if (!other || matchedUsers.has(otherId) || l.status !== "pending") return
        if (l.to_user_id === userId) next.incoming_likes.push({ other })
        else next.waiting_on_them.push({ other, stage: "like" })
      })

      matchRows.forEach((m) => {
        const other = userById.get(getOtherUserId(m, userId))
        if (!other) return
        const myAnswer = Boolean(answerKey.get(`${m.id}:${userId}`)?.answer)
        const theirAnswer = Boolean(answerKey.get(`${m.id}:${other.id}`)?.answer)
        if ((myAnswer && theirAnswer) || m.status === "sparked" || m.status === "dating") next.sparked.push({ match: m, other })
        else if (!myAnswer) next.spark_pending.push({ match: m, other })
        else next.waiting_on_them.push({ other, stage: "spark" })
      })

      setData(next)
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

  const approveLike = async (otherUserId: string) => {
    await supabase.from("likes").upsert({ from_user_id: userId, to_user_id: otherUserId, status: "mutual" }, { onConflict: "from_user_id,to_user_id" })
    await supabase.from("likes").upsert({ from_user_id: otherUserId, to_user_id: userId, status: "mutual" }, { onConflict: "from_user_id,to_user_id" })
    const { data: existing } = await supabase.from("matches").select("id").or(`and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`).maybeSingle()
    if (!existing) await supabase.from("matches").insert({ user_a: userId, user_b: otherUserId, status: "pending" })
    await refresh()
  }

  const openSparkPrompt = async (matchId: string) => {
    setSparkOpen(true)
    setSparkMatchId(matchId)
    setSparkQuestion(getQuestionForMatch(matchId))
    const { data: existing } = await supabase.from("spark_answers").select("answer").eq("match_id", matchId).eq("user_id", userId).maybeSingle()
    setAnswer(existing?.answer ?? "")
  }

  const submitSparkAnswer = async () => {
    if (!sparkMatchId) return
    setSparkLoading(true)
    setSparkError(null)
    try {
      await supabase.from("spark_answers").upsert({ match_id: sparkMatchId, user_id: userId, answer: answer.trim() }, { onConflict: "match_id,user_id" })

      const { data: matchRow } = await supabase.from("matches").select("id,user_a,user_b").eq("id", sparkMatchId).single()
      if (!matchRow) {
        setSparkOpen(false)
        await refresh()
        return
      }

      const { data: answers } = await supabase.from("spark_answers").select("user_id").eq("match_id", sparkMatchId)
      const answeredUserIds = new Set((answers ?? []).map((a) => a.user_id))
      const bothAnswered = answeredUserIds.has(matchRow.user_a) && answeredUserIds.has(matchRow.user_b)

      if (!bothAnswered) {
        // Keep flow on matches list until the other person answers.
        setSparkOpen(false)
        await refresh()
        return
      }

      const otherId = getOtherUserId(matchRow as MatchRow, userId)
      const { data: otherUser } = await supabase.from("users").select("display_name,avatar_url,bio").eq("id", otherId).maybeSingle()
      setSparkRevealMatchId(sparkMatchId)
      setSparkRevealProfile({ name: otherUser?.display_name ?? "Your match", bio: otherUser?.bio ?? "Your connection is unlocked.", photos: otherUser?.avatar_url ? [otherUser.avatar_url] : [] })
      setSparkOpen(false)
      await refresh()
    } catch (e) {
      setSparkError(e instanceof Error ? e.message : "Failed to submit spark answer")
    } finally {
      setSparkLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-4">
        <h1 className="mb-5 text-2xl font-bold text-foreground">Your Matches</h1>
        {loading && <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">Loading...</div>}
        {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm">{error}</div>}
        {!loading && data && (
          <>
            <section className="mb-5 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-300" />
                  <h2 className="font-semibold text-foreground">Liked you</h2>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{data.incoming_likes.length}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">People waiting for your approval.</p>
              {data.incoming_likes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">No incoming likes yet.</div>
              ) : (
                data.incoming_likes.map((r) => (
                  <div key={r.other.id} className="mb-2 flex items-center justify-between rounded-xl bg-card p-3 last:mb-0">
                    <span>{r.other.display_name ?? "Unknown"}</span>
                    <button className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={() => void approveLike(r.other.id)}>Approve</button>
                  </div>
                ))
              )}
            </section>

            <section className="mb-5 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <h2 className="font-semibold text-foreground">Spark pending</h2>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{data.spark_pending.length}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Mutual matches that need your spark answer.</p>
              {data.spark_pending.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">No spark prompts right now.</div>
              ) : (
                data.spark_pending.map((r) => (
                  <div key={r.match.id} className="mb-2 flex items-center justify-between rounded-xl bg-card p-3 last:mb-0">
                    <span>{r.other.display_name ?? "Unknown"}</span>
                    <button className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground" onClick={() => void openSparkPrompt(r.match.id)}>Answer spark</button>
                  </div>
                ))
              )}
            </section>

            <section className="mb-5 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h2 className="font-semibold text-foreground">Waiting on them</h2>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{data.waiting_on_them.length}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">You acted. Their move next.</p>
              {data.waiting_on_them.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">No pending responses.</div>
              ) : (
                data.waiting_on_them.map((r) => (
                  <div key={`${r.other.id}-${r.stage}`} className="mb-2 flex items-center justify-between rounded-xl bg-card p-3 text-muted-foreground last:mb-0">
                    <span>{r.other.display_name ?? "Unknown"}</span>
                    {r.stage === "spark" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-100/90">
                        <Flame className="h-3.5 w-3.5 fill-amber-300/80 text-amber-300" />
                        Spark sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-300/10 px-2.5 py-1 text-[11px] font-medium text-rose-100/90">
                        <Heart className="h-3.5 w-3.5 fill-rose-300/80 text-rose-300" />
                        Like sent
                      </span>
                    )}
                  </div>
                ))
              )}
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Sparked</h2>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{data.sparked.length}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Unlocked matches ready for chat.</p>
              {data.sparked.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">No sparked matches yet.</div>
              ) : (
                data.sparked.map((r) => (
                  <div key={r.match.id} className="mb-2 flex items-center justify-between rounded-xl bg-card p-3 last:mb-0">
                    <span>{r.other.display_name ?? "Unknown"}</span>
                    <button className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary" onClick={() => onGoToChat?.(r.match.id)}>Go to chat</button>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>

      {sparkOpen && sparkMatchId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Spark prompt</h2><button onClick={() => setSparkOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button></div>
            <p className="mb-2 text-sm">{sparkQuestion}</p>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={SPARK_MAX_CHARS} className="min-h-[120px] w-full rounded-xl border px-3 py-2 text-sm" />
            {sparkError && <div className="mt-2 text-sm text-rose-300">{sparkError}</div>}
            <button disabled={!canSubmit || sparkLoading} onClick={() => void submitSparkAnswer()} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Unlock spark</button>
          </div>
        </div>
      )}

      {sparkRevealProfile && sparkRevealMatchId && <SparkReveal currentUserName={currentUserName} matchedProfile={sparkRevealProfile} onComplete={() => { const matchId = sparkRevealMatchId; setSparkRevealProfile(null); setSparkRevealMatchId(null); onGoToChat?.(matchId) }} />}
    </div>
  )
}

