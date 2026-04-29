import fs from "node:fs"
import path from "node:path"
import { getTodaysQuestion } from "../../lib/questions"

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
  sparkQuestion?: string | null
  myAnswer?: string | null
  theirAnswer?: string | null
}

type SparkDb = {
  matches: LocalMatch[]
}

const dbPath = path.resolve(process.cwd(), "data", "spark-db.json")

export const SPARK_MIN_CHARS = 5
export const SPARK_MAX_CHARS = 180

const defaultDb: SparkDb = {
  matches: [
    {
      id: "m1",
      name: "Sarah",
      photo:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
      status: "waiting_for_their_match",
      lastActivity: "You liked them 2h ago",
      sparkQuestion: null,
      myAnswer: null,
      theirAnswer: null,
    },
    {
      id: "m2",
      name: "Maya",
      photo:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
      status: "waiting_for_my_spark",
      lastActivity: "Matched - waiting for your spark reply",
      sparkQuestion: getTodaysQuestion(),
      myAnswer: null,
      // For demo: pre-fill their answer so we only need the user's input to unlock.
      theirAnswer: "Their spark answer (demo)",
    },
    {
      id: "m3",
      name: "Jessica",
      photo:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop",
      status: "sparked",
      lastActivity: "Spark complete",
      sparkQuestion: getTodaysQuestion(),
      myAnswer: "My spark answer (demo)",
      theirAnswer: "Their spark answer (demo)",
    },
  ],
}

function normalizeMatch(input: LocalMatch): LocalMatch {
  const q = getTodaysQuestion()
  const status = input.status

  const sparkQuestion =
    input.sparkQuestion ??
    (status === "waiting_for_my_spark" || status === "sparked" ? q : null)

  const myAnswer =
    input.myAnswer ??
    (status === "sparked" ? "My spark answer (demo)" : null)

  const theirAnswer =
    input.theirAnswer ??
    (status === "sparked" || status === "waiting_for_my_spark"
      ? "Their spark answer (demo)"
      : null)

  return {
    ...input,
    sparkQuestion,
    myAnswer,
    theirAnswer,
  }
}

function readDbSync(): SparkDb {
  try {
    const raw = fs.readFileSync(dbPath, "utf8")
    const db = JSON.parse(raw) as SparkDb
    // Handle schema evolution for demo purposes.
    return {
      matches: (db.matches || []).map((m) => normalizeMatch(m)),
    }
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

export function getSparkQuestionForMatch(matchId: string) {
  const db = readDbSync()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match) return { ok: false as const, error: "not_found" as const }

  if (match.status !== "waiting_for_my_spark" && match.status !== "sparked") {
    return { ok: false as const, error: "invalid_status" as const }
  }

  const question = match.sparkQuestion ?? getTodaysQuestion()
  return {
    ok: true as const,
    question,
    maxChars: SPARK_MAX_CHARS,
    minChars: SPARK_MIN_CHARS,
    myAnswer: match.myAnswer ?? null,
    theirAnswer: match.theirAnswer ?? null,
  }
}

export function replySpark(matchId: string, answer: string) {
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

  const trimmed = answer.trim()
  if (trimmed.length < SPARK_MIN_CHARS) {
    return { ok: false as const, error: "too_short" as const }
  }
  if (trimmed.length > SPARK_MAX_CHARS) {
    return { ok: false as const, error: "too_long" as const }
  }

  match.myAnswer = trimmed
  // For demo: if we somehow don't have their answer yet, seed it.
  if (!match.theirAnswer) match.theirAnswer = "Their spark answer (demo)"

  match.status = "sparked"
  match.lastActivity = "Spark complete"
  writeDbSync(db)
  return { ok: true as const }
}

