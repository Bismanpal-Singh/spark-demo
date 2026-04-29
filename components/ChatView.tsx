"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Sparkles } from "lucide-react"
import { ChatConversation } from "./ChatConversation"

interface ChatPreview {
  id: string
  name: string
  photo: string
  lastMessage: string
  time: string
  unread: boolean
}

const mockChats: ChatPreview[] = [
  {
    id: "1",
    name: "Sarah",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    lastMessage: "That sounds like so much fun! I'd love to try that trail sometime",
    time: "2h ago",
    unread: true,
  },
  {
    id: "2",
    name: "Jessica",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    lastMessage: "Haha that's hilarious! We should definitely do that",
    time: "5h ago",
    unread: false,
  },
  {
    id: "3",
    name: "Maya",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop",
    lastMessage: "I'll send you the address tomorrow!",
    time: "1d ago",
    unread: false,
  },
]

export function ChatView({ viewer }: { viewer: "a" | "b" }) {
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
  const [pinnedSpark, setPinnedSpark] = useState<{
    myAnswer?: string | null
    theirAnswer?: string | null
  } | null>(null)

  useEffect(() => {
    const loadPinnedSpark = async () => {
      try {
        const res = await fetch(`/api/me/matches?viewer=${viewer}`)
        if (!res.ok) return
        const json = (await res.json()) as {
          sparked: Array<{
            name: string
            myAnswer?: string | null
            theirAnswer?: string | null
          }>
        }
        const sparked = json.sparked?.[0]
        if (!sparked) return
        setPinnedSpark({
          myAnswer: sparked.myAnswer ?? null,
          theirAnswer: sparked.theirAnswer ?? null,
        })
      } catch {
        // Keep it non-blocking for demo.
      }
    }

    void loadPinnedSpark()
  }, [viewer])

  if (selectedChat) {
    return (
      <ChatConversation
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
        pinnedSpark={pinnedSpark ?? undefined}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto h-full w-full max-w-lg overflow-y-auto px-4 pb-6 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue the conversation
          </p>
        </div>

        {/* Chat list */}
        <div className="space-y-2">
          {mockChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left shadow-sm transition-all hover:shadow-md"
            >
              <div className="relative">
                <img
                  src={chat.photo}
                  alt={chat.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
                {chat.unread && (
                  <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold text-foreground ${chat.unread ? "font-bold" : ""}`}>
                    {chat.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${chat.unread ? "text-foreground" : "text-muted-foreground"}`}>
                  {chat.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>

        {mockChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No messages yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Spark a connection to start chatting
            </p>
          </div>
        )}

        {/* Spark prompt */}
        {mockChats.length > 0 && (
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/20 p-2.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Ignite the flame!
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When the conversation is flowing, tap &quot;Ignite the Flame&quot; to suggest a date.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
