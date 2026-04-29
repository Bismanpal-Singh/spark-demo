import { useEffect, useState } from "react"
import { BottomNav, type TabType } from "@/components/BottomNav"
import { DiscoverView } from "@/components/DiscoverView"
import { MatchesViewFlow } from "@/components/MatchesViewFlow"
import { ChatView } from "@/components/ChatView"
import { ProfileView } from "@/components/ProfileView"
import { LoginView } from "@/components/LoginView"
import { supabase } from "@/src/supabase"

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("discover")
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [chatMatchId, setChatMatchId] = useState<string | null>(null)
  const [discoverRefreshNonce, setDiscoverRefreshNonce] = useState(0)
  const [controlError, setControlError] = useState<string | null>(null)
  const [resettingDiscover, setResettingDiscover] = useState(false)

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      setAuthLoading(true)
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUserId(data.user?.id ?? null)
      setAuthLoading(false)
    }

    void bootstrap()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`spark_answers:status:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "spark_answers",
        },
        async (payload) => {
          const row = payload.new as { match_id?: string }
          const matchId = row?.match_id
          if (!matchId) return

          try {
            const { data: matchRow } = await supabase
              .from("matches")
              .select("id,user_a,user_b,status")
              .eq("id", matchId)
              .maybeSingle()

            if (!matchRow) return
            const { user_a, user_b, status } = matchRow as {
              user_a: string
              user_b: string
              status: string
            }

            // Only participants update match status.
            if (userId !== user_a && userId !== user_b) return

            const { data: answers } = await supabase
              .from("spark_answers")
              .select("user_id")
              .eq("match_id", matchId)

            const answered = new Set((answers ?? []).map((a) => (a as any).user_id))
            const bothAnswered = answered.has(user_a) && answered.has(user_b)

            if (!bothAnswered) return
            if (status === "sparked" || status === "dating") return

            await supabase.from("matches").update({ status: "sparked" }).eq("id", matchId)
          } catch {
            // Non-blocking.
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  if (authLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-primary/20" />
      </div>
    )
  }

  if (!userId) {
    return <LoginView />
  }

  const resetDiscover = async () => {
    setControlError(null)
    setResettingDiscover(true)
    try {
      const { error } = await supabase
        .from("likes")
        .delete()
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      if (error) throw error
      setDiscoverRefreshNonce((n) => n + 1)
      if (activeTab !== "discover") setActiveTab("discover")
    } catch (e) {
      setControlError(e instanceof Error ? e.message : "Reset failed")
    } finally {
      setResettingDiscover(false)
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto flex h-full w-full max-w-6xl items-stretch overflow-hidden lg:gap-8 lg:px-6 lg:py-6">
        <aside className="hidden flex-1 rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Spark</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Mutual icebreakers, then real conversation.
          </p>

          <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Control panel
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void resetDiscover()}
                disabled={resettingDiscover}
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resettingDiscover ? "Resetting Discover..." : "Reset Discover"}
              </button>
              <p className="text-xs text-muted-foreground">
                Shows all profiles again by clearing your swipe history.
              </p>
              {controlError && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-foreground/90">
                  {controlError}
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="relative flex h-full w-full flex-col overflow-hidden bg-background lg:flex-1 lg:rounded-3xl lg:border lg:border-border lg:shadow-xl">
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab === "discover" && (
              <DiscoverView userId={userId} refreshNonce={discoverRefreshNonce} />
            )}
            {activeTab === "matches" && (
              <MatchesViewFlow
                userId={userId}
                onGoToChat={(matchId) => {
                  setChatMatchId(matchId)
                  setActiveTab("chat")
                }}
              />
            )}
            {activeTab === "chat" && <ChatView userId={userId} initialMatchId={chatMatchId} />}
            {activeTab === "profile" && <ProfileView userId={userId} />}
          </div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  )
}

