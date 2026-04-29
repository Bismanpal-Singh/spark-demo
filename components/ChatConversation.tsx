"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Flame, Send } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { supabase } from "@/src/supabase"

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, userId])

  const [newMessage, setNewMessage] = useState("")
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

            <div className="flex items-center gap-3">
              <img
                src={other.avatar_url ?? ""}
                alt={other.display_name ?? "Profile"}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold text-foreground">{other.display_name ?? "Unknown"}</h2>
                <p className="text-xs text-muted-foreground">
                  Chatting
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => void 0}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600 active:scale-95"
          >
            <Flame className="h-3.5 w-3.5" />
            Ignite
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          {pinned && (
            <div className="rounded-2xl border border-white/10 bg-card/70 p-3 shadow-sm backdrop-blur-sm">
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
    </div>
  )
}

