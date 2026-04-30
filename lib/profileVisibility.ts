/** Discover swipe card model (locked vs full profile). */
export type DiscoverProfile = {
  id: string
  name: string
  age: number
  city: string
  photos: string[]
  previewBio: string
  previewInterests: string[]
  fullBio: string
  allInterests: string[]
  lookingFor: string
  funFact: string
  unlocked: boolean
  /** When locked: extra photos not shown on the card hero. */
  lockedExtraPhotoCount?: number
}

/** Max chars of bio shown on Discover cards when profile is locked. */
export const DISCOVER_PREVIEW_BIO_MAX = 95

/** Max chars of bio in incoming-like preview (slightly longer for the sheet). */
export const INCOMING_PREVIEW_BIO_MAX = 120

/** Tagline is authored at this max length so locked UI never truncates it. */
export const TAGLINE_MAX_CHARS = 100

/** Tags shown when locked (Discover + incoming preview). */
export const LOCKED_TAG_PREVIEW_COUNT = 3

export type MatchLite = {
  id: string
  user_a: string
  user_b: string
  status: "pending" | "sparked" | "dating"
}

/** Row shape from `public.users` for profile visibility. */
export type RichUserRow = {
  id: string
  display_name: string | null
  age?: number | null
  city?: string | null
  /** Short line shown before unlock (Discover, incoming like). */
  tagline?: string | null
  bio?: string | null
  avatar_url: string | null
  gallery_urls?: string[] | null
  preferences?: string[] | null
  looking_for?: string | null
  fun_fact?: string | null
}

const DEFAULT_INTERESTS = ["Conversation", "Coffee", "Travel"] as const

export function truncateBio(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Locked previews: dedicated tagline (no truncation), else legacy truncated bio. */
export function lockedPreviewBio(
  user: RichUserRow,
  variant: "discover" | "incoming" = "discover",
): string {
  const tag = user.tagline?.trim()
  if (tag) return tag.slice(0, TAGLINE_MAX_CHARS)
  const emptyLabel = variant === "incoming" ? "No bio added yet." : "No bio yet."
  const fullBio = user.bio?.trim() ? user.bio.trim() : emptyLabel
  const max = variant === "incoming" ? INCOMING_PREVIEW_BIO_MAX : DISCOVER_PREVIEW_BIO_MAX
  return truncateBio(fullBio, max)
}

/**
 * Full profile for this pair is visible only after a match exists and both
 * users have answered the spark (or match already advanced to sparked/dating).
 */
export function isOtherProfileUnlocked(
  viewerId: string,
  otherUserId: string,
  matches: MatchLite[],
  answersByMatchId: Map<string, Set<string>>,
): boolean {
  const pair = matches.find(
    (m) =>
      (m.user_a === viewerId && m.user_b === otherUserId) ||
      (m.user_a === otherUserId && m.user_b === viewerId),
  )
  if (!pair) return false
  const answered = answersByMatchId.get(pair.id) ?? new Set<string>()
  const bothAnswered = answered.has(pair.user_a) && answered.has(pair.user_b)
  return bothAnswered || pair.status === "sparked" || pair.status === "dating"
}

export function answersByMatchFromRows(
  rows: Array<{ match_id: string; user_id: string }>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = map.get(r.match_id) ?? new Set<string>()
    set.add(r.user_id)
    map.set(r.match_id, set)
  }
  return map
}

/** Discover stack: one source of truth for locked vs unlocked presentation. */
export function toDiscoverProfile(user: RichUserRow, unlocked: boolean): DiscoverProfile {
  const fullBio = user.bio?.trim() ? user.bio.trim() : "No bio yet."
  const prefs = (user.preferences ?? []).filter(Boolean)
  const previewInterests =
    prefs.length > 0 ? prefs.slice(0, LOCKED_TAG_PREVIEW_COUNT) : [...DEFAULT_INTERESTS]
  const allInterests = prefs.length > 0 ? prefs : [...DEFAULT_INTERESTS]
  const avatar = user.avatar_url ?? ""
  const gallery = (user.gallery_urls ?? []).filter(Boolean)
  const photos = [avatar, ...gallery].filter(Boolean)

  return {
    id: user.id,
    name: user.display_name ?? "Unknown",
    age: user.age ?? 0,
    city: user.city ?? "Unknown",
    photos,
    previewBio: lockedPreviewBio(user, "discover"),
    previewInterests,
    fullBio,
    allInterests,
    lookingFor: user.looking_for?.trim() || "Genuine connection",
    funFact: user.fun_fact?.trim() ?? "",
    unlocked,
    lockedExtraPhotoCount: unlocked ? 0 : Math.max(0, photos.length - 1),
  }
}

/**
 * Incoming like: always treat as locked preview (no mutual spark yet).
 * Hero image uses avatar only when possible so extra gallery photos stay hidden.
 */
export function incomingLikeLockedPreview(user: RichUserRow) {
  const prefs = (user.preferences ?? []).filter(Boolean)
  const gallery = (user.gallery_urls ?? []).filter(Boolean)
  const avatar = user.avatar_url?.trim() ?? ""
  const heroUrl = avatar || gallery[0] || ""
  const hiddenPhotoCount = avatar ? gallery.length : Math.max(0, gallery.length - 1)
  const previewTags =
    prefs.length > 0 ? prefs.slice(0, LOCKED_TAG_PREVIEW_COUNT) : [...DEFAULT_INTERESTS].slice(0, LOCKED_TAG_PREVIEW_COUNT)
  const hiddenTagCount = prefs.length > 0 ? Math.max(0, prefs.length - LOCKED_TAG_PREVIEW_COUNT) : 0

  return {
    heroUrl,
    previewBio: lockedPreviewBio(user, "incoming"),
    previewTags,
    hiddenTagCount,
    hiddenPhotoCount,
  }
}
