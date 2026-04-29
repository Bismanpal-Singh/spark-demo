"use client"

import { Camera, Edit3, MapPin, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const currentUser = {
  name: "Alex",
  age: 28,
  bio: "Software engineer who loves hiking, photography, and finding the best coffee spots in the city. Looking for genuine connections and meaningful conversations.",
  city: "San Francisco",
  interests: ["Hiking", "Photography", "Coffee", "Tech", "Travel", "Music"],
  photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
}

export function ProfileView() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
          <button className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-card shadow-lg">
          {/* Photo */}
          <div className="relative aspect-[4/5]">
            <img
              src={currentUser.photo}
              alt={currentUser.name}
              className="h-full w-full object-cover"
            />
            <button className="absolute bottom-4 right-4 rounded-full bg-card/90 p-3 shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:scale-105">
              <Camera className="h-5 w-5 text-foreground" />
            </button>
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Name overlay */}
            <div className="absolute bottom-4 left-4 text-white">
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                <span className="text-xl font-light opacity-80">{currentUser.age}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 opacity-80">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{currentUser.city}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">About me</h3>
            <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {currentUser.bio}
          </p>
        </div>

        {/* Interests Section */}
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Interests</h3>
            <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser.interests.map((interest) => (
              <Badge
                key={interest}
                variant="secondary"
                className="rounded-full bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/20"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Preview Profile Button */}
        <div className="mt-6">
          <button className="w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
            Preview Your Profile
          </button>
        </div>
      </div>
    </div>
  )
}
