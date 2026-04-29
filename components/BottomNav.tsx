"use client"

import { Sparkles, Heart, MessageCircle, User } from "lucide-react"

export type TabType = "discover" | "matches" | "chat" | "profile"

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { id: TabType; label: string; icon: typeof Sparkles }[] = [
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "matches", label: "Matches", icon: Heart },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="z-[60] shrink-0 border-t border-white/10 bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-around px-3">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all ${
                isActive
                  ? "bg-white/8 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform ${isActive ? "scale-105" : ""}`}
                fill={isActive && tab.id === "discover" ? "currentColor" : "none"}
              />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? "text-foreground" : ""}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
