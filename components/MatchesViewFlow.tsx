"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Flame, Heart, Lock, MapPin, Sparkles, X } from "lucide-react"
import { supabase } from "@/src/supabase"
import { getQuestionForMatch } from "@/lib/questions"
import { SparkReveal, type SparkRevealProfile } from "@/components/SparkReveal"
import { incomingLikeLockedPreview, type RichUserRow } from "@/lib/profileVisibility"

type MatchRow = { id: string; user_a: string; user_b: string; status: "pending" | "sparked" | "dating" }
type LikeRow = { from_user_id: string; to_user_id: string; status: "pending" | "mutual" }
type UserRow = RichUserRow
type SparkAnswerRow = { match_id: string; user_id: string; answer: string }

type MatchesResponse = {
  incoming_likes: Array<{ other: UserRow; fromUserId: string }>
  spark_pending: Array<{ match: MatchRow; other: UserRow }>
  waiting_on_them: Array<{ other: UserRow; stage: "like" | "spark" }>
  sparked: Array<{ match: MatchRow; other: UserRow; bothAnswered: boolean }>
}

const getOtherUserId = (m: MatchRow, userId: string) => (m.user_a === userId ? m.user_b : m.user_a)

type MatchesProfileSheet =
  | { kind: "incoming_like"; user: UserRow; fromUserId: string }
  | { kind: "browse"; user: UserRow }

function MatchRowProfileTrigger({ user, onPress }: { user: UserRow; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left text-foreground transition hover:bg-background/60"
    >
      <img
        src={user.avatar_url ?? ""}
        alt={user.display_name ?? "Profile"}
        className="h-9 w-9 shrink-0 rounded-full border border-border/60 bg-muted object-cover"
      />
      <span className="truncate font-medium">{user.display_name ?? "Unknown"}</span>
    </button>
  )
}

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
  const [seenSparkRevealIds, setSeenSparkRevealIds] = useState<Set<string>>(new Set())
  const [profileSheet, setProfileSheet] = useState<MatchesProfileSheet | null>(null)
  const [incomingActionLoading, setIncomingActionLoading] = useState<"accept" | "decline" | null>(null)
  const sparkRevealSeenKey = useMemo(() => `spark-reveal-seen:${userId}`, [userId])
  const profileSheetLockedPreview = useMemo(
    () => (profileSheet ? incomingLikeLockedPreview(profileSheet.user) : null),
    [profileSheet],
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(sparkRevealSeenKey)
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      setSeenSparkRevealIds(new Set(parsed))
    } catch {
      setSeenSparkRevealIds(new Set())
    }
  }, [sparkRevealSeenKey])

  const markSparkRevealSeen = (matchId: string) => {
    setSeenSparkRevealIds((prev) => {
      const next = new Set(prev)
      next.add(matchId)
      try {
        localStorage.setItem(sparkRevealSeenKey, JSON.stringify(Array.from(next)))
      } catch {
        // non-blocking
      }
      return next
    })
  }

  const refresh = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true)
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
      const usersResult =
        otherIds.size > 0
          ? await supabase
              .from("users")
              .select("id,display_name,avatar_url,tagline,bio,age,city,preferences,gallery_urls,looking_for,fun_fact")
              .in("id", Array.from(otherIds))
          : { data: [] as UserRow[], error: null }
      const users =
        usersResult.error && otherIds.size > 0
          ? (
              await supabase
                .from("users")
                .select("id,display_name,avatar_url,tagline,bio")
                .in("id", Array.from(otherIds))
            ).data
          : usersResult.data
      const userById = new Map<string, UserRow>()
      ;((users ?? []) as UserRow[]).forEach((u) => userById.set(u.id, u))

      const matchedUsers = new Set(matchRows.map((m) => getOtherUserId(m, userId)))
      const next: MatchesResponse = { incoming_likes: [], spark_pending: [], waiting_on_them: [], sparked: [] }

      likeRows.forEach((l) => {
        const otherId = l.from_user_id === userId ? l.to_user_id : l.from_user_id
        const other = userById.get(otherId)
        if (!other || matchedUsers.has(otherId)) return
        if (l.to_user_id === userId && (l.status === "pending" || l.status === "mutual")) {
          next.incoming_likes.push({ other, fromUserId: l.from_user_id })
        } else if (l.from_user_id === userId && l.status === "pending") {
          next.waiting_on_them.push({ other, stage: "like" })
        }
      })

      matchRows.forEach((m) => {
        const other = userById.get(getOtherUserId(m, userId))
        if (!other) return
        const myAnswer = Boolean(answerKey.get(`${m.id}:${userId}`)?.answer)
        const theirAnswer = Boolean(answerKey.get(`${m.id}:${other.id}`)?.answer)
        const bothAnswered = myAnswer && theirAnswer
        if (bothAnswered || m.status === "sparked" || m.status === "dating") {
          next.sparked.push({ match: m, other, bothAnswered })
        }
        else if (!myAnswer) next.spark_pending.push({ match: m, other })
        else next.waiting_on_them.push({ other, stage: "spark" })
      })

      setData(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches")
      setData(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    const matchesChannel = supabase
      .channel(`matches:live:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          void refresh({ silent: true })
        },
      )
      .subscribe()

    const likesChannel = supabase
      .channel(`likes:live:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" },
        () => {
          void refresh({ silent: true })
        },
      )
      .subscribe()

    const sparkAnswersChannel = supabase
      .channel(`spark_answers:live:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spark_answers" },
        () => {
          void refresh({ silent: true })
        },
      )
      .subscribe()

    const poll = window.setInterval(() => {
      void refresh({ silent: true })
    }, 2500)

    return () => {
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(sparkAnswersChannel)
      window.clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const approveLike = async (otherUserId: string) => {
    setError(null)
    setIncomingActionLoading("accept")
    try {
      const { data: existingRows, error: existingError } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`)
        .limit(1)
      if (existingError) throw existingError

      if (!existingRows || existingRows.length === 0) {
        const { error: insertMatchError } = await supabase
          .from("matches")
          .insert({ user_a: userId, user_b: otherUserId, status: "pending" })
        if (insertMatchError && (insertMatchError as { code?: string }).code !== "23505") {
          throw insertMatchError
        }
      }

      const { error: likeAError } = await supabase
        .from("likes")
        .upsert(
          { from_user_id: userId, to_user_id: otherUserId, status: "mutual" },
          { onConflict: "from_user_id,to_user_id" },
        )
      if (likeAError) throw likeAError

      // Update incoming like only if present and visible by policy.
      const { error: likeBError } = await supabase
        .from("likes")
        .update({ status: "mutual" })
        .eq("from_user_id", otherUserId)
        .eq("to_user_id", userId)
      if (likeBError) {
        // Don't fail the entire flow here; match row already exists and drives spark category.
      }

      setProfileSheet(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve like")
    } finally {
      setIncomingActionLoading(null)
    }
  }

  const declineLike = async (otherUserId: string) => {
    setError(null)
    setIncomingActionLoading("decline")
    try {
      const { error: deleteIncomingLikeError } = await supabase
        .from("likes")
        .delete()
        .eq("from_user_id", otherUserId)
        .eq("to_user_id", userId)
      if (deleteIncomingLikeError) throw deleteIncomingLikeError

      const { error: deleteOutgoingLikeError } = await supabase
        .from("likes")
        .delete()
        .eq("from_user_id", userId)
        .eq("to_user_id", otherUserId)
      if (deleteOutgoingLikeError) throw deleteOutgoingLikeError

      const { error: deleteMatchError } = await supabase
        .from("matches")
        .delete()
        .or(`and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`)
      if (deleteMatchError) throw deleteMatchError

      setProfileSheet(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to decline like")
    } finally {
      setIncomingActionLoading(null)
    }
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
      const { error: upsertError } = await supabase
        .from("spark_answers")
        .upsert(
          { match_id: sparkMatchId, user_id: userId, answer: answer.trim() },
          { onConflict: "match_id,user_id" },
        )
      if (upsertError) {
        throw new Error(upsertError.message || "Could not save your answer")
      }

      const { data: matchRow, error: matchErr } = await supabase
        .from("matches")
        .select("id,user_a,user_b")
        .eq("id", sparkMatchId)
        .single()
      if (matchErr || !matchRow) {
        throw new Error(matchErr?.message ?? "Match not found")
      }

      const { data: answers, error: answersErr } = await supabase
        .from("spark_answers")
        .select("user_id")
        .eq("match_id", sparkMatchId)
      if (answersErr) {
        throw new Error(answersErr.message)
      }
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
                  <div key={r.other.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-card p-3 last:mb-0">
                    <MatchRowProfileTrigger
                      user={r.other}
                      onPress={() =>
                        setProfileSheet({ kind: "incoming_like", user: r.other, fromUserId: r.fromUserId })
                      }
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                      onClick={() => void approveLike(r.fromUserId)}
                    >
                      Approve
                    </button>
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
                  <div key={r.match.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-card p-3 last:mb-0">
                    <MatchRowProfileTrigger
                      user={r.other}
                      onPress={() => setProfileSheet({ kind: "browse", user: r.other })}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                      onClick={() => void openSparkPrompt(r.match.id)}
                    >
                      Answer spark
                    </button>
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
                  <div
                    key={`${r.other.id}-${r.stage}`}
                    className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-card p-3 last:mb-0"
                  >
                    <MatchRowProfileTrigger
                      user={r.other}
                      onPress={() => setProfileSheet({ kind: "browse", user: r.other })}
                    />
                    {r.stage === "spark" ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-100/90">
                        <Flame className="h-3.5 w-3.5 fill-amber-300/80 text-amber-300" />
                        Spark sent
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-300/10 px-2.5 py-1 text-[11px] font-medium text-rose-100/90">
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
                  <div key={r.match.id} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-card p-3 last:mb-0">
                    <MatchRowProfileTrigger
                      user={r.other}
                      onPress={() => setProfileSheet({ kind: "browse", user: r.other })}
                    />
                    {r.bothAnswered && !seenSparkRevealIds.has(r.match.id) ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                        onClick={() => {
                          setSparkRevealMatchId(r.match.id)
                          setSparkRevealProfile({
                            name: r.other.display_name ?? "Your match",
                            bio: r.other.bio ?? "Your connection is unlocked. Start the conversation.",
                            photos: r.other.avatar_url ? [r.other.avatar_url] : [],
                          })
                        }}
                      >
                        See spark
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        onClick={() => onGoToChat?.(r.match.id)}
                      >
                        Go to chat
                      </button>
                    )}
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
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-[120px] w-full rounded-xl border px-3 py-2 text-sm" />
            {sparkError && <div className="mt-2 text-sm text-rose-300">{sparkError}</div>}
            <button
              type="button"
              disabled={sparkLoading}
              onClick={() => void submitSparkAnswer()}
              className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sparkLoading ? "Saving…" : "Unlock spark"}
            </button>
          </div>
        </div>
      )}

      {sparkRevealProfile && sparkRevealMatchId && (
        <SparkReveal
          currentUserName={currentUserName}
          matchedProfile={sparkRevealProfile}
          onComplete={() => {
            const matchId = sparkRevealMatchId
            markSparkRevealSeen(matchId)
            setSparkRevealProfile(null)
            setSparkRevealMatchId(null)
            onGoToChat?.(matchId)
          }}
        />
      )}

      <AnimatePresence>
        {profileSheet && profileSheetLockedPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[85] bg-black/70 p-3 sm:p-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="mx-auto h-full w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#0d0d14] shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
            >
              <div className="relative h-full w-full">
                <img
                  src={profileSheetLockedPreview.heroUrl}
                  alt={profileSheet.user.display_name ?? "Profile"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
                <button
                  type="button"
                  onClick={() => setProfileSheet(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/30 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/45"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-4 pb-5 text-white">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                    {profileSheet.kind === "incoming_like" ? "Liked you" : "Profile"}
                  </div>
                  <h2 className="mt-1 text-4xl font-semibold leading-none text-white">
                    {profileSheet.user.display_name ?? "Unknown"}
                    {profileSheet.user.age ? (
                      <span className="ml-2 text-white/65">{profileSheet.user.age}</span>
                    ) : null}
                  </h2>
                  {profileSheet.user.city ? (
                    <div className="mt-2 flex items-center gap-1.5 text-white/75">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-sm">{profileSheet.user.city}</span>
                    </div>
                  ) : null}

                  <p className="mt-2 text-base leading-relaxed text-white/92">
                    {profileSheetLockedPreview.previewBio}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profileSheetLockedPreview.previewTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white">
                        {tag}
                      </span>
                    ))}
                    {profileSheetLockedPreview.hiddenTagCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/65">
                        <Lock className="h-3 w-3" />+{profileSheetLockedPreview.hiddenTagCount}
                      </span>
                    ) : null}
                    {profileSheetLockedPreview.hiddenPhotoCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/65">
                        <Lock className="h-3 w-3" />+{profileSheetLockedPreview.hiddenPhotoCount} photos
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                    <Lock className="h-3.5 w-3.5 text-white/55" />
                    <span className="text-xs text-white/65">Spark to unlock full profile</span>
                  </div>

                  {profileSheet.kind === "incoming_like" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={incomingActionLoading !== null}
                        onClick={() => void declineLike(profileSheet.user.id)}
                        className="rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {incomingActionLoading === "decline" ? "Declining..." : "Decline"}
                      </button>
                      <button
                        type="button"
                        disabled={incomingActionLoading !== null}
                        onClick={() => void approveLike(profileSheet.fromUserId)}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {incomingActionLoading === "accept" ? "Accepting..." : "Accept"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProfileSheet(null)}
                      className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-black/45"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

