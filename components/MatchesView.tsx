"use client"

import { Flame, Sparkles } from "lucide-react"

interface Match {
  id: string
  name: string
  photo: string
  status: "pending" | "sparked"
  lastActivity?: string
}

const mockMatches: Match[] = [
  {
    id: "1",
    name: "Sarah",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    status: "sparked",
    lastActivity: "2h ago",
  },
  {
    id: "2",
    name: "Maya",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    status: "pending",
    lastActivity: "Waiting for spark...",
  },
]

export function MatchesView() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connections waiting to spark
          </p>
        </div>

        {/* Sparked Matches */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Sparked</h2>
          </div>
          <div className="space-y-3">
            {mockMatches
              .filter((m) => m.status === "sparked")
              .map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative">
                    <img
                      src={match.photo}
                      alt={match.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1">
                      <Flame className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{match.name}</h3>
                    <p className="text-sm text-muted-foreground">{match.lastActivity}</p>
                  </div>
                  <button className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
                    Chat
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Pending Sparks */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <h2 className="font-semibold text-foreground">Waiting to Spark</h2>
          </div>
          <div className="space-y-3">
            {mockMatches
              .filter((m) => m.status === "pending")
              .map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
                >
                  <div className="relative">
                    <img
                      src={match.photo}
                      alt={match.name}
                      className="h-16 w-16 rounded-full object-cover opacity-80 grayscale-[30%]"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{match.name}</h3>
                    <p className="text-sm text-muted-foreground">{match.lastActivity}</p>
                  </div>
                  <button className="rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                    Answer
                  </button>
                </div>
              ))}
          </div>
        </div>

        {mockMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Flame className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              Your sparks are coming
            </h3>
            <p className="text-sm text-muted-foreground">
              Keep swiping to find your connections
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
