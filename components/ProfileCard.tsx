"use client"

import { useRef, useCallback } from "react"
import { MapPin, Lock, Heart, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { DiscoverProfile } from "@/lib/profileVisibility"

export type { DiscoverProfile }

interface ProfileCardProps {
  profile: DiscoverProfile
  onSwipeLeft: () => void
  onSwipeRight: () => void
  isActive: boolean
}

export function ProfileCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
  isActive,
}: ProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
  })

  const updateCardTransform = useCallback((offsetX: number, offsetY: number) => {
    if (!cardRef.current) return
    const rotation = offsetX / 25
    cardRef.current.style.transform = `translate3d(${offsetX}px, ${offsetY * 0.2}px, 0) rotate(${rotation}deg)`
  }, [])

  const updateIndicators = useCallback((offsetX: number) => {
    if (!cardRef.current) return
    const intensity = Math.min(Math.abs(offsetX) / 100, 1)
    const isLike = offsetX > 15
    const isNope = offsetX < -15
    
    const likeIndicator = cardRef.current.querySelector("[data-like]") as HTMLElement
    const nopeIndicator = cardRef.current.querySelector("[data-nope]") as HTMLElement
    const likeBorder = cardRef.current.querySelector("[data-like-border]") as HTMLElement
    const nopeBorder = cardRef.current.querySelector("[data-nope-border]") as HTMLElement
    
    if (likeIndicator) likeIndicator.style.opacity = isLike ? String(intensity) : "0"
    if (nopeIndicator) nopeIndicator.style.opacity = isNope ? String(intensity) : "0"
    if (likeBorder) likeBorder.style.opacity = isLike ? String(intensity * 0.7) : "0"
    if (nopeBorder) nopeBorder.style.opacity = isNope ? String(intensity * 0.7) : "0"
  }, [])

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!isActive) return
    dragState.current.startX = clientX
    dragState.current.startY = clientY
    dragState.current.isDragging = true
    if (cardRef.current) {
      cardRef.current.style.transition = "none"
    }
  }, [isActive])

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.current.isDragging || !isActive) return
    const offsetX = clientX - dragState.current.startX
    const offsetY = clientY - dragState.current.startY
    dragState.current.offsetX = offsetX
    dragState.current.offsetY = offsetY
    updateCardTransform(offsetX, offsetY)
    updateIndicators(offsetX)
  }, [isActive, updateCardTransform, updateIndicators])

  const handleDragEnd = useCallback(() => {
    if (!isActive || !cardRef.current) return
    dragState.current.isDragging = false
    
    const threshold = 70
    const offsetX = dragState.current.offsetX
    
    if (offsetX > threshold) {
      onSwipeRight()
    } else if (offsetX < -threshold) {
      onSwipeLeft()
    } else {
      cardRef.current.style.transition = "transform 0.2s ease-out"
      cardRef.current.style.transform = "translate3d(0, 0, 0) rotate(0deg)"
      updateIndicators(0)
    }
    
    dragState.current.offsetX = 0
    dragState.current.offsetY = 0
  }, [isActive, onSwipeLeft, onSwipeRight, updateIndicators])

  const handleMouseLeave = useCallback(() => {
    if (dragState.current.isDragging) {
      handleDragEnd()
    }
  }, [handleDragEnd])

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 touch-none select-none ${
        isActive ? "z-10 cursor-grab active:cursor-grabbing" : "z-0 pointer-events-none"
      }`}
      style={{
        transform: isActive ? "translate3d(0, 0, 0)" : "translate3d(0, 8px, 0) scale(0.96)",
        opacity: isActive ? 1 : 0.6,
        transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
      }}
      onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY) }}
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleMouseLeave}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleDragEnd}
    >
      <div className="relative h-full w-full overflow-hidden bg-foreground">
        {/* Photo - using img for better aspect ratio handling */}
        <img
          src={profile.photos[0]}
          alt={profile.name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Like border glow */}
        <div
          data-like-border
          className="pointer-events-none absolute inset-0 border-2 border-emerald-300/80 shadow-[inset_0_0_60px_rgba(16,185,129,0.28)]"
          style={{ opacity: 0 }}
        />

        {/* Nope border glow */}
        <div
          data-nope-border
          className="pointer-events-none absolute inset-0 border-2 border-rose-300/80 shadow-[inset_0_0_60px_rgba(244,63,94,0.24)]"
          style={{ opacity: 0 }}
        />

        {/* Like indicator */}
        <div
          data-like
          className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-400/20 px-4 py-2 shadow-[0_8px_30px_rgba(16,185,129,0.25)] backdrop-blur-md">
            <Heart className="h-4 w-4 text-emerald-100" fill="currentColor" />
            <span className="text-xs font-semibold tracking-[0.18em] text-emerald-50">LIKE</span>
          </div>
        </div>

        {/* Nope indicator */}
        <div
          data-nope
          className="pointer-events-none absolute left-1/2 top-12 z-20 -translate-x-1/2"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center gap-2 rounded-full border border-rose-200/70 bg-rose-400/20 px-4 py-2 shadow-[0_8px_30px_rgba(244,63,94,0.22)] backdrop-blur-md">
            <X className="h-4 w-4 text-rose-100" />
            <span className="text-xs font-semibold tracking-[0.18em] text-rose-50">NOPE</span>
          </div>
        </div>

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4 pb-4 text-white">
          {/* Name and Age */}
          <div className="mb-1 flex items-baseline gap-2">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <span className="text-lg font-light text-white/80">{profile.age}</span>
          </div>

          {/* Location */}
          <div className="mb-2 flex items-center gap-1.5 text-white/70">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">{profile.city}</span>
          </div>

          {!profile.unlocked ? (
            <>
              {/* Preview bio */}
              <p className="mb-2.5 text-sm leading-relaxed text-white/90">
                {profile.previewBio}
              </p>

              {/* Preview interests */}
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {profile.previewInterests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="bg-white/15 px-2 py-0.5 text-xs text-white"
                  >
                    {interest}
                  </Badge>
                ))}
                {profile.allInterests.length > profile.previewInterests.length && (
                  <Badge
                    variant="secondary"
                    className="bg-white/10 px-2 py-0.5 text-xs text-white/50"
                  >
                    <Lock className="mr-1 h-3 w-3" />
                    +{profile.allInterests.length - profile.previewInterests.length}
                  </Badge>
                )}
                {(profile.lockedExtraPhotoCount ?? 0) > 0 && (
                  <Badge variant="secondary" className="bg-white/10 px-2 py-0.5 text-xs text-white/50">
                    <Lock className="mr-1 h-3 w-3" />+{profile.lockedExtraPhotoCount} photos
                  </Badge>
                )}
              </div>

              {/* Locked hint */}
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-white/50" />
                <span className="text-xs text-white/50">Spark to see full profile</span>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm leading-relaxed text-white/95">{profile.fullBio}</p>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {profile.allInterests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="bg-emerald-300/20 px-2 py-0.5 text-xs text-emerald-50"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>

              {profile.lookingFor && (
                <p className="mb-1 text-xs text-white/70">
                  <span className="font-semibold text-white/90">Looking for:</span> {profile.lookingFor}
                </p>
              )}
              {profile.funFact && (
                <p className="text-xs text-white/70">
                  <span className="font-semibold text-white/90">Fun fact:</span> {profile.funFact}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
