import { useState } from "react"
import { BottomNav, type TabType } from "@/components/BottomNav"
import { DiscoverView } from "@/components/DiscoverView"
import { MatchesView } from "@/components/MatchesView"
import { ChatView } from "@/components/ChatView"
import { ProfileView } from "@/components/ProfileView"

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("discover")
  const [viewer, setViewer] = useState<"a" | "b">("a")

  return (
    <div className="h-dvh overflow-hidden bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto flex h-full w-full max-w-6xl items-stretch overflow-hidden lg:gap-8 lg:px-6 lg:py-6">
        <aside className="hidden flex-1 rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Spark</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Mobile-first dating experience, now with a cleaner desktop shell.
          </p>

          <div className="mt-6 rounded-2xl border border-border/50 bg-background/40 p-4">
            <div className="text-sm font-semibold text-foreground">Simulate account</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setViewer("a")}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  viewer === "a"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                Account A
              </button>
              <button
                onClick={() => setViewer("b")}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  viewer === "b"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                Account B
              </button>
            </div>

            <button
              onClick={async () => {
                await fetch("/api/me/reset", { method: "POST" })
                // No need to refetch everything here; each tab refetches on mount.
              }}
              className="mt-3 w-full rounded-xl bg-muted/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              Reset spark state
            </button>
          </div>
        </aside>

        <main className="relative flex h-full w-full flex-col overflow-hidden bg-background lg:flex-1 lg:rounded-3xl lg:border lg:border-border lg:shadow-xl">
          <div className="pointer-events-auto absolute left-3 top-3 z-30 lg:hidden">
            <div className="flex gap-2 rounded-2xl border border-border/70 bg-card/80 p-1 backdrop-blur">
              <button
                onClick={() => setViewer("a")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  viewer === "a"
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                A
              </button>
              <button
                onClick={() => setViewer("b")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  viewer === "b"
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                B
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab === "discover" && <DiscoverView />}
            {activeTab === "matches" && (
              <MatchesView
                viewer={viewer}
                onGoToChat={() => setActiveTab("chat")}
              />
            )}
            {activeTab === "chat" && <ChatView viewer={viewer} />}
            {activeTab === "profile" && <ProfileView viewer={viewer} />}
          </div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  )
}
