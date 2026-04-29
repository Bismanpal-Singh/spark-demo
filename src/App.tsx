import { useState } from "react"
import { BottomNav, type TabType } from "@/components/BottomNav"
import { DiscoverView } from "@/components/DiscoverView"
import { MatchesView } from "@/components/MatchesView"
import { ChatView } from "@/components/ChatView"
import { ProfileView } from "@/components/ProfileView"

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("discover")

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-stretch lg:gap-8 lg:px-6 lg:py-6">
        <aside className="hidden flex-1 rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur lg:block">
          <h1 className="text-3xl font-bold tracking-tight">Spark</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Mobile-first dating experience, now with a cleaner desktop shell.
          </p>
        </aside>

        <main className="relative min-h-dvh w-full overflow-hidden bg-background lg:min-h-0 lg:flex-1 lg:rounded-3xl lg:border lg:border-border lg:shadow-xl">
          <div className="h-full overflow-hidden">
            {activeTab === "discover" && <DiscoverView />}
            {activeTab === "matches" && <MatchesView />}
            {activeTab === "chat" && <ChatView />}
            {activeTab === "profile" && <ProfileView />}
          </div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  )
}
