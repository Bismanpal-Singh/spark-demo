export type TaskProfile = {
  id: string
  displayName: string
  city: string | null
  interests: string[]
}

export type TaskTemplate = {
  key: string
  text: string
}

const UNIVERSAL_TASKS: TaskTemplate[] = [
  {
    key: "universal_pitch",
    text: "in exactly 10 words, describe your ideal first date. then each of you propose one real place and one exact time to make it happen.",
  },
  {
    key: "universal_trade",
    text: "recommend one song, place, or food to each other with one line on why it fits them. then say whether you'll actually try it.",
  },
]

const CITY_TASKS: TaskTemplate[] = [
  {
    key: "city_hidden_gem",
    text: "share one hidden gem from your city that tourists never find. choose one as the first stop for your date.",
  },
]

const INTEREST_TASKS: TaskTemplate[] = [
  {
    key: "interest_ranking",
    text: "you both share an interest. each list top 3 within it, then pick one item to turn into your first date plan.",
  },
]

function stableHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickStable<T>(items: T[], seed: string): T {
  const index = stableHash(seed) % items.length
  return items[index]
}

export function selectTask(userA: TaskProfile, userB: TaskProfile, matchId: string): TaskTemplate {
  const sharedInterests = userA.interests.filter((i) => userB.interests.includes(i))
  const sameCity = Boolean(userA.city && userB.city && userA.city === userB.city)

  if (sharedInterests.length > 0) {
    return pickStable(INTEREST_TASKS, `${matchId}:interest:${sharedInterests[0]}`)
  }

  if (sameCity) {
    return pickStable(CITY_TASKS, `${matchId}:city:${userA.city ?? "na"}`)
  }

  return pickStable(UNIVERSAL_TASKS, `${matchId}:universal`)
}

export function getTaskByKey(taskKey: string): TaskTemplate | null {
  const all = [...UNIVERSAL_TASKS, ...CITY_TASKS, ...INTEREST_TASKS]
  return all.find((t) => t.key === taskKey) ?? null
}

