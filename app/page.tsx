"use client"

import { useState } from "react"
import { BottomNav, type TabType } from "@/components/BottomNav"
import { DiscoverView } from "@/components/DiscoverView"
import { MatchesView } from "@/components/MatchesView"
import { ChatView } from "@/components/ChatView"
import { ProfileView } from "@/components/ProfileView"

export default function SparkApp() {
  const [activeTab, setActiveTab] = useState<TabType>("discover")

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/50">
      {/* Mobile app container */}
      <div className="relative h-dvh w-full max-w-md overflow-hidden bg-background shadow-2xl md:h-[850px] md:rounded-[2.5rem] md:border md:border-border">
        {/* Content based on active tab */}
        <div className="h-full overflow-hidden">
          {activeTab === "discover" && <DiscoverView />}
          {activeTab === "matches" && <MatchesView />}
          {activeTab === "chat" && <ChatView />}
          {activeTab === "profile" && <ProfileView />}
        </div>

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}
