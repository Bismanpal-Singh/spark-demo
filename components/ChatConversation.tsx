"use client"

import { useState } from "react"
import { ArrowLeft, Flame, Send } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "me" | "them"
  timestamp: string
}

interface ChatConversationProps {
  chat: {
    id: string
    name: string
    photo: string
  }
  onBack: () => void
  pinnedSpark?: {
    myAnswer?: string | null
    theirAnswer?: string | null
  }
}

const mockMessages: Message[] = [
  {
    id: "1",
    text: "Hey! I saw you love hiking too. What's your favorite trail?",
    sender: "me",
    timestamp: "2:30 PM",
  },
  {
    id: "2",
    text: "Hi! Yes, I absolutely love it! I'd have to say Mount Tamalpais is my go-to. The views are incredible!",
    sender: "them",
    timestamp: "2:32 PM",
  },
  {
    id: "3",
    text: "No way, that's one of my favorites too! Have you done the Dipsea Trail?",
    sender: "me",
    timestamp: "2:33 PM",
  },
  {
    id: "4",
    text: "That sounds like so much fun! I'd love to try that trail sometime",
    sender: "them",
    timestamp: "2:35 PM",
  },
]

export function ChatConversation({
  chat,
  onBack,
  pinnedSpark,
}: ChatConversationProps) {
  const [messages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const [showMyAnswer, setShowMyAnswer] = useState(false)

  const handleSend = () => {
    if (newMessage.trim()) {
      // In a real app, this would send the message
      setNewMessage("")
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <img
                src={chat.photo}
                alt={chat.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold text-foreground">{chat.name}</h2>
                <p className="text-xs text-muted-foreground">Active now</p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600 active:scale-95">
            <Flame className="h-3.5 w-3.5" />
            Ignite
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          {pinnedSpark && (
            <div className="rounded-2xl border border-white/10 bg-card/70 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    Icebreaker
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">
                    <span className="text-muted-foreground">Them:</span>{" "}
                    {pinnedSpark.theirAnswer || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowMyAnswer((v) => !v)}
                  className="w-full rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted/30"
                >
                  {showMyAnswer ? "Hide your answer" : "Show your answer"}
                </button>

                {showMyAnswer && (
                  <div className="mt-2 rounded-xl bg-primary/10 p-3">
                    <div className="text-xs font-semibold text-primary">You</div>
                    <div className="mt-1 text-sm text-foreground/90">
                      {pinnedSpark.myAnswer || "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.sender === "me"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p
                  className={`mt-1 text-xs ${
                    message.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-full bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
