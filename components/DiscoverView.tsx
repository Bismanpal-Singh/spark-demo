"use client"

import { useEffect, useMemo, useState } from "react"
import { ProfileCard, type DiscoverProfile } from "./ProfileCard"
import { supabase } from "@/src/supabase"

type MatchStatus = "pending" | "sparked" | "dating"

type MatchRow = {
  id: string
  user_a: string
  user_b: string
  status: MatchStatus
}

type SparkAnswerRow = {
  match_id: string
  user_id: string
}

type UserRow = {
  id: string
  display_name: string | null
  age: number | null
  city: string | null
  bio: string | null
  avatar_url: string | null
  // Optional columns (if present in DB migration).
  gallery_urls?: string[] | null
  preferences?: string[] | null
  looking_for?: string | null
  fun_fact?: string | null
}

function truncate(text: string, max = 96) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}...`
}

function toDiscoverProfile(u: UserRow, unlocked: boolean): DiscoverProfile {
  const fullBio = u.bio ?? "No bio yet."
  const prefs = (u.preferences ?? []).filter(Boolean)
  const previewInterests = prefs.slice(0, 3)
  const allInterests = prefs.length > 0 ? prefs : ["Conversation", "Coffee", "Travel"]
  const avatar = u.avatar_url ?? ""
  const gallery = (u.gallery_urls ?? []).filter(Boolean)

  return {
    id: u.id,
    name: u.display_name ?? "Unknown",
    age: u.age ?? 0,
    city: u.city ?? "Unknown",
    photos: [avatar, ...gallery].filter(Boolean),
    previewBio: truncate(fullBio, 95),
    previewInterests,
    fullBio,
    allInterests,
    lookingFor: u.looking_for ?? "Genuine connection",
    funFact: u.fun_fact ?? "",
    unlocked,
  }
}

export function DiscoverView({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Try richer fields first (if schema extended).
        let usersData: UserRow[] | null = null
        const rich = await supabase
          .from("users")
          .select("id,display_name,age,city,bio,avatar_url,gallery_urls,preferences,looking_for,fun_fact")
          .neq("id", userId)

        if (rich.error) {
          // Fallback for minimal schema.
          const basic = await supabase
            .from("users")
            .select("id,display_name,age,city,bio,avatar_url")
            .neq("id", userId)
          if (basic.error) throw basic.error
          usersData = (basic.data ?? []) as UserRow[]
        } else {
          usersData = (rich.data ?? []) as UserRow[]
        }

        const { data: matches } = await supabase
          .from("matches")
          .select("id,user_a,user_b,status")
          .or(`user_a.eq.${userId},user_b.eq.${userId}`)

        const matchRows = (matches ?? []) as MatchRow[]
        const matchIds = matchRows.map((m) => m.id)

        const { data: answers } =
          matchIds.length > 0
            ? await supabase
                .from("spark_answers")
                .select("match_id,user_id")
                .in("match_id", matchIds)
            : { data: [] as SparkAnswerRow[] }

        const answersByMatch = new Map<string, Set<string>>()
        ;((answers ?? []) as SparkAnswerRow[]).forEach((a) => {
          const set = answersByMatch.get(a.match_id) ?? new Set<string>()
          set.add(a.user_id)
          answersByMatch.set(a.match_id, set)
        })

        const unlockedByOtherUser = new Map<string, boolean>()
        for (const m of matchRows) {
          const otherId = m.user_a === userId ? m.user_b : m.user_a
          const answered = answersByMatch.get(m.id) ?? new Set<string>()
          const bothAnswered = answered.has(m.user_a) && answered.has(m.user_b)
          const unlocked = bothAnswered || m.status === "sparked" || m.status === "dating"
          unlockedByOtherUser.set(otherId, unlocked)
        }

        const computed = usersData.map((u) =>
          toDiscoverProfile(u, Boolean(unlockedByOtherUser.get(u.id))),
        )
        setProfiles(computed)
      } catch {
        setProfiles([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [userId])

  const currentProfile = useMemo(() => profiles[currentIndex], [profiles, currentIndex])
  const nextProfile = useMemo(() => profiles[currentIndex + 1], [profiles, currentIndex])

  const handleSwipe = (direction: "left" | "right") => {
    setExitDirection(direction)
    window.setTimeout(() => {
      setCurrentIndex((prev) => (profiles.length > 0 ? (prev + 1) % profiles.length : 0))
      setExitDirection(null)
    }, 300)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-primary/25" />
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="flex h-full items-center justify-center bg-background px-6 text-center text-muted-foreground">
        No profiles to discover yet.
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="relative flex-1 overflow-hidden">
        {nextProfile && (
          <ProfileCard
            key={nextProfile.id}
            profile={nextProfile}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
            isActive={false}
          />
        )}

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
            onSwipeLeft={() => handleSwipe("left")}
            onSwipeRight={() => handleSwipe("right")}
            isActive={!exitDirection}
          />
        </div>
      </div>
    </div>
  )
}

