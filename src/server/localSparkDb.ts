import fs from "node:fs"
import path from "node:path"
import { getTodaysQuestion } from "../../lib/questions"

export type MatchStatus =
  | "waiting_for_their_match"
  | "waiting_for_my_spark"
  | "sparked"

export type Viewer = "a" | "b"

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
      // Both answers start empty so Account A and Account B can "reply" separately.
      theirAnswer: null,
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

  // Only seed answers for already-sparked demo matches.
  const myAnswer = input.myAnswer ?? (status === "sparked" ? "My spark answer (demo)" : null)

  const theirAnswer =
    input.theirAnswer ?? (status === "sparked" ? "Their spark answer (demo)" : null)

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

function getViewerAnswers(match: LocalMatch, viewer: Viewer) {
  if (viewer === "a") {
    return {
      myAnswer: match.myAnswer ?? null,
      theirAnswer: match.theirAnswer ?? null,
    }
  }

  return {
    myAnswer: match.theirAnswer ?? null,
    theirAnswer: match.myAnswer ?? null,
  }
}

export function getMatchesByStatus(viewer: Viewer = "a") {
  const db = readDbSync()

  const waiting_for_their_match: LocalMatch[] = []
  const waiting_for_my_spark: LocalMatch[] = []
  const sparked: LocalMatch[] = []

  for (const m of db.matches) {
    const sparkQuestion = m.sparkQuestion ?? null
    const { myAnswer, theirAnswer } = getViewerAnswers(m, viewer)

    // Pre-spark matches (only one photo shown, no spark data yet).
    const isSparkMatch = Boolean(sparkQuestion) || myAnswer !== null || theirAnswer !== null

    if (!isSparkMatch) {
      // For demo: keep pre-spark category the same for both viewers.
      waiting_for_their_match.push(m)
      continue
    }

    if (myAnswer === null) {
      waiting_for_my_spark.push({
        ...m,
        status: "waiting_for_my_spark",
        myAnswer,
        theirAnswer,
        lastActivity: "Matched - waiting for your spark reply",
      })
      continue
    }

    if (theirAnswer === null) {
      waiting_for_their_match.push({
        ...m,
        status: "waiting_for_their_match",
        myAnswer,
        theirAnswer,
        lastActivity: "Matched - waiting for their spark reply",
      })
      continue
    }

    sparked.push({
      ...m,
      status: "sparked",
      myAnswer,
      theirAnswer,
      lastActivity: "Spark complete",
    })
  }

  return { waiting_for_their_match, waiting_for_my_spark, sparked }
}

export function getSparkQuestionForMatch(matchId: string, viewer: Viewer = "a") {
  const db = readDbSync()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match) return { ok: false as const, error: "not_found" as const }

  const { myAnswer, theirAnswer } = getViewerAnswers(match, viewer)
  if (myAnswer !== null) {
    return { ok: false as const, error: "invalid_status" as const }
  }

  const question = match.sparkQuestion ?? getTodaysQuestion()
  return {
    ok: true as const,
    question,
    maxChars: SPARK_MAX_CHARS,
    minChars: SPARK_MIN_CHARS,
    myAnswer,
    theirAnswer,
  }
}

export function replySpark(
  matchId: string,
  viewer: Viewer,
  answer: string,
) {
  const db = readDbSync()
  const match = db.matches.find((m) => m.id === matchId)
  if (!match) return { ok: false as const, error: "not_found" as const }

  const { myAnswer } = getViewerAnswers(match, viewer)
  // Only allow replying when the viewer hasn't replied yet.
  if (myAnswer !== null) return { ok: false as const, error: "invalid_status" as const }

  const trimmed = answer.trim()
  if (trimmed.length < SPARK_MIN_CHARS) {
    return { ok: false as const, error: "too_short" as const }
  }
  if (trimmed.length > SPARK_MAX_CHARS) {
    return { ok: false as const, error: "too_long" as const }
  }

  if (viewer === "a") match.myAnswer = trimmed
  else match.theirAnswer = trimmed

  const { myAnswer: afterMy, theirAnswer: afterTheir } = getViewerAnswers(match, viewer)

  match.status = afterMy && afterTheir ? "sparked" : match.status
  match.lastActivity =
    match.myAnswer && match.theirAnswer ? "Spark complete" : "Matched - waiting for their spark reply"

  writeDbSync(db)
  return { ok: true as const }
}

