"use client"

import { useEffect, useState } from "react"
import { Camera, Edit3, MapPin, Settings, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/src/supabase"
import { TAGLINE_MAX_CHARS } from "@/lib/profileVisibility"

type UserProfile = {
  id: string
  display_name: string | null
  age: number | null
  tagline: string | null
  bio: string | null
  avatar_url: string | null
  city: string | null
  preferences?: string[] | null
}

const interestFallback = (bio: string | null) => {
  if (!bio) return []
  const lower = bio.toLowerCase()
  const tokens = [
    "hiking",
    "coffee",
    "music",
    "travel",
    "photography",
    "cooking",
    "running",
    "art",
    "yoga",
  ]
  return tokens.filter((t) => lower.includes(t)).slice(0, 6)
}

export function ProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [taglineEdit, setTaglineEdit] = useState("")
  const [bioEdit, setBioEdit] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: qErr } = await supabase
          .from("users")
          .select("id,display_name,age,tagline,bio,avatar_url,city,preferences")
          .eq("id", userId)
          .single()
        if (qErr) throw qErr

        const row = data as UserProfile
        setProfile(row)
        setTaglineEdit(row.tagline ?? "")
        setBioEdit(row.bio ?? "")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [userId])

  const interests =
    (profile?.preferences ?? []).filter(Boolean).length > 0
      ? (profile?.preferences ?? []).filter(Boolean)
      : interestFallback(profile?.bio ?? profile?.tagline ?? null)

  const saveAbout = async () => {
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    try {
      const tagline =
        taglineEdit.trim().slice(0, TAGLINE_MAX_CHARS) || null
      const bio = bioEdit.trim() || null
      const { error: uErr } = await supabase
        .from("users")
        .update({ tagline, bio })
        .eq("id", userId)
      if (uErr) throw uErr
      setProfile({ ...profile, tagline, bio })
      setTaglineEdit(tagline ?? "")
      setBioEdit(bio ?? "")
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-9 w-9 rounded-full"
              onClick={async () => {
                await supabase.auth.signOut()
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl bg-card p-6 shadow-sm">
            <div className="h-12 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-96 w-full animate-pulse rounded bg-muted/80" />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-foreground/90">
            {error}
          </div>
        )}

        {profile && (
          <>
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-card shadow-lg">
              <div className="relative aspect-[4/5]">
                <img
                  src={profile.avatar_url ?? ""}
                  alt={profile.display_name ?? "Profile"}
                  className="h-full w-full object-cover"
                />

                <button className="absolute bottom-4 right-4 rounded-full bg-card/90 p-3 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-105">
                  <Camera className="h-5 w-5 text-foreground" />
                </button>

                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

                <div className="absolute bottom-4 left-4 text-white">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold">{profile.display_name ?? "—"}</h2>
                    <span className="text-xl font-light opacity-80">
                      {profile.age !== null ? profile.age : ""}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 opacity-80">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{profile.city ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">About me</h3>
              </div>

              <label className="block text-xs font-medium text-muted-foreground">
                Tagline <span className="font-normal">(Discovery preview — before you match)</span>
              </label>
              <textarea
                value={taglineEdit}
                onChange={(e) =>
                  setTaglineEdit(e.target.value.slice(0, TAGLINE_MAX_CHARS))
                }
                maxLength={TAGLINE_MAX_CHARS}
                placeholder="One short line people see before unlock…"
                rows={2}
                className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {taglineEdit.length}/{TAGLINE_MAX_CHARS}
              </p>

              <label className="mt-4 block text-xs font-medium text-muted-foreground">
                Full bio <span className="font-normal">(After spark unlock)</span>
              </label>
              <textarea
                value={bioEdit}
                onChange={(e) => setBioEdit(e.target.value)}
                placeholder="Your longer story…"
                rows={6}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {saveError && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{saveError}</p>
              )}
              <Button
                type="button"
                className="mt-3 w-full"
                disabled={saving}
                onClick={() => void saveAbout()}
              >
                {saving ? "Saving…" : "Save about me"}
              </Button>
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Interests</h3>
                <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="rounded-full bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/20"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add interests in Supabase (or update bio to include keywords).</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

