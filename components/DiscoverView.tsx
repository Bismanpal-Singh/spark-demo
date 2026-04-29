"use client"

import { useState, useCallback } from "react"
import { ProfileCard } from "./ProfileCard"
import { mockProfiles } from "@/lib/mock-profiles"
import { Sparkles } from "lucide-react"

export function DiscoverView() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
  const [showMatch, setShowMatch] = useState(false)

  const currentProfile = mockProfiles[currentIndex]
  const nextProfile = mockProfiles[currentIndex + 1]

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      setExitDirection(direction)

      // Simulate a match on right swipe (for demo)
      if (direction === "right" && Math.random() > 0.5) {
        setTimeout(() => {
          setShowMatch(true)
          setTimeout(() => setShowMatch(false), 2500)
        }, 300)
      }

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % mockProfiles.length)
        setExitDirection(null)
      }, 300)
    },
    []
  )

  const handleSwipeLeft = useCallback(() => handleSwipe("left"), [handleSwipe])
  const handleSwipeRight = useCallback(() => handleSwipe("right"), [handleSwipe])

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      {/* Full screen card stack */}
      <div className="relative flex-1 overflow-hidden">
        {/* Background card (next profile) */}
        {nextProfile && (
          <ProfileCard
            key={nextProfile.id}
            profile={nextProfile}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
            isActive={false}
          />
        )}

        {/* Active card */}
        {currentProfile && (
          <div
            className={`absolute inset-0 ${
              exitDirection === "left"
                ? "animate-swipe-left"
                : exitDirection === "right"
                ? "animate-swipe-right"
                : ""
            }`}
          >
            <ProfileCard
              key={currentProfile.id}
              profile={currentProfile}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isActive={!exitDirection}
            />
          </div>
        )}

      </div>

      {/* Match Modal */}
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-md">
          <div className="animate-scale-up w-full max-w-sm rounded-3xl border border-white/15 bg-card/85 p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-fuchsia-400/25 to-rose-300/20">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
              {"It's a Match!"}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Your energy matched. Answer one spark question to unlock the full profile.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMatch(false)}
                className="flex-1 rounded-xl border border-border/70 bg-muted/50 py-3 text-sm font-medium text-foreground/90 transition-all hover:bg-muted"
              >
                Later
              </button>
              <button
                onClick={() => setShowMatch(false)}
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-400 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                Answer now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
