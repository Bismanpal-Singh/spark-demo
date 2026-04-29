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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-scale-up mx-4 rounded-3xl bg-card p-8 text-center shadow-2xl">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              {"It's a Match!"}
            </h2>
            <p className="mb-6 text-muted-foreground">
              Answer the spark question to unlock their profile
            </p>
            <button
              onClick={() => setShowMatch(false)}
              className="w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Answer Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
