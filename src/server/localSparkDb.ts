import fs from "node:fs"
import path from "node:path"

export type MatchStatus =
  | "waiting_for_their_match"
  | "waiting_for_my_spark"
  | "sparked"

export type LocalMatch = {
  id: string
  name: string
  photo: string
  status: MatchStatus
  lastActivity?: string
}

type SparkDb = {
  matches: LocalMatch[]
}

const dbPath = path.resolve(process.cwd(), "data", "spark-db.json")

const defaultDb: SparkDb = {
  matches: [
    {
      id: "m1",
      name: "Sarah",
      photo:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
      status: "waiting_for_their_match",
      lastActivity: "You liked them 2h ago",
    },
    {
      id: "m2",
      name: "Maya",
      photo:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
      status: "waiting_for_my_spark",
      lastActivity: "Matched - waiting for your spark reply",
    },
    {
      id: "m3",
      name: "Jessica",
      photo:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop",
      status: "sparked",
      lastActivity: "Spark complete",
    },
  ],
}

function readDbSync(): SparkDb {
  try {
    const raw = fs.readFileSync(dbPath, "utf8")
    return JSON.parse(raw) as SparkDb
  } catch {
    // If the file doesn't exist or is invalid, fall back to defaults.
    return defaultDb
  }
}

function writeDbSync(db: SparkDb) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8")
}

export function resetDb() {
  writeDbSync(defaultDb)
}

export function getMatchesByStatus() {
  const db = readDbSync()

  return {
    waiting_for_their_match: db.matches.filter(
      (m) => m.status === "waiting_for_their_match",
    ),
    waiting_for_my_spark: db.matches.filter((m) => m.status === "waiting_for_my_spark"),
    sparked: db.matches.filter((m) => m.status === "sparked"),
  }
}

export function replySpark(matchId: string) {
  const db = readDbSync()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match) return { ok: false as const, error: "not_found" as const }

  // Only allow replying when the user is the one who hasn't replied yet.
  if (match.status !== "waiting_for_my_spark") {
    return {
      ok: false as const,
      error: "invalid_status" as const,
    }
  }

  match.status = "sparked"
  match.lastActivity = "Spark complete"
  writeDbSync(db)
  return { ok: true as const }
}

