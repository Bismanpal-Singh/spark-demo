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
    <nav className="z-[60] shrink-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon
                className="h-5 w-5"
                fill={isActive && tab.id === "discover" ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-medium">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
