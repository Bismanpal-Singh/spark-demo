"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Flame, MapPin, Send, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { supabase } from "@/src/supabase"
import { IgniteConfirmSheet, IgniteDateFlow } from "@/components/IgniteDateFlow"
import { selectTask, type TaskProfile } from "@/lib/tasks"
import { IGNITE_UI_FONT } from "@/lib/igniteUI"
import { toDiscoverProfile, type DiscoverProfile, type RichUserRow } from "@/lib/profileVisibility"
import { Badge } from "@/components/ui/badge"

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

type ChatConversationProps = {
  userId: string
  match: MatchRow
  other: UserRow
  answers: { a: string | null; b: string | null }
  onBack: () => void
}

type ChatMessageRow = {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

type DateRequestRow = {
  id: string
  match_id: string
  requested_by: string
  status: "pending" | "accepted" | "declined"
}

type FrictionTaskRow = {
  id: string
  match_id: string
  task_key: string
  user_a_response: string | null
  user_b_response: string | null
  status: "active" | "complete"
}

type ProfileTaskRow = {
  id: string
  display_name: string | null
  city: string | null
  preferences: string[] | null
  avatar_url: string | null
}

type MeMini = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function ChatConversation({
  userId,
  match,
  other,
  answers,
  onBack,
}: ChatConversationProps) {
  const iAmA = match.user_a === userId
  const theirAnswer = iAmA ? answers.b : answers.a
  const myAnswer = iAmA ? answers.a : answers.b

  const [showMyAnswer, setShowMyAnswer] = useState(false)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: "me" | "them"; text: string; timestamp: string }>
  >([])
  const [error, setError] = useState<string | null>(null)
  const unlocked = true
  const [dateRequest, setDateRequest] = useState<DateRequestRow | null>(null)
  const [taskRow, setTaskRow] = useState<FrictionTaskRow | null>(null)
  const [showIgniteSheet, setShowIgniteSheet] = useState(false)
  const [showIgniteFlow, setShowIgniteFlow] = useState(false)
  const [igniteFlowMode, setIgniteFlowMode] = useState<"intro" | "task">("intro")
  const [meProfile, setMeProfile] = useState<MeMini>({ id: userId, display_name: "you", avatar_url: null })
  /** Previous date_request.status within this mount — resets on leave/return so we don't re-fire auto-open. */
  const prevDateRequestStatusRef = useRef<DateRequestRow["status"] | undefined>(undefined)
  /** Previous friction_tasks.status within this mount — same as above for the reveal. */
  const prevTaskStatusRef = useRef<FrictionTaskRow["status"] | undefined>(undefined)
  const [lastCompletedRevealTaskId, setLastCompletedRevealTaskId] = useState<string | null>(null)
  const [icebreakerUserDismissed, setIcebreakerUserDismissed] = useState(false)

  const icebreakerDismissStorageKey = `chat-icebreaker-dismissed:${userId}:${match.id}`

  useEffect(() => {
    try {
      setIcebreakerUserDismissed(localStorage.getItem(icebreakerDismissStorageKey) === "1")
    } catch {
      setIcebreakerUserDismissed(false)
    }
  }, [icebreakerDismissStorageKey])

  const igniteFrictionComplete = taskRow?.status === "complete"
  const myFrictionAnswer = taskRow ? (iAmA ? taskRow.user_a_response : taskRow.user_b_response) : null
  const theirFrictionAnswer = taskRow ? (iAmA ? taskRow.user_b_response : taskRow.user_a_response) : null
  const bothFrictionFilled =
    taskRow?.user_a_response != null && taskRow?.user_b_response != null
  const frictionPlanReady =
    dateRequest?.status === "accepted" &&
    taskRow != null &&
    (taskRow.status === "complete" || bothFrictionFilled)
  const frictionWaitingOnThem =
    dateRequest?.status === "accepted" &&
    taskRow?.status === "active" &&
    myFrictionAnswer != null &&
    theirFrictionAnswer == null

  const showPinnedIcebreaker =
    !igniteFrictionComplete && !icebreakerUserDismissed && Boolean(theirAnswer && myAnswer)

  const dismissIcebreakerPinned = () => {
    setIcebreakerUserDismissed(true)
    try {
      localStorage.setItem(icebreakerDismissStorageKey, "1")
    } catch {
      // non-blocking
    }
  }

  const [partnerProfileOpen, setPartnerProfileOpen] = useState(false)
  const [partnerRich, setPartnerRich] = useState<RichUserRow | null>(null)
  const [partnerProfileLoading, setPartnerProfileLoading] = useState(false)
  const [partnerProfileError, setPartnerProfileError] = useState<string | null>(null)

  useEffect(() => {
    setPartnerRich(null)
    setPartnerProfileOpen(false)
    setPartnerProfileError(null)
  }, [other.id, match.id])

  const partnerFullProfile = useMemo((): DiscoverProfile | null => {
    if (!partnerRich) return null
    return toDiscoverProfile(partnerRich, true)
  }, [partnerRich])

  const loadPartnerFullProfile = async () => {
    setPartnerProfileLoading(true)
    setPartnerProfileError(null)
    try {
      const rich = await supabase
        .from("users")
        .select(
          "id,display_name,age,city,tagline,bio,avatar_url,gallery_urls,preferences,looking_for,fun_fact",
        )
        .eq("id", other.id)
        .maybeSingle()

      if (rich.error) {
        const basic = await supabase
          .from("users")
          .select("id,display_name,age,city,tagline,bio,avatar_url")
          .eq("id", other.id)
          .maybeSingle()
        if (basic.error) throw basic.error
        setPartnerRich(basic.data as RichUserRow)
      } else {
        setPartnerRich((rich.data ?? null) as RichUserRow | null)
      }
    } catch (e) {
      setPartnerProfileError(e instanceof Error ? e.message : "Failed to load profile")
      setPartnerRich({
        id: other.id,
        display_name: other.display_name,
        avatar_url: other.avatar_url,
        tagline: null,
        bio: null,
        age: null,
        city: null,
      })
    } finally {
      setPartnerProfileLoading(false)
    }
  }

  const openPartnerProfile = () => {
    setPartnerProfileOpen(true)
    if (partnerRich?.id !== other.id) {
      void loadPartnerFullProfile()
    }
  }

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: chatRows } = await supabase
        .from("messages")
        .select("id,sender_id,content,created_at")
        .eq("match_id", match.id)
        .order("created_at", { ascending: true })

      setMessages(
        (chatRows ?? []).map((m) => ({
          id: m.id,
          sender: m.sender_id === userId ? "me" : "them",
          text: m.content,
          timestamp: formatTime(m.created_at),
        })),
      )

      await refreshDateAndTask()

      const { data: meRow } = await supabase
        .from("users")
        .select("id,display_name,avatar_url")
        .eq("id", userId)
        .maybeSingle()
      if (meRow) setMeProfile(meRow as MeMini)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, userId])

  useEffect(() => {
    const cur = dateRequest?.status
    const prev = prevDateRequestStatusRef.current

    if (cur !== "accepted") {
      prevDateRequestStatusRef.current = cur
      return
    }

    prevDateRequestStatusRef.current = "accepted"

    // Only auto-open when we *transition* into accepted (e.g. user tapped "i'm in").
    // If the first fetch is already accepted (return visit / remount), do nothing.
    if (prev !== "pending") return
    // Accept handler may have already opened the flow; avoid stacking the same open.
    if (showIgniteFlow) return

    void (async () => {
      try {
        await ensureFrictionTask()
      } catch {
        // non-blocking
      }
      setIgniteFlowMode("intro")
      setShowIgniteFlow(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRequest?.status, showIgniteFlow])

  useEffect(() => {
    if (!taskRow) {
      prevTaskStatusRef.current = undefined
      return
    }

    const cur = taskRow.status
    const prev = prevTaskStatusRef.current
    prevTaskStatusRef.current = cur

    if (cur !== "complete" || showIgniteFlow) return
    if (lastCompletedRevealTaskId === taskRow.id) return

    // Only auto-open when both answers just landed (active → complete), not when
    // we open chat and the task is already complete.
    if (prev !== "active") return

    setIgniteFlowMode("task")
    setShowIgniteFlow(true)
  }, [taskRow, showIgniteFlow, lastCompletedRevealTaskId])

  useEffect(() => {
    // Realtime subscription for live chat messages.
    const channel = supabase
      .channel(`messages:${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow
          if (!row) return

          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              sender: row.sender_id === userId ? "me" : "them",
              text: row.content,
              timestamp: formatTime(row.created_at),
            },
          ])
        },
      )
      .subscribe()

    const dateRequestChannel = supabase
      .channel(`date_requests:${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "date_requests",
          filter: `match_id=eq.${match.id}`,
        },
        async () => {
          await refreshDateAndTask()
        },
      )
      .subscribe()

    const frictionChannel = supabase
      .channel(`friction_tasks:${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friction_tasks",
          filter: `match_id=eq.${match.id}`,
        },
        async () => {
          await refreshDateAndTask()
        },
      )
      .subscribe()

    const poll = window.setInterval(() => {
      void refreshDateAndTask()
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(dateRequestChannel)
      supabase.removeChannel(frictionChannel)
      window.clearInterval(poll)
    }
  }, [match.id, userId])

  const [newMessage, setNewMessage] = useState("")

  const isRequester = dateRequest?.requested_by === userId
  const requestPending = dateRequest?.status === "pending"
  const incomingPending = requestPending && !isRequester
  const igniteChipMuted =
    (requestPending && isRequester) || (dateRequest?.status === "accepted" && !frictionPlanReady)

  const refreshDateAndTask = async () => {
    const { data: requestRow } = await supabase
      .from("date_requests")
      .select("id,match_id,requested_by,status")
      .eq("match_id", match.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    setDateRequest((requestRow as DateRequestRow | null) ?? null)

    const { data: friction } = await supabase
      .from("friction_tasks")
      .select("id,match_id,task_key,user_a_response,user_b_response,status")
      .eq("match_id", match.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    setTaskRow((friction as FrictionTaskRow | null) ?? null)
  }

  const ensureFrictionTask = async () => {
    if (taskRow) return taskRow

    const { data: profiles } = await supabase
      .from("users")
      .select("id,display_name,city,preferences,avatar_url")
      .in("id", [match.user_a, match.user_b])

    const profileMap = new Map<string, ProfileTaskRow>()
    ;((profiles ?? []) as ProfileTaskRow[]).forEach((p) => profileMap.set(p.id, p))
    const a = profileMap.get(match.user_a)
    const b = profileMap.get(match.user_b)
    if (!a || !b) return null

    const aTask: TaskProfile = {
      id: a.id,
      displayName: a.display_name ?? "A",
      city: a.city,
      interests: (a.preferences ?? []).filter(Boolean),
    }
    const bTask: TaskProfile = {
      id: b.id,
      displayName: b.display_name ?? "B",
      city: b.city,
      interests: (b.preferences ?? []).filter(Boolean),
    }
    const selected = selectTask(aTask, bTask, match.id)

    const payload = {
      match_id: match.id,
      task_key: selected.key,
      status: "active" as const,
      user_a_response: null,
      user_b_response: null,
    }
    const { data: inserted, error } = await supabase
      .from("friction_tasks")
      .insert(payload)
      .select("id,match_id,task_key,user_a_response,user_b_response,status")
      .single()
    if (error) throw error
    const row = inserted as FrictionTaskRow
    setTaskRow(row)
    return row
  }

  const triggerIgnite = async () => {
    setError(null)
    try {
      const payload = {
        match_id: match.id,
        requested_by: userId,
        status: "pending" as const,
      }
      const { error: upsertError } = await supabase
        .from("date_requests")
        .upsert(payload, { onConflict: "match_id" })
      if (upsertError) throw upsertError
      setDateRequest({ id: "temp", ...payload })
      setShowIgniteSheet(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to ignite date request")
    }
  }

  const acceptIncomingRequest = async () => {
    if (!dateRequest) return
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from("date_requests")
        .update({ status: "accepted" })
        .eq("id", dateRequest.id)
      if (updateError) throw updateError
      await supabase.from("matches").update({ status: "dating" }).eq("id", match.id)
      await ensureFrictionTask()
      prevDateRequestStatusRef.current = "accepted"
      setDateRequest({ ...dateRequest, status: "accepted" })
      setIgniteFlowMode("intro")
      setShowIgniteFlow(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to accept request")
    }
  }

  const declineIncomingRequest = async () => {
    if (!dateRequest) return
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from("date_requests")
        .update({ status: "declined" })
        .eq("id", dateRequest.id)
      if (updateError) throw updateError
      setDateRequest({ ...dateRequest, status: "declined" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to decline request")
    }
  }

  const submitTaskResponse = async (response: string) => {
    if (!taskRow) return { bothAnswered: false }
    const patch = iAmA ? { user_a_response: response } : { user_b_response: response }
    const { error: updateError } = await supabase.from("friction_tasks").update(patch).eq("id", taskRow.id)
    if (updateError) throw updateError

    const { data: fresh } = await supabase
      .from("friction_tasks")
      .select("id,match_id,task_key,user_a_response,user_b_response,status")
      .eq("id", taskRow.id)
      .single()
    const row = fresh as FrictionTaskRow
    if (row.user_a_response != null && row.user_b_response != null && row.status !== "complete") {
      await supabase.from("friction_tasks").update({ status: "complete" }).eq("id", row.id)
      row.status = "complete"
    }
    setTaskRow(row)
    return { bothAnswered: row.user_a_response != null && row.user_b_response != null }
  }

  const closeIgniteFlow = () => {
    if (taskRow?.status === "complete") {
      setLastCompletedRevealTaskId(taskRow.id)
    }
    setShowIgniteFlow(false)
  }

  const sendMessage = async () => {
    const trimmed = newMessage.trim()
    if (!trimmed || !unlocked) return
    setNewMessage("")
    try {
      const payload = {
        match_id: match.id,
        sender_id: userId,
        content: trimmed,
      }
      const { error: insertError } = await supabase.from("messages").insert(payload)
      if (insertError) throw insertError
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message")
    }
  }

  const pinned = useMemo(
    () => ({
      their: theirAnswer ?? "—",
      mine: myAnswer ?? "—",
    }),
    [theirAnswer, myAnswer],
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => openPartnerProfile()}
              className="flex min-w-0 items-center gap-3 rounded-2xl py-1 pl-1 pr-3 text-left transition-colors hover:bg-muted/60"
            >
              <img
                src={other.avatar_url ?? ""}
                alt={other.display_name ?? "Profile"}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-foreground">{other.display_name ?? "Unknown"}</h2>
                <p className="text-xs text-muted-foreground">Matched · full profile</p>
              </div>
            </button>
          </div>

          <button
            type="button"
            style={{ fontFamily: IGNITE_UI_FONT }}
            onClick={() => {
              if (requestPending && isRequester) {
                setIgniteFlowMode("task")
                setShowIgniteFlow(true)
                return
              }
              if (dateRequest?.status === "accepted") {
                setIgniteFlowMode("task")
                setShowIgniteFlow(true)
                return
              }
              setShowIgniteSheet(true)
            }}
            className={
              igniteChipMuted
                ? "inline-flex max-w-[min(46vw,11rem)] shrink-0 items-center gap-2 rounded-2xl border border-white/[0.1] bg-[#0c0c0f]/85 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-[background-color,border-color] duration-200 hover:border-white/15 hover:bg-[#121218]/90"
                : dateRequest?.status === "accepted"
                  ? "inline-flex max-w-[min(46vw,11rem)] shrink-0 items-center gap-2 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-400/22 to-amber-950/50 px-3 py-2 shadow-[0_0_28px_rgba(251,191,36,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.98]"
                  : "inline-flex max-w-[min(46vw,11rem)] shrink-0 items-center gap-2 rounded-2xl border border-amber-400/28 bg-gradient-to-b from-amber-400/16 to-[#0c0c0f] px-3 py-2 shadow-[0_0_24px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-[filter,transform,border-color] duration-200 hover:border-amber-400/38 hover:from-amber-400/22 active:scale-[0.98]"
            }
          >
            <span
              className={
                igniteChipMuted
                  ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06]"
                  : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/18 ring-1 ring-amber-400/25"
              }
            >
              <Flame
                className={
                  igniteChipMuted ? "h-3.5 w-3.5 text-white/35" : "h-3.5 w-3.5 text-amber-300"
                }
                strokeWidth={1.75}
              />
            </span>
            <span
              className={
                igniteChipMuted
                  ? "truncate text-[11px] font-medium tracking-wide text-white/50"
                  : "truncate text-[11px] font-semibold tracking-[0.06em] text-amber-50/95"
              }
            >
              {requestPending && isRequester
                ? "Request sent"
                : frictionPlanReady
                  ? "View plan"
                  : dateRequest?.status === "accepted" && frictionWaitingOnThem
                    ? "Waiting on them"
                    : dateRequest?.status === "accepted"
                      ? "Awaiting answer"
                      : "Ignite a date"}
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          {showPinnedIcebreaker && (
            <div className="relative rounded-2xl border border-white/10 bg-card/70 p-3 pr-10 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={dismissIcebreakerPinned}
                aria-label="Dismiss icebreaker"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    Icebreaker
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">
                    <span className="text-muted-foreground">Them:</span> {pinned.their}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowMyAnswer((v) => !v)}
                  className="w-full rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted/30"
                >
                  {showMyAnswer ? "Hide your answer" : "Show your answer"}
                </button>

                <AnimatePresence>
                  {showMyAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 rounded-xl bg-primary/10 p-3"
                    >
                      <div className="text-xs font-semibold text-primary">You</div>
                      <div className="mt-1 text-sm text-foreground/90">{pinned.mine}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
              <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted/80" />
            </div>
          )}

          {requestPending && isRequester && (
            <motion.div
              style={{ fontFamily: IGNITE_UI_FONT }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-auto w-fit max-w-[78%] overflow-hidden rounded-2xl border border-amber-400/18 bg-[#0c0c0f]/90 p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/12 ring-1 ring-amber-400/25">
                  <Flame className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400/90">Request sent</div>
                  <div className="mt-0.5 text-[12px] font-medium tracking-wide text-white/45">Waiting for their reply</div>
                </div>
              </div>
              <div className="mt-3 h-px w-full rounded-full bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />
            </motion.div>
          )}

          {incomingPending && (
            <motion.div
              style={{ fontFamily: IGNITE_UI_FONT }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-amber-400/22 bg-[#0c0c0f]/95 p-6 shadow-[0_16px_56px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent"
                aria-hidden
              />
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 scale-150 rounded-full bg-amber-400/15 blur-lg"
                    aria-hidden
                  />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 to-amber-600/10 ring-1 ring-amber-400/30">
                    <Flame className="h-6 w-6 text-amber-400" strokeWidth={1.75} />
                  </div>
                </div>
                <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Ignite invite</p>
                <p className="mt-2 px-1 text-[15px] font-medium leading-snug tracking-[-0.01em] text-white/92">
                  <span className="text-white">{(other.display_name ?? "they").toLowerCase()}</span>
                  <span className="text-white/55"> wants to ignite a date</span>
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => void acceptIncomingRequest()}
                  className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-[15px] font-semibold tracking-wide text-neutral-950 shadow-[0_8px_28px_rgba(251,191,36,0.22)] transition-[filter,transform] duration-200 hover:brightness-[1.03] active:scale-[0.99]"
                >
                  i&apos;m in
                </button>
                <button
                  type="button"
                  onClick={() => void declineIncomingRequest()}
                  className="h-12 w-full rounded-2xl border border-white/[0.12] bg-white/[0.03] text-[14px] font-medium tracking-wide text-white/55 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/75"
                >
                  not yet
                </button>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.sender === "me"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  <p
                    className={`mt-1 text-xs ${
                      m.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {m.timestamp}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-foreground/90">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sendMessage()}
            className="flex-1 rounded-full bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <button
            onClick={() => void sendMessage()}
            disabled={!newMessage.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      <IgniteConfirmSheet
        open={showIgniteSheet}
        name={other.display_name ?? "them"}
        avatarUrl={other.avatar_url}
        onClose={() => setShowIgniteSheet(false)}
        onIgnite={() => void triggerIgnite()}
      />

      <IgniteDateFlow
        open={showIgniteFlow}
        match={{ id: match.id, user_a: match.user_a, user_b: match.user_b }}
        me={meProfile}
        other={other}
        task={taskRow}
        mode={igniteFlowMode}
        onClose={closeIgniteFlow}
        onSubmitResponse={submitTaskResponse}
      />

      <AnimatePresence>
        {partnerProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
          >
            <motion.button
              type="button"
              aria-label="Close profile"
              className="absolute inset-0"
              onClick={() => setPartnerProfileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="relative z-[101] flex max-h-[min(92dvh,820px)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-border/80 bg-card shadow-2xl sm:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Profile</span>
                <button
                  type="button"
                  onClick={() => setPartnerProfileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {partnerProfileLoading && !partnerFullProfile && (
                  <div className="space-y-3 p-4">
                    <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                )}

                {partnerProfileError && (
                  <p className="p-4 text-sm text-rose-400/90">{partnerProfileError}</p>
                )}

                {partnerFullProfile && (
                  <div className="pb-6">
                    <div className="space-y-2 px-3 pt-2">
                      {partnerFullProfile.photos.filter(Boolean).map((src, i) => (
                        <div
                          key={`${src}-${i}`}
                          className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
                        >
                          <img src={src} alt="" className="aspect-[4/5] w-full object-cover sm:aspect-[3/4]" />
                        </div>
                      ))}
                    </div>

                    <div className="px-4 pt-4">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-foreground">{partnerFullProfile.name}</h3>
                        {partnerFullProfile.age ? (
                          <span className="text-lg font-light text-muted-foreground">{partnerFullProfile.age}</span>
                        ) : null}
                      </div>
                      {partnerFullProfile.city && partnerFullProfile.city !== "Unknown" ? (
                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">{partnerFullProfile.city}</span>
                        </div>
                      ) : null}

                      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{partnerFullProfile.fullBio}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {partnerFullProfile.allInterests.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {partnerFullProfile.lookingFor ? (
                        <p className="mt-4 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Looking for:</span>{" "}
                          {partnerFullProfile.lookingFor}
                        </p>
                      ) : null}
                      {partnerFullProfile.funFact ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Fun fact:</span>{" "}
                          {partnerFullProfile.funFact}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

