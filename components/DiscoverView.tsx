"use client"

import { useEffect, useMemo, useState } from "react"
import { ProfileCard } from "./ProfileCard"
import { supabase } from "@/src/supabase"
import {
  answersByMatchFromRows,
  isOtherProfileUnlocked,
  toDiscoverProfile,
  type DiscoverProfile,
  type RichUserRow,
} from "@/lib/profileVisibility"

type MatchStatus = "pending" | "sparked" | "dating"
type LikeStatus = "pending" | "mutual"

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

type LikeRow = {
  from_user_id: string
  to_user_id: string
  status: LikeStatus
}

type UserRow = RichUserRow

function DiscoverBrandHeader() {
  return (
    <div className="pointer-events-none px-5 pb-2.5 pt-4">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-full max-w-[78px] bg-gradient-to-r from-transparent to-white/14" />
          <h1 className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-[22px] font-semibold leading-none tracking-[0.01em] text-transparent drop-shadow-[0_8px_20px_rgba(255,255,255,0.1)]">
            Ditto
          </h1>
          <span className="h-px w-full max-w-[78px] bg-gradient-to-l from-transparent to-white/14" />
        </div>
      </div>
    </div>
  )
}

export function DiscoverView({
  userId,
  refreshNonce = 0,
}: {
  userId: string
  refreshNonce?: number
}) {
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      let usersData: UserRow[] | null = null
      const rich = await supabase
        .from("users")
        .select("id,display_name,age,city,bio,avatar_url,gallery_urls,preferences,looking_for,fun_fact")
        .neq("id", userId)

      if (rich.error) {
        const basic = await supabase
          .from("users")
          .select("id,display_name,age,city,bio,avatar_url")
          .neq("id", userId)
        if (basic.error) throw basic.error
        usersData = (basic.data ?? []) as UserRow[]
      } else {
        usersData = (rich.data ?? []) as UserRow[]
      }

      const { data: likes } = await supabase
        .from("likes")
        .select("from_user_id,to_user_id,status")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

      const likeRows = (likes ?? []) as LikeRow[]
      const outgoingLiked = new Set<string>()
      for (const l of likeRows) {
        if (l.from_user_id === userId) outgoingLiked.add(l.to_user_id)
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

      const answersByMatch = answersByMatchFromRows((answers ?? []) as SparkAnswerRow[])

      // Keep discover as "potential people": hide users you've already liked.
      const candidates = usersData.filter((u) => !outgoingLiked.has(u.id))
      const computed = candidates.map((u) =>
        toDiscoverProfile(
          u,
          isOtherProfileUnlocked(userId, u.id, matchRows, answersByMatch),
        ),
      )
      setProfiles(computed)
      setCurrentIndex(0)
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshNonce])

  const currentProfile = useMemo(() => profiles[currentIndex], [profiles, currentIndex])
  const nextProfile = useMemo(() => profiles[currentIndex + 1], [profiles, currentIndex])

  const handleSwipe = async (direction: "left" | "right") => {
    setExitDirection(direction)
    const profile = currentProfile

    if (direction === "right" && profile) {
      // 1) Check if they already liked me (pending) -> mutual.
      const { data: reciprocal } = await supabase
        .from("likes")
        .select("from_user_id,to_user_id,status")
        .eq("from_user_id", profile.id)
        .eq("to_user_id", userId)
        .maybeSingle()

      const isMutual = reciprocal?.status === "pending" || reciprocal?.status === "mutual"
      const nextStatus: LikeStatus = isMutual ? "mutual" : "pending"

      // 2) Insert/update my like.
      await supabase
        .from("likes")
        .upsert(
          {
            from_user_id: userId,
            to_user_id: profile.id,
            status: nextStatus,
          },
          { onConflict: "from_user_id,to_user_id" },
        )

      // 3) If mutual, make opposite row mutual + ensure match exists.
      if (isMutual) {
        await supabase
          .from("likes")
          .upsert(
            {
              from_user_id: profile.id,
              to_user_id: userId,
              status: "mutual",
            },
            { onConflict: "from_user_id,to_user_id" },
          )

        const { data: existingMatch } = await supabase
          .from("matches")
          .select("id")
          .or(
            `and(user_a.eq.${userId},user_b.eq.${profile.id}),and(user_a.eq.${profile.id},user_b.eq.${userId})`,
          )
          .maybeSingle()

        if (!existingMatch) {
          await supabase.from("matches").insert({
            user_a: userId,
            user_b: profile.id,
            status: "pending",
          })
        }
      }
    }

    window.setTimeout(() => {
      setCurrentIndex((prev) => (profiles.length > 0 ? (prev + 1) % profiles.length : 0))
      setExitDirection(null)
    }, 300)
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-background">
        <DiscoverBrandHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-full bg-primary/25" />
        </div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="flex h-full flex-col bg-background">
        <DiscoverBrandHeader />
        <div className="flex flex-1 items-center justify-center px-6 text-center text-muted-foreground">
          No new profiles right now.
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <DiscoverBrandHeader />
      <div className="relative flex-1 overflow-hidden px-2 pb-2">
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
            onSwipeLeft={() => void handleSwipe("left")}
            onSwipeRight={() => void handleSwipe("right")}
            isActive={!exitDirection}
          />
        </div>
      </div>
    </div>
  )
}

