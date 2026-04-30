"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { getTaskByKey } from "@/lib/tasks"
import { IGNITE_UI_FONT } from "@/lib/igniteUI"

type MatchRow = {
  id: string
  user_a: string
  user_b: string
}

type UserMini = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type TaskRow = {
  id: string
  match_id: string
  task_key: string
  user_a_response: string | null
  user_b_response: string | null
  status: "active" | "complete"
}

function BonfireSvg({
  sparkActive,
  bonfireVisible,
  breathing,
}: {
  sparkActive: boolean
  bonfireVisible: boolean
  breathing: boolean
}) {
  return (
    <svg width="124" height="104" viewBox="0 0 124 104" className="mx-auto">
      {/* logs - static */}
      <rect x="36" y="79" width="52" height="8" rx="4" fill="#3d2b1f" opacity="0.95" transform="rotate(-10 62 83)" />
      <rect x="36" y="79" width="52" height="8" rx="4" fill="#3d2b1f" opacity="0.88" transform="rotate(10 62 83)" />
      <rect x="43" y="82" width="38" height="7" rx="3.5" fill="#3d2b1f" opacity="0.82" />

      {/* falling spark (teardrop) */}
      {sparkActive && (
        <motion.path
          d="M62 31C62 31 62 34 60 35.5C58 37 58 38.5 58 39C58 40.93 59.79 42.5 62 42.5C64.21 42.5 66 40.93 66 39C66 38.5 66 37 64 35.5C62 34 62 31 62 31Z"
          fill="#fb923c"
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, 0, 31, 31],
          }}
          transition={{
            duration: 1.05,
            times: [0, 0.55, 0.9, 1],
            ease: "easeInOut",
          }}
        />
      )}

      {/* bonfire flames (grow + breathe) */}
      <motion.path
        d="M62 77C62 77 62 65 51 57C42 51 44 68 44 73C44 81 51 89 62 89C73 89 80 81 80 73C80 68 82 51 73 57C62 65 62 77 62 77Z"
        fill="#fb923c"
        style={{ originX: "50%", originY: "77px" }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={
          bonfireVisible
            ? breathing
              ? { opacity: [1, 1, 0.9, 1], scaleY: [1, 1.05, 0.9, 1] }
              : { opacity: 1, scaleY: 1 }
            : { opacity: 0, scaleY: 0 }
        }
        transition={
          breathing
            ? { duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
            : { duration: 0.6, ease: "easeOut", delay: 0 }
        }
      />
      <motion.path
        d="M62 79C62 79 62 69 54 63C48 59 49 71 49 75C49 81 54 87 62 87C70 87 75 81 75 75C75 71 76 59 70 63C62 69 62 79 62 79Z"
        fill="#fcd34d"
        style={{ originX: "50%", originY: "79px" }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={
          bonfireVisible
            ? breathing
              ? { opacity: [1, 1, 0.92, 1], scaleY: [1, 1.04, 0.91, 1] }
              : { opacity: 1, scaleY: 1 }
            : { opacity: 0, scaleY: 0 }
        }
        transition={
          breathing
            ? { duration: 2.1, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
            : { duration: 0.6, ease: "easeOut", delay: 0.08 }
        }
      />
      <motion.path
        d="M62 81C62 81 62 74 57 70C53 67 54 75 54 77.5C54 82 57.5 85.5 62 85.5C66.5 85.5 70 82 70 77.5C70 75 71 67 67 70C62 74 62 81 62 81Z"
        fill="#fed7aa"
        style={{ originX: "50%", originY: "81px" }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={
          bonfireVisible
            ? breathing
              ? { opacity: [1, 1, 0.94, 1], scaleY: [1, 1.03, 0.92, 1] }
              : { opacity: 1, scaleY: 1 }
            : { opacity: 0, scaleY: 0 }
        }
        transition={
          breathing
            ? { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
            : { duration: 0.6, ease: "easeOut", delay: 0.16 }
        }
      />
    </svg>
  )
}

export function IgniteDateFlow({
  open,
  match,
  me,
  other,
  task,
  mode = "intro",
  onClose,
  onSubmitResponse,
}: {
  open: boolean
  match: MatchRow
  me: UserMini
  other: UserMini
  task: TaskRow | null
  mode?: "intro" | "task"
  onClose: () => void
  onSubmitResponse: (answer: string) => Promise<{ bothAnswered: boolean }>
}) {
  const [showFlame, setShowFlame] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [showTagline, setShowTagline] = useState(false)
  const [showTaskCard, setShowTaskCard] = useState(false)
  const [revealResponses, setRevealResponses] = useState(false)
  const [showBonfire, setShowBonfire] = useState(false)
  const [bonfireBreathing, setBonfireBreathing] = useState(false)
  const [responseText, setResponseText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const finishRef = useRef(false)

  const iAmA = match.user_a === me.id
  /** Null means not submitted yet; empty string is a valid submitted answer. */
  const myResponse = iAmA ? task?.user_a_response ?? null : task?.user_b_response ?? null
  const theirResponse = iAmA ? task?.user_b_response ?? null : task?.user_a_response ?? null
  const iSubmittedMyResponse = task
    ? (iAmA ? task.user_a_response != null : task.user_b_response != null)
    : false
  const bothAnswered =
    task != null && task.user_a_response != null && task.user_b_response != null

  const taskText = useMemo(() => {
    if (!task?.task_key) return "choose one specific plan for your first date and explain why it fits both of you."
    return getTaskByKey(task.task_key)?.text ?? "choose one specific plan for your first date and explain why it fits both of you."
  }, [task?.task_key])

  useEffect(() => {
    if (!open) return
    setShowFlame(false)
    setShowNames(false)
    setShowTagline(false)
    setShowTaskCard(false)
    setRevealResponses(false)
    setShowBonfire(false)
    setBonfireBreathing(false)
    finishRef.current = false

    if (mode === "task") {
      // Skip intro timeline but always show burning bonfire with the task card.
      setShowBonfire(true)
      setBonfireBreathing(true)
      setShowTaskCard(true)
      return
    }

    const t1 = window.setTimeout(() => setShowFlame(true), 0)
    const t2 = window.setTimeout(() => setShowBonfire(true), 1000)
    const t3 = window.setTimeout(() => setBonfireBreathing(true), 1600)
    const t4 = window.setTimeout(() => setShowNames(true), 1800)
    const t5 = window.setTimeout(() => setShowTagline(true), 2000)
    const t6 = window.setTimeout(() => setShowTaskCard(true), 2800)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      window.clearTimeout(t5)
      window.clearTimeout(t6)
    }
  }, [open, mode])

  useEffect(() => {
    if (!open || !bothAnswered) return
    setRevealResponses(true)
  }, [open, bothAnswered])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#080808]">
      <div className="w-full max-w-[390px] px-5">
        {!revealResponses ? (
          <>
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              className="mx-auto flex min-h-[72vh] flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showBonfire || showFlame ? 1 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <BonfireSvg sparkActive={showFlame} bonfireVisible={showBonfire} breathing={bonfireBreathing} />
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: showNames ? 1 : 0 }} transition={{ duration: 0.42, ease: "easeInOut" }} className="mt-4 text-[15px] font-medium tracking-[0.01em] text-white">
                {(me.display_name ?? "you")} &amp; {(other.display_name ?? "them")}
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: showTagline ? 1 : 0 }} transition={{ duration: 0.42, ease: "easeInOut" }} className="mt-2 text-[11px] tracking-[0.05em] text-amber-400/95">
                you're going on a date
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showTaskCard ? 1 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="mt-8 w-full max-w-[380px] rounded-2xl border border-white/10 bg-[#161616] p-5 text-left"
              >
                <div className="text-[10px] uppercase tracking-[0.1em] text-white/30">your date task</div>
                <div className="my-3 h-px w-full bg-white/10" />
                <p className="text-sm leading-relaxed text-white/70">{taskText}</p>

                {!iSubmittedMyResponse ? (
                  <div className="mt-4">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="your answer..."
                      className="min-h-[92px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (submitting) return
                        setSubmitting(true)
                        const result = await onSubmitResponse(responseText)
                        setSubmitting(false)
                        // Async flow: return user back to chat immediately unless both are done right now.
                        if (!result.bothAnswered) {
                          onClose()
                        }
                      }}
                      disabled={submitting}
                      className="mt-3 h-11 w-full rounded-xl bg-amber-400 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      submit
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-white/35">
                    <span>waiting for {other.display_name ?? "them"}...</span>
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400/70" />
                  </div>
                )}
              </motion.div>

              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: showTaskCard ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.2, ease: "easeInOut" }}
                onClick={() => {
                  if (finishRef.current) return
                  finishRef.current = true
                  onClose()
                }}
                className="mt-5 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
              >
                {!iSubmittedMyResponse ? "Answer later" : "Continue to chat"}
              </motion.button>
            </motion.div>
          </>
        ) : (
          <div className="mx-auto flex min-h-[72vh] flex-col items-center justify-center text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <BonfireSvg sparkActive={false} bonfireVisible={true} breathing={true} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: "easeInOut" }} className="text-[11px] tracking-[0.04em] text-amber-400">
              both answered
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.3, ease: "easeInOut" }} className="mt-4 w-full max-w-[340px] rounded-2xl border border-white/10 bg-[#161616] p-4 text-left">
              <div className="flex items-center gap-3">
                <img src={me.avatar_url ?? ""} alt={me.display_name ?? "you"} className="h-10 w-10 rounded-full object-cover" />
                <div className="text-[13px] text-white/60">{me.display_name ?? "you"}</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white">{myResponse ?? ""}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.45, ease: "easeInOut" }} className="mt-3 w-full max-w-[340px] rounded-2xl border border-white/10 bg-[#161616] p-4 text-left">
              <div className="flex items-center gap-3">
                <img src={other.avatar_url ?? ""} alt={other.display_name ?? "them"} className="h-10 w-10 rounded-full object-cover" />
                <div className="text-[13px] text-white/60">{other.display_name ?? "them"}</div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white">{theirResponse ?? ""}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.7, ease: "easeInOut" }} className="mt-4 text-[11px] text-white/30">
              now go plan that date
            </motion.div>

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.9, ease: "easeInOut" }}
              onClick={() => {
                if (finishRef.current) return
                finishRef.current = true
                onClose()
              }}
              className="mt-5 rounded-full bg-white/90 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
            >
              continue to chat
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}

export function IgniteConfirmSheet({
  open,
  name,
  avatarUrl,
  onClose,
  onIgnite,
}: {
  open: boolean
  name: string
  avatarUrl: string | null
  onClose: () => void
  onIgnite: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[108] bg-black/65 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onClick={onClose}
          />
          <motion.div
            style={{ fontFamily: IGNITE_UI_FONT }}
            className="fixed inset-x-0 bottom-0 z-[109] mx-auto w-full max-w-[390px] overflow-hidden rounded-t-[28px] border border-white/[0.08] border-b-0 bg-[#0c0c0f]/98 px-6 pt-2 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl pb-[max(1.75rem,env(safe-area-inset-bottom))]"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/25 to-transparent"
              aria-hidden
            />
            <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-white/[0.14]" />

            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400/35 via-amber-500/10 to-transparent opacity-80 blur-md"
                  aria-hidden
                />
                <div className="relative rounded-full bg-gradient-to-br from-amber-300/50 to-amber-600/20 p-[2.5px] shadow-[0_0_0_1px_rgba(251,191,36,0.12)]">
                  <img
                    src={avatarUrl ?? ""}
                    alt={name}
                    className="h-[4.5rem] w-[4.5rem] rounded-full object-cover ring-2 ring-black/40"
                  />
                </div>
              </div>

              <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                Ignite a date
              </p>
              <h2 className="mt-2 text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-white">
                {name}
              </h2>
              <p className="mt-2 max-w-[260px] text-[13px] font-normal leading-relaxed text-white/50">
                Send a thoughtful invite. They&apos;ll need to accept before you plan together.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onIgnite}
                className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 text-[15px] font-semibold tracking-wide text-neutral-950 shadow-[0_8px_28px_rgba(251,191,36,0.22)] transition-[filter,transform] duration-200 hover:brightness-[1.03] active:scale-[0.99]"
              >
                Ignite the flame
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-12 w-full rounded-2xl border border-white/[0.12] bg-white/[0.03] text-[14px] font-medium tracking-wide text-white/55 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/75"
              >
                Not yet
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

