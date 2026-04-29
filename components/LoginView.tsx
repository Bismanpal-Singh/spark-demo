"use client"

import { useState } from "react"
import { Flame } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { supabase } from "@/src/supabase"

export function LoginView({ onAuthed }: { onAuthed?: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      onAuthed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/40 px-4">
      <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

      <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Spark</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-sm font-medium text-foreground/90" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label className="text-sm font-medium text-foreground/90" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void signIn()
            }}
          />

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-foreground/90">
              {error}
            </div>
          )}

          <Button
            onClick={() => void signIn()}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full rounded-2xl py-3 font-semibold"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Demo accounts are seeded in Supabase. Login as either user to simulate both sides of a
            spark.
          </p>
        </div>
      </Card>
    </div>
  )
}

